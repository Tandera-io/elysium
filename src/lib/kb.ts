// Knowledge Base semântico local com fallback lexical.
//
// - Modo preferido: embeddings via @huggingface/transformers
//   (Xenova/all-MiniLM-L6-v2, 384 dims) → cosine similarity.
// - Fallback: se o ONNX Runtime falhar em carregar (bug conhecido de
//   blob URL dinâmico no WebView2 em algumas versões), o KB degrada pra
//   scoring lexical tokenizado (interseção + TF-ish). O ingest NUNCA
//   bloqueia — persiste o chunk de qualquer jeito. O search sempre
//   retorna resultados. A coerência cross-phase principal NÃO depende
//   do KB: o runner injeta os docs aprovados anteriores na íntegra via
//   "CÂNONE DO PROJETO" no system prompt.
// - Índice em memória por projeto, persistido em `kb.json` dentro do
//   diretório do projeto em %AppData%.
// - Metadata duplicada em SQLite (tabela kb_entries) para consultas e joins.

import { invoke } from "@tauri-apps/api/core";
import { kbRepo, uid } from "./db";
import { sha256, isTauri } from "./utils";
import type { AgentType, KbEntry } from "@/types/domain";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

export interface PersistedEntry {
  id: string;
  // Vazio quando o embedder estiver indisponível (modo lexical).
  vector: number[];
  content: string;
  phase?: number;
  agent?: string;
  documentType: string;
  sourceDocumentId?: string;
  // Concept arts / sprites aprovados também entram no KB. Para esses,
  // guardamos referência ao asset e ao path absoluto (usado pelo Grafo
  // Semântico para renderizar thumbnail com convertFileSrc).
  sourceAssetId?: string;
  assetPath?: string;
  createdAt: string;
}

export interface PersistedIndexView {
  projectId: string;
  entries: PersistedEntry[];
}

interface PersistedIndex {
  version: number;
  projectId: string;
  entries: PersistedEntry[];
}

const indexCache = new Map<string, PersistedIndex>();
let embedderPromise: Promise<any> | null = null;
let embedderFailed = false;
let embedderFailReason: string | null = null;

async function getEmbedder(): Promise<any | null> {
  if (embedderFailed) return null;
  if (!embedderPromise) {
    embedderPromise = (async () => {
      try {
        const t = await import("@huggingface/transformers");
        const env = t.env as any;

        env.allowLocalModels = false;
        env.useBrowserCache = true;

        // Tauri WebView2 bloqueia `import()` dinâmico em blob URLs
        // (erro: "Failed to fetch dynamically imported module: blob:...").
        // Desligamos worker proxy e single-thread pra evitar.
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.proxy = false;
          env.backends.onnx.wasm.numThreads = 1;
        }

        const { pipeline } = t;
        return await pipeline("feature-extraction", MODEL_NAME, {
          dtype: "q8",
        });
      } catch (e: any) {
        embedderFailed = true;
        embedderFailReason = String(e?.message ?? e);
        console.warn(
          `[kb] Embedder indisponível, usando fallback lexical: ${embedderFailReason}`
        );
        return null;
      }
    })();
  }
  return embedderPromise;
}

export function kbBackendStatus(): {
  mode: "semantic" | "lexical";
  reason: string | null;
} {
  return {
    mode: embedderFailed ? "lexical" : "semantic",
    reason: embedderFailReason,
  };
}

