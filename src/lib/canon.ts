// Canon Registry — fonte de verdade cross-pipeline para entidades do jogo.
//
// Cada projeto ganha um `canon.json` em APPDATA/projects/<id>/canon.json
// contendo a lista única de personagens, inimigos, itens, biomas, facções,
// quests, etc. Os planners (F0–F6, Story Writers) leem o canon antes de
// propor novos itens → evita duplicação, garante coesão e economiza tokens.
//
// Fluxo:
//   1) Story writers (worldbuilder, npc_writer, ...) produzem documentos
//      com bloco YAML frontmatter `canon_entries` → `ingestCanonFromDoc()`
//      faz upsert automático ao aprovar.
//   2) Asset runners (F0, F1, ...) chamam `linkAsset(slug, assetId, kind)`
//      após ingerir no KB → canon passa a referenciar os concept/sprites
//      aprovados, permitindo o dashboard "Art Coverage".
//   3) Planners chamam `listSummary()` para gerar o bloco "CANON ATUAL"
//      injetado no prompt — proíbe slugs já aprovados.

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./utils";

export type CanonKind =
  | "character"
  | "npc"
  | "enemy"
  | "boss"
  | "creature"
  | "item"
  | "weapon"
  | "armor"
  | "consumable"
  | "material"
  | "biome"
  | "location"
  | "faction"
  | "quest"
  | "dialogue"
  | "recipe"
  | "poi"
  | "lore";

export type CanonStatus = "draft" | "approved" | "retired";

export interface CanonEntry {
  id: string;
  slug: string;
  kind: CanonKind;
  name: string;
  aliases: string[];
  act?: 1 | 2 | 3;
  status: CanonStatus;
  description: string;
  tags: string[];
  conceptAssetIds: string[]; // F0
  spriteAssetIds: string[]; // F1/F2/F3/F4
  sheetAssetIds: string[]; // F7 packed sheets (path ou id)
  godotTresPaths: string[]; // F8 .tres
  sourceDocs: { phase: number; docId: string }[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Canon {
  projectId: string;
  version: number;
  entries: CanonEntry[];
  updatedAt: string;
}

const CANON_FILENAME = "canon.json";

function now(): string {
  return new Date().toISOString();
}

// ULID-ish: timestamp + random, ordenável.
function ulid(): string {
  const t = Date.now().toString(36).padStart(9, "0");
  const r = Math.random().toString(36).slice(2, 10).padStart(8, "0");
  return (t + r).toUpperCase();
}

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

// ---------- IO ----------

async function readCanonRaw(projectId: string): Promise<Canon | null> {
  if (!isTauri()) return null;
  try {
    const raw = await invoke<string>("read_project_file", {
      projectId,
      relative: CANON_FILENAME,
    });
    const parsed = JSON.parse(raw) as Canon;
    if (!parsed.entries || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCanon(canon: Canon): Promise<void> {
  if (!isTauri()) return;
  await invoke("create_project_dir", { projectId: canon.projectId });
  canon.updatedAt = now();
  await invoke("write_project_file", {
    args: {
      project_id: canon.projectId,
      relative: CANON_FILENAME,
      content: JSON.stringify(canon, null, 2),
    },
  });
  try {
    window.dispatchEvent(
      new CustomEvent("canon-updated", { detail: { projectId: canon.projectId } })
    );
  } catch {
    /* noop */
  }
}

export async function loadCanon(projectId: string): Promise<Canon> {
  const existing = await readCanonRaw(projectId);
  if (existing) return existing;
  return {
    projectId,
    version: 1,
    entries: [],
    updatedAt: now(),
  };
}

// ---------- Queries ----------

export async function listByKind(
  projectId: string,
  kind: CanonKind
): Promise<CanonEntry[]> {
  const canon = await loadCanon(projectId);
  return canon.entries.filter((e) => e.kind === kind);
}

export async function findBySlug(
  projectId: string,
  slug: string
): Promise<CanonEntry | null> {
  const canon = await loadCanon(projectId);
  return canon.entries.find((e) => e.slug === slug) ?? null;
}

/**
 * Similaridade lexical simples (Jaccard sobre tokens). Para uso no hook de
 * upsert quando não temos embeddings (evita dependência circular com kb.ts).
 * Retorna candidatos com score >= threshold ordenados por score desc.
 */
export async function findSimilar(
  projectId: string,
  name: string,
  threshold = 0.6
): Promise<Array<{ entry: CanonEntry; score: number }>> {
  const canon = await loadCanon(projectId);
  const norm = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2)
    );
  const q = norm(name);
  if (q.size === 0) return [];
  const out: Array<{ entry: CanonEntry; score: number }> = [];
  for (const e of canon.entries) {
    const pool = norm(`${e.name} ${e.aliases.join(" ")} ${e.slug}`);
    let inter = 0;
    for (const t of q) if (pool.has(t)) inter++;
    const union = q.size + pool.size - inter;
    const score = union === 0 ? 0 : inter / union;
    if (score >= threshold) out.push({ entry: e, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// ---------- Upsert ----------

export interface CanonUpsertInput {
  slug?: string;
  kind: CanonKind;
  name: string;
  aliases?: string[];
  act?: 1 | 2 | 3;
  status?: CanonStatus;
  description?: string;
  tags?: string[];
  sourceDoc?: { phase: number; docId: string };
  metadata?: Record<string, unknown>;
}

export async function upsertBySlug(
  projectId: string,
  input: CanonUpsertInput
): Promise<CanonEntry> {
  const canon = await loadCanon(projectId);
  const slug = slugify(input.slug ?? input.name);
  if (!slug) throw new Error("canon: slug/name vazio");

  const idx = canon.entries.findIndex((e) => e.slug === slug);
  if (idx >= 0) {
    const prev = canon.entries[idx];
    const next: CanonEntry = {
      ...prev,
      kind: input.kind ?? prev.kind,
      name: input.name || prev.name,
      aliases: mergeStringArrays(prev.aliases, input.aliases ?? []),
      act: input.act ?? prev.act,
      status: input.status ?? prev.status,
      description: input.description || prev.description,
      tags: mergeStringArrays(prev.tags, input.tags ?? []),
      sourceDocs: input.sourceDoc
        ? mergeSourceDocs(prev.sourceDocs, input.sourceDoc)
        : prev.sourceDocs,
      metadata: { ...prev.metadata, ...(input.metadata ?? {}) },
      updatedAt: now(),
    };
    canon.entries[idx] = next;
    await writeCanon(canon);
    return next;
  }

  const entry: CanonEntry = {
    id: ulid(),
    slug,
    kind: input.kind,
    name: input.name,
    aliases: input.aliases ?? [],
    act: input.act,
    status: input.status ?? "draft",
    description: input.description ?? "",
    tags: input.tags ?? [],
    conceptAssetIds: [],
    spriteAssetIds: [],
    sheetAssetIds: [],
    godotTresPaths: [],
    sourceDocs: input.sourceDoc ? [input.sourceDoc] : [],
    metadata: input.metadata ?? {},
    createdAt: now(),
    updatedAt: now(),
  };
  canon.entries.push(entry);
  await writeCanon(canon);
  return entry;
}

function mergeStringArrays(a: string[], b: string[]): string[] {
  const set = new Set([...(a ?? []), ...(b ?? [])].filter(Boolean));
  return Array.from(set);
}

function mergeSourceDocs(
  a: { phase: number; docId: string }[],
  b: { phase: number; docId: string }
): { phase: number; docId: string }[] {
  const exists = a.some((x) => x.phase === b.phase && x.docId === b.docId);
  return exists ? a : [...a, b];
}

// ---------- Asset linking ----------

export type LinkAssetKind = "concept" | "sprite" | "sheet" | "tres";

export async function linkAsset(
  projectId: string,
  slug: string,
  assetIdOrPath: string,
  linkKind: LinkAssetKind
): Promise<void> {
  if (!slug || !assetIdOrPath) return;
  const canon = await loadCanon(projectId);
  const idx = canon.entries.findIndex((e) => e.slug === slug);
  if (idx < 0) return; // entry não existe — não cria implicitamente
  const e = canon.entries[idx];
  const field: keyof CanonEntry =
    linkKind === "concept"
      ? "conceptAssetIds"
      : linkKind === "sprite"
        ? "spriteAssetIds"
        : linkKind === "sheet"
          ? "sheetAssetIds"
          : "godotTresPaths";
  const arr = (e[field] as string[]) ?? [];
  if (!arr.includes(assetIdOrPath)) {
    canon.entries[idx] = {
      ...e,
      [field]: [...arr, assetIdOrPath],
      updatedAt: now(),
    } as CanonEntry;
    await writeCanon(canon);
  }
}

/**
 * Tenta linkar um asset a uma entry do canon. Primeiro pelo slug explícito
 * (via metadata.canon_slug ou metadata.character_name), depois por nome
 * no prompt (busca por slug normalizado). Silencioso se nada bater.
 */
export async function tryLinkAssetFromMetadata(
  projectId: string,
  assetIdOrPath: string,
  linkKind: LinkAssetKind,
  hints: {
    slug?: string;
    name?: string;
    prompt?: string;
    characterName?: string;
  }
): Promise<string | null> {
  const candidate =
    hints.slug ||
    hints.characterName ||
    hints.name ||
    "";
  if (candidate) {
    const normalized = slugify(candidate);
    const entry = await findBySlug(projectId, normalized);
    if (entry) {
      await linkAsset(projectId, entry.slug, assetIdOrPath, linkKind);
      return entry.slug;
    }
  }
  // Fallback: se prompt/name contém exato um slug do canon, linka.
  if (hints.prompt) {
    const canon = await loadCanon(projectId);
    const words = new Set(
      hints.prompt
        .toLowerCase()
        .split(/\s+/)
        .map((w) => slugify(w))
        .filter(Boolean)
    );
    for (const e of canon.entries) {
      if (words.has(e.slug)) {
        await linkAsset(projectId, e.slug, assetIdOrPath, linkKind);
        return e.slug;
      }
    }
  }
  return null;
}

// ---------- Prompt helpers ----------

/**
 * Retorna bloco markdown pronto para injetar no user message dos planners
 * de asset. Lista slugs aprovados agrupados por kind, avisando que são
 * proibidos re-propor.
 */
export async function buildCanonPromptBlock(projectId: string): Promise<string> {
  const canon = await loadCanon(projectId);
  if (canon.entries.length === 0) {
    return `### CANON ATUAL\n(canon vazio — você pode propor livremente)\n`;
  }
  const approved = canon.entries.filter((e) => e.status !== "retired");
  const byKind = new Map<CanonKind, CanonEntry[]>();
  for (const e of approved) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind)!.push(e);
  }
  const lines: string[] = [
    "### CANON ATUAL (fonte de verdade — NÃO DUPLICAR)",
    "",
  ];
  const order: CanonKind[] = [
    "character",
    "npc",
    "enemy",
    "boss",
    "creature",
    "weapon",
    "armor",
    "item",
    "consumable",
    "material",
    "biome",
    "location",
    "faction",
    "quest",
    "poi",
    "recipe",
    "dialogue",
    "lore",
  ];
  for (const k of order) {
    const list = byKind.get(k);
    if (!list || list.length === 0) continue;
    const pairs = list
      .slice(0, 50)
      .map((e) => {
        const act = e.act ? ` [A${e.act}]` : "";
        return `${e.slug}${act}`;
      })
      .join(", ");
    const suffix = list.length > 50 ? ` (+${list.length - 50})` : "";
    lines.push(`- **${k}** (${list.length}): ${pairs}${suffix}`);
  }
  lines.push("");
  lines.push("REGRAS:");
  lines.push(
    "1. NUNCA proponha slugs listados acima. Se precisarem de variações, use sufixos claros (ex.: aren_varen_coroado)."
  );
  lines.push(
    "2. Proponha APENAS adições novas ou variantes justificadas pelo contexto."
  );
  lines.push(
    "3. Se detectar conflito/duplicata latente, PARE e sinalize em `rationale`."
  );
  return lines.join("\n");
}

export async function listSummary(projectId: string): Promise<
  Array<{ slug: string; kind: CanonKind; name: string; status: CanonStatus; act?: 1 | 2 | 3 }>
> {
  const canon = await loadCanon(projectId);
  return canon.entries.map((e) => ({
    slug: e.slug,
    kind: e.kind,
    name: e.name,
    status: e.status,
    act: e.act,
  }));
}

// ---------- YAML frontmatter parser ----------

/**
 * Extrai bloco YAML de `canon_entries` ao final do documento aprovado e
 * faz upsert em canon. Formato esperado:
 *
 *   ---
 *   canon_entries:
 *     - slug: "aren_varen"
 *       kind: "character"
 *       name: "Aren Varen"
 *       act: 1
 *       aliases: ["Aren"]
 *       tags: ["protagonist"]
 *       description: "Nobre que..."
 *   ---
 *
 * Parser minimalista (não usa lib YAML pra manter bundle leve). Aceita
 * tanto o bloco delimitado por `---` quanto um bloco ```yaml ... ```
 * sinalizado como `canon_entries:`.
 */
export async function ingestCanonFromDoc(
  projectId: string,
  doc: { id: string; phase: number; content: string }
): Promise<number> {
  const entries = parseCanonEntriesFromText(doc.content);
  if (entries.length === 0) return 0;
  let added = 0;
  for (const e of entries) {
    try {
      await upsertBySlug(projectId, {
        ...e,
        sourceDoc: { phase: doc.phase, docId: doc.id },
      });
      added++;
    } catch (err) {
      console.warn("[canon] upsert falhou:", e, err);
    }
  }
  return added;
}

export function parseCanonEntriesFromText(text: string): CanonUpsertInput[] {
  // Tenta (a) bloco YAML delimitado por --- ... --- contendo canon_entries,
  // ou (b) bloco ```yaml ... ``` com canon_entries, ou (c) JSON blob
  // `canon_entries: [...]` solto.
  const blocks = extractYamlBlocks(text);
  const results: CanonUpsertInput[] = [];
  for (const block of blocks) {
    if (!block.includes("canon_entries")) continue;
    const parsed = parseCanonEntriesYaml(block);
    for (const p of parsed) {
      if (!p.name && !p.slug) continue;
      results.push(p);
    }
  }
  // Dedup local (mesma slug em múltiplos blocos).
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = slugify(r.slug ?? r.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractYamlBlocks(text: string): string[] {
  const blocks: string[] = [];
  // Fences ```yaml ... ```.
  const fence = /```ya?ml\s*\n([\s\S]*?)\n```/gi;
  let m;
  while ((m = fence.exec(text))) blocks.push(m[1]);
  // Frontmatter-like `---\n...\n---` (mas só se contém canon_entries).
  const fm = /(?:^|\n)---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/g;
  while ((m = fm.exec(text))) blocks.push(m[1]);
  // Bloco solto com chave canon_entries: e lista (- slug:).
  const solo = /canon_entries\s*:\s*\n((?:\s*-\s+[\s\S]*?)(?=\n\w|\n---|\n```|$))/g;
  while ((m = solo.exec(text))) blocks.push(`canon_entries:\n${m[1]}`);
  return blocks;
}

/** Parser YAML minimalista específico p/ `canon_entries: [ -slug/kind/... ]`. */
function parseCanonEntriesYaml(block: string): CanonUpsertInput[] {
  const out: CanonUpsertInput[] = [];
  const lines = block.split(/\r?\n/);
  let inList = false;
  let current: Record<string, unknown> | null = null;
  const flush = () => {
    if (!current) return;
    const slug =
      typeof current.slug === "string" ? (current.slug as string) : undefined;
    const kind =
      typeof current.kind === "string"
        ? (current.kind as CanonKind)
        : ("character" as CanonKind);
    const name =
      typeof current.name === "string"
        ? (current.name as string)
        : slug
          ? slug.replace(/_/g, " ")
          : "";
    if (!slug && !name) {
      current = null;
      return;
    }
    const act =
      current.act === 1 || current.act === 2 || current.act === 3
        ? (current.act as 1 | 2 | 3)
        : undefined;
    const aliases = toStringArray(current.aliases);
    const tags = toStringArray(current.tags);
    const description =
      typeof current.description === "string"
        ? (current.description as string)
        : "";
    out.push({
      slug,
      kind,
      name,
      act,
      aliases,
      tags,
      description,
      status: "approved",
    });
    current = null;
  };
  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!inList) {
      if (/^\s*canon_entries\s*:/.test(line)) {
        inList = true;
      }
      continue;
    }
    // Item start: "- key: value"
    const startMatch = line.match(/^(\s*)-\s+([^:]+?):\s*(.*)$/);
    if (startMatch) {
      flush();
      current = {};
      const [, , key, value] = startMatch;
      current[key.trim()] = parseScalar(value);
      continue;
    }
    // Continuation "  key: value"
    if (current) {
      const kv = line.match(/^(\s+)([a-zA-Z_][\w]*)\s*:\s*(.*)$/);
      if (kv) {
        const [, , key, value] = kv;
        current[key.trim()] = parseScalar(value);
        continue;
      }
      // Indented list item inside aliases/tags: "    - value"
      const inner = line.match(/^\s+-\s+(.+)$/);
      if (inner) {
        // Heurística: aplica ao último key que era array? Simplifica: ignorar.
        // YAML real cobriria isso; manteremos inline `[a, b]` como preferido.
        continue;
      }
    }
  }
  flush();
  return out;
}

function parseScalar(raw: string): unknown {
  const v = raw.trim();
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  // Inline array: [a, b, c] ou ["a","b"]
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(/\s*,\s*/)
      .map((t) => t.replace(/^['"]|['"]$/g, "").trim())
      .filter(Boolean);
  }
  // Strings quoted.
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}