export async function embed(text: string): Promise<number[] | null> {
  const embedder = await getEmbedder();
  if (!embedder) return null;
  try {
    const out = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array);
  } catch (e: any) {
    embedderFailed = true;
    embedderFailReason = String(e?.message ?? e);
    console.warn(
      `[kb] Inferência de embedding falhou, caindo pra lexical: ${embedderFailReason}`
    );
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ---------- Tokenização / scoring lexical (fallback) ----------

const STOPWORDS = new Set([
  "a","o","e","de","da","do","das","dos","em","para","com","no","na","nos","nas",
  "um","uma","uns","umas","por","que","se","os","as","é","são","ser","foi","ao",
  "aos","como","mais","mas","ou","the","of","and","to","in","a","is","for","on",
  "with","as","by","an","this","that","at","from","be","or",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9áéíóúâêôãõç]+/i)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function lexicalScore(queryTokens: string[], docText: string): number {
  if (queryTokens.length === 0) return 0;
  const docLower = docText.toLowerCase();
  let hits = 0;
  let weight = 0;
  for (const t of queryTokens) {
    const count = docLower.split(t).length - 1;
    if (count > 0) {
      hits++;
      weight += 1 + Math.log(1 + count);
    }
  }
  const coverage = hits / queryTokens.length;
  return coverage * weight;
}

async function projectRoot(projectId: string): Promise<string> {
  // Garante `<AppData>/projects/<projectId>/` criado, retorna o path.
  return await invoke<string>("create_project_dir", { projectId });
}

async function loadIndex(projectId: string): Promise<PersistedIndex> {
  if (indexCache.has(projectId)) return indexCache.get(projectId)!;
  const empty: PersistedIndex = {
    version: 1,
    projectId,
    entries: [],
  };
  if (!isTauri()) {
    indexCache.set(projectId, empty);
    return empty;
  }

  // Usa o comando Rust `read_project_file` em vez do plugin fs: dispensa
  // configuração de scope/baseDir e garante que o path nunca escape do
  // diretório do app. Se o arquivo ainda não existe, retornamos vazio.
  let idx: PersistedIndex = empty;
  try {
    await projectRoot(projectId);
    const raw = await invoke<string>("read_project_file", {
      projectId,
      relative: "kb.json",
    });
    const parsed = JSON.parse(raw) as PersistedIndex;
    if (!parsed.entries) parsed.entries = [];
    idx = parsed;
  } catch {
    idx = { ...empty };
  }

  // ---- Recuperação retroativa ----
  // Durante meses o `create_project_dir` (Rust) zerava `kb.json` a cada
  // chamada, enquanto os chunks continuavam sendo gravados em
  // `kb_entries` no SQLite. Resultado: centenas de chunks vivos no DB,
  // mas o index em memória carregava 0 entries e a busca retornava vazio.
  // Se detectarmos essa situação (kb.json sem entries mas kb_entries com
  // registros), reconstruímos o index a partir do SQLite. Chunks antigos
  // vêm sem vetor — o scoring cai pro fallback lexical, o que é
  // suficiente pra não perder recall até a próxima re-ingestão.
  if (idx.entries.length === 0) {
    try {
      const rows = await kbRepo.listByProject(projectId);
      if (rows.length > 0) {
        const rebuilt: PersistedEntry[] = rows.map((r) => ({
          id: r.id,
          vector: [],
          content: r.content,
          phase: r.phase_number ?? undefined,
          agent: r.agent_type ?? undefined,
          documentType: r.document_type,
          sourceDocumentId: r.source_document_id ?? undefined,
          createdAt: r.created_at,
        }));
        console.warn(
          `[kb] kb.json vazio para projeto ${projectId} mas ` +
            `kb_entries tem ${rows.length} registros — reconstruindo index.`
        );
        idx.entries = rebuilt;
        indexCache.set(projectId, idx);
        await persist(projectId);
        return idx;
      }
    } catch (e: any) {
      console.warn(`[kb] Falha ao reconstruir index do SQLite: ${e?.message ?? e}`);
    }
  }

  indexCache.set(projectId, idx);
  return idx;
}

async function persist(projectId: string): Promise<void> {
  if (!isTauri()) return;
  const idx = indexCache.get(projectId);
  if (!idx) return;
  // `write_project_file` normaliza pra `<AppData>/projects/<projectId>/kb.json`,
  // cria diretórios pais se preciso e valida o path dentro do sandbox do app.
  await invoke("write_project_file", {
    args: {
      project_id: projectId,
      relative: "kb.json",
      content: JSON.stringify(idx),
    },
  });
}

function chunk(text: string, size = 1200, overlap = 150): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

export interface IngestOptions {
  projectId: string;
  content: string;
  documentType: string;
  phaseNumber?: number;
  agentType?: AgentType;
  sourceDocumentId?: string;
  tags?: string[];
}

/**
 * Ingesta conteúdo aprovado no KB: chunk + (embed opcional) + upsert.
 *
 * Nunca lança — se o embedder estiver indisponível, o chunk é persistido
 * sem vetor e a busca futura usa scoring lexical.
 */
export async function ingest(opts: IngestOptions): Promise<KbEntry[]> {
  const idx = await loadIndex(opts.projectId);
  const pieces = chunk(opts.content);
  const created: KbEntry[] = [];

  if (opts.sourceDocumentId) {
    idx.entries = idx.entries.filter(
      (e) => e.sourceDocumentId !== opts.sourceDocumentId
    );
  }

  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const vec = await embed(piece); // pode ser null em modo lexical
    const id = uid();
    const contentHash = await sha256(piece);
    const saved = await kbRepo.insert({
      project_id: opts.projectId,
      content: piece,
      content_hash: contentHash,
      document_type: opts.documentType,
      phase_number: opts.phaseNumber ?? null,
      agent_type: (opts.agentType ?? null) as any,
      tags: JSON.stringify(opts.tags ?? []),
      metadata: JSON.stringify({
        chunk: i,
        total: pieces.length,
        mode: vec ? "semantic" : "lexical",
      }),
      source_document_id: opts.sourceDocumentId ?? null,
    });
    created.push(saved);
    idx.entries.push({
      id: saved.id,
      vector: vec ?? [],
      content: piece,
      phase: opts.phaseNumber,
      agent: opts.agentType,
      documentType: opts.documentType,
      sourceDocumentId: opts.sourceDocumentId,
      createdAt: saved.created_at,
    });
    void id;
  }

  await persist(opts.projectId);
  return created;
}

export interface IngestAssetOptions {
  projectId: string;
  assetId: string;
  assetPath: string;
  assetType: "concept_art" | "sprite" | "tile";
  prompt: string;
  phaseNumber?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Ingesta metadata de um asset visual aprovado no KB. O embedding é feito
 * sobre o prompt textual do asset (não pela imagem — nesta iteração não
 * usamos CLIP). Nós armazenamos `sourceAssetId` e `assetPath` no índice
 * em memória para o grafo semântico renderizar thumbnails.
 */
export async function ingestAsset(opts: IngestAssetOptions): Promise<void> {
  const idx = await loadIndex(opts.projectId);

  // Idempotência: remove entry anterior do mesmo asset.
  idx.entries = idx.entries.filter((e) => e.sourceAssetId !== opts.assetId);

  const tags = Array.isArray(opts.metadata?.tags)
    ? (opts.metadata!.tags as string[]).join(", ")
    : "";
  const synthetic =
    `[${opts.assetType}] ${opts.prompt}` +
    (tags ? `\ntags: ${tags}` : "") +
    (opts.phaseNumber != null ? `\nfase: ${opts.phaseNumber}` : "");

  const vec = await embed(synthetic);
  const contentHash = await sha256(synthetic);

  const saved = await kbRepo.insert({
    project_id: opts.projectId,
    content: synthetic,
    content_hash: contentHash,
    document_type: opts.assetType,
    phase_number: opts.phaseNumber ?? null,
    agent_type: null as any,
    tags: JSON.stringify(opts.metadata?.tags ?? []),
    metadata: JSON.stringify({
      ...(opts.metadata ?? {}),
      mode: vec ? "semantic" : "lexical",
      asset_id: opts.assetId,
      asset_path: opts.assetPath,
      kind: "asset",
    }),
    source_document_id: null,
  });

  idx.entries.push({
    id: saved.id,
    vector: vec ?? [],
    content: synthetic,
    phase: opts.phaseNumber,
    documentType: opts.assetType,
    sourceAssetId: opts.assetId,
    assetPath: opts.assetPath,
    createdAt: saved.created_at,
  });

  await persist(opts.projectId);
}

/**
 * Remove entries do KB associadas a um asset (usado quando o asset é
 * rejeitado ou deletado).
 */
export async function removeAssetFromKb(
  projectId: string,
  assetId: string
): Promise<void> {
  const idx = await loadIndex(projectId);
  const before = idx.entries.length;
  idx.entries = idx.entries.filter((e) => e.sourceAssetId !== assetId);
  if (idx.entries.length !== before) {
    await persist(projectId);
  }
}

/**
 * Retorna snapshot read-only do índice em memória (carregado do disco
 * quando necessário). Usado pelo painel de Grafo Semântico.
 */
export async function getIndexSnapshot(
  projectId: string
): Promise<PersistedIndexView> {
  const idx = await loadIndex(projectId);
  return { projectId, entries: idx.entries.slice() };
}

export interface KbSearchResult {
  entry: PersistedEntry;
  similarity: number;
}

export async function search(
  projectId: string,
  query: string,
  topK = 8
): Promise<KbSearchResult[]> {
  const idx = await loadIndex(projectId);
  if (idx.entries.length === 0) return [];

  const qv = await embed(query); // null se modo lexical
  const qTokens = tokenize(query);

  const scored = idx.entries.map((e) => {
    let sim = 0;
    if (qv && e.vector.length === qv.length) {
      sim = cosine(qv, e.vector);
    } else {
      // Fallback lexical. Normalizamos para faixa próxima de cosine
      // (0-1 tipicamente) dividindo por um teto razoável.
      const raw = lexicalScore(qTokens, e.content);
      sim = Math.min(1, raw / 10);
    }
    return { entry: e, similarity: sim };
  });
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK).filter((r) => r.similarity > 0);
}

export async function kbStats(projectId: string): Promise<{
  count: number;
  byPhase: Record<number, number>;
}> {
  const idx = await loadIndex(projectId);
  const byPhase: Record<number, number> = {};
  for (const e of idx.entries) {
    if (e.phase != null) byPhase[e.phase] = (byPhase[e.phase] ?? 0) + 1;
  }
  return { count: idx.entries.length, byPhase };
}

export async function buildContextBlock(
  projectId: string,
  query: string,
  topK = 6
): Promise<string> {
  const hits = await search(projectId, query, topK);
  if (hits.length === 0)
    return "Nenhum contexto prévio encontrado no Knowledge Base.";
  return hits
    .map(
      (h, i) =>
        `[#${i + 1} | fase ${h.entry.phase ?? "-"} | ${h.entry.documentType} | sim ${h.similarity.toFixed(
          3
        )}]\n${h.entry.content}`
    )
    .join("\n\n");
}

export async function clearProject(projectId: string): Promise<void> {
  indexCache.delete(projectId);
  await kbRepo.deleteByProject(projectId);
  await persist(projectId);
}
