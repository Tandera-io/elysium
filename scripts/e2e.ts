/* eslint-disable no-console */
// Elysium Build Platform — E2E test harness
//
// Exercita, sem subir o app Tauri/React, toda a lógica crítica que o desktop
// faz em tempo de execução:
//
// 1) Carrega a mesma migration SQL (src-tauri/migrations/001_initial.sql)
//    num SQLite real (better-sqlite3).
// 2) Cria um projeto, pastas em disco (%TEMP%/elysium-e2e) e kb.json.
// 3) Simula um "turno" completo com o Discovery Agent: histórico + user input +
//    contexto de KB. A chamada ao Claude CLI é substituída por um mock que
//    emite chunks JSON no MESMO formato que `claude -p --output-format
//    stream-json` emite (detalhado em src-tauri/src/claude.rs). O mock roda
//    como processo filho real para validar também o parsing line-by-line.
// 4) Extrai <document> do output, persiste em phase_documents e rev table.
// 5) Aprova o documento: chunk + embed (Xenova/all-MiniLM-L6-v2 em Node),
//    persiste metadata em kb_entries e vetor em kb.json.
// 6) Faz busca semântica ("qual é o mood do jogo?") e valida ranking.
// 7) Repete para Etapa 2 (Benchmark Agent), usando contexto do KB já povoado.
// 8) Exporta GDD em Markdown e JSON em `<tempdir>/projects/<id>/exports/`.
// 9) Imprime relatório com pass/fail, timings e tamanhos.

import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

// ---------- Setup ----------

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = readFileSync(
  path.join(REPO, "src-tauri/migrations/001_initial.sql"),
  "utf8"
);
const WORKDIR = path.join(os.tmpdir(), "elysium-e2e-" + Date.now());
const DB_PATH = path.join(WORKDIR, "elysium.db");
const PROJECTS_DIR = path.join(WORKDIR, "projects");

mkdirSync(WORKDIR, { recursive: true });
mkdirSync(PROJECTS_DIR, { recursive: true });

const report: Array<{
  step: string;
  status: "pass" | "fail" | "skip";
  ms: number;
  detail?: string;
}> = [];

function log(...args: unknown[]) {
  console.log("[e2e]", ...args);
}

async function step<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T | null> {
  const t0 = performance.now();
  process.stdout.write(`  ◦ ${name}... `);
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - t0);
    console.log(`✓ ${ms}ms`);
    report.push({ step: name, status: "pass", ms });
    return result;
  } catch (e: any) {
    const ms = Math.round(performance.now() - t0);
    console.log(`✗ ${ms}ms`);
    console.error("     →", e?.message ?? e);
    report.push({
      step: name,
      status: "fail",
      ms,
      detail: String(e?.message ?? e),
    });
    return null;
  }
}

// ---------- DB helpers (espelham src/lib/db.ts) ----------

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

function uid() {
  return randomUUID();
}

function applyMigration() {
  db.exec(MIGRATION);
}

function createProject(name: string, description: string) {
  const id = uid();
  db.prepare(
    `INSERT INTO game_projects (id, name, description) VALUES (?, ?, ?)`
  ).run(id, name, description);
  const proj = db
    .prepare(`SELECT * FROM game_projects WHERE id = ?`)
    .get(id) as any;
  return proj;
}

function projectPaths(projectId: string) {
  const root = path.join(PROJECTS_DIR, projectId);
  const paths = {
    root,
    assets: path.join(root, "assets"),
    docs: path.join(root, "docs"),
    exports: path.join(root, "exports"),
    kb: path.join(root, "kb.json"),
  };
  return paths;
}

function ensureProjectDirs(projectId: string) {
  const p = projectPaths(projectId);
  for (const sub of [
    p.root,
    p.assets,
    path.join(p.assets, "concept"),
    path.join(p.assets, "sprite"),
    path.join(p.assets, "audio"),
    p.docs,
    p.exports,
  ]) {
    mkdirSync(sub, { recursive: true });
  }
  writeFileSync(
    p.kb,
    JSON.stringify({ version: 1, projectId, entries: [] }, null, 2)
  );
  return p;
}

function appendMessage(
  conversationId: string,
  role: "user" | "agent" | "system",
  content: string
) {
  const id = uid();
  const seq =
    (db
      .prepare(
        `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS c FROM conversation_messages WHERE conversation_id = ?`
      )
      .get(conversationId) as any).c ?? 1;
  db.prepare(
    `INSERT INTO conversation_messages (id, conversation_id, role, content, metadata, sequence_number)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, conversationId, role, content, "{}", seq);
  db.prepare(
    `UPDATE agent_conversations SET message_count = message_count + 1 WHERE id = ?`
  ).run(conversationId);
  return { id, sequence_number: seq };
}

function getOrCreateConversation(
  projectId: string,
  agentType: string,
  phase: number
) {
  const existing = db
    .prepare(
      `SELECT * FROM agent_conversations
       WHERE project_id = ? AND agent_type = ? AND phase_number = ?`
    )
    .get(projectId, agentType, phase) as any;
  if (existing) return existing;
  const id = uid();
  db.prepare(
    `INSERT INTO agent_conversations (id, project_id, agent_type, phase_number)
     VALUES (?, ?, ?, ?)`
  ).run(id, projectId, agentType, phase);
  return db
    .prepare(`SELECT * FROM agent_conversations WHERE id = ?`)
    .get(id) as any;
}

function upsertDocument(doc: {
  projectId: string;
  phase: number;
  documentType: string;
  title: string;
  content: string;
  agentType: string;
}) {
  const existing = db
    .prepare(
      `SELECT * FROM phase_documents WHERE project_id = ? AND phase_number = ?
       ORDER BY updated_at DESC LIMIT 1`
    )
    .get(doc.projectId, doc.phase) as any;
  if (existing) {
    const revId = uid();
    db.prepare(
      `INSERT INTO document_revisions (id, document_id, version, content, created_by_agent)
       VALUES (?, ?, ?, ?, ?)`
    ).run(revId, existing.id, existing.version, existing.content, existing.agent_type);
    db.prepare(
      `UPDATE phase_documents SET content = ?, title = ?, version = version + 1,
       updated_at = datetime('now'), status = 'draft' WHERE id = ?`
    ).run(doc.content, doc.title, existing.id);
    return db
      .prepare(`SELECT * FROM phase_documents WHERE id = ?`)
      .get(existing.id) as any;
  }
  const id = uid();
  db.prepare(
    `INSERT INTO phase_documents
     (id, project_id, phase_number, document_type, title, content, agent_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    doc.projectId,
    doc.phase,
    doc.documentType,
    doc.title,
    doc.content,
    doc.agentType
  );
  return db.prepare(`SELECT * FROM phase_documents WHERE id = ?`).get(id) as any;
}

function approveDocument(docId: string) {
  db.prepare(
    `UPDATE phase_documents SET status = 'approved',
     approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(docId);
}

// ---------- Mock Claude CLI com streaming real ----------
//
// Spawna um node filho que imprime, no stdout, uma sequência de JSON-lines
// idêntica ao formato do `claude -p --output-format stream-json`, incluindo
// um `<document>` embutido. Isto exercita o parser que roda no Rust (e
// também o cliente TS `streamClaude` por similaridade).

function writeMockClaude(outPath: string, fullText: string) {
  const script = `
const lines = [
  { type: "system", subtype: "init", session_id: "test-session" },
  { type: "stream_event", event: { type: "message_start", message: { role: "assistant" } } },
  { type: "stream_event", event: { type: "content_block_start", content_block: { type: "text", text: "" } } },
];
console.log(JSON.stringify(lines[0]));
console.log(JSON.stringify(lines[1]));
console.log(JSON.stringify(lines[2]));

const full = ${JSON.stringify(fullText)};
const chunks = full.match(/.{1,60}/gs) || [full];
for (const c of chunks) {
  console.log(JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: c } } }));
}
console.log(JSON.stringify({ type: "stream_event", event: { type: "content_block_stop" } }));
console.log(JSON.stringify({ type: "stream_event", event: { type: "message_stop" } }));
console.log(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: full }] } }));
console.log(JSON.stringify({ type: "result", subtype: "success", is_error: false, duration_ms: 123, total_cost_usd: 0.0012, usage: { input_tokens: 420, output_tokens: 800 } }));
`;
  writeFileSync(outPath, script);
}

interface StreamResult {
  fullText: string;
  extractedDocument: { title: string; content: string } | null;
  events: number;
  cost?: number;
}

const DOC_RE = /<document\s+title=["']([^"']+)["']\s*>([\s\S]*?)<\/document>/i;

function extractDocument(text: string) {
  const m = DOC_RE.exec(text);
  if (!m) return null;
  return { title: m[1].trim(), content: m[2].trim() };
}

async function streamMockClaude(responseText: string): Promise<StreamResult> {
  const scriptPath = path.join(WORKDIR, `mock-claude-${uid()}.mjs`);
  writeMockClaude(scriptPath, responseText);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let buffer = "";
    let full = "";
    let events = 0;
    let cost: number | undefined;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        events++;
        let data: any;
        try {
          data = JSON.parse(line);
        } catch {
          continue;
        }
        if (
          data.type === "stream_event" &&
          data.event?.type === "content_block_delta" &&
          data.event.delta?.type === "text_delta"
        ) {
          full += data.event.delta.text;
        } else if (data.type === "result") {
          cost = data.total_cost_usd;
        }
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`mock exit ${code}`));
      try {
        rmSync(scriptPath, { force: true });
      } catch {
        // ignore
      }
      resolve({
        fullText: full,
        extractedDocument: extractDocument(full),
        events,
        cost,
      });
    });
  });
}

// Valida que o CLI Claude real está instalado (não autenticado é ok)
async function checkClaudeCliBinary(): Promise<{
  installed: boolean;
  authenticated: boolean;
  version: string | null;
}> {
  return new Promise((resolve) => {
    const child = spawn("claude", ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.on("error", () =>
      resolve({ installed: false, authenticated: false, version: null })
    );
    child.on("exit", (code) => {
      if (code !== 0)
        return resolve({
          installed: false,
          authenticated: false,
          version: null,
        });
      resolve({
        installed: true,
        authenticated: false,
        version: out.trim(),
      });
    });
  });
}

// ---------- Embeddings locais (mesmo modelo do app) ----------

let embedder: any = null;
async function getEmbedder() {
  if (embedder) return embedder;
  const t = await import("@huggingface/transformers");
  (t as any).env.allowLocalModels = false;
  const pipeline = (t as any).pipeline;
  embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
    { dtype: "q8" }
  );
  return embedder;
}

async function embed(text: string): Promise<number[]> {
  const e = await getEmbedder();
  const out = await e(text, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

function cosine(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d;
}

function chunkText(text: string, size = 1200, overlap = 150): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    out.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return out;
}

async function ingestDocument(opts: {
  projectId: string;
  content: string;
  documentType: string;
  phaseNumber: number;
  agentType: string;
  sourceDocumentId: string;
}) {
  const p = projectPaths(opts.projectId);
  const index = JSON.parse(readFileSync(p.kb, "utf8"));
  index.entries = index.entries.filter(
    (e: any) => e.sourceDocumentId !== opts.sourceDocumentId
  );
  const pieces = chunkText(opts.content);
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const vec = await embed(piece);
    const id = uid();
    db.prepare(
      `INSERT INTO kb_entries
        (id, project_id, content, content_hash, document_type,
         phase_number, agent_type, tags, metadata, source_document_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      opts.projectId,
      piece,
      sha256(piece),
      opts.documentType,
      opts.phaseNumber,
      opts.agentType,
      "[]",
      JSON.stringify({ chunk: i, total: pieces.length }),
      opts.sourceDocumentId
    );
    index.entries.push({
      id,
      vector: vec,
      content: piece,
      phase: opts.phaseNumber,
      agent: opts.agentType,
      documentType: opts.documentType,
      sourceDocumentId: opts.sourceDocumentId,
      createdAt: new Date().toISOString(),
    });
  }
  writeFileSync(p.kb, JSON.stringify(index));
  return pieces.length;
}

async function searchKb(projectId: string, query: string, topK = 5) {
  const p = projectPaths(projectId);
  const index = JSON.parse(readFileSync(p.kb, "utf8"));
  if (index.entries.length === 0) return [];
  const qv = await embed(query);
  const scored = index.entries.map((e: any) => ({
    entry: e,
    similarity: cosine(qv, e.vector),
  }));
  scored.sort((a: any, b: any) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// ---------- Export ----------

function exportMarkdown(projectId: string, projectName: string) {
  const docs = db
    .prepare(
      `SELECT * FROM phase_documents WHERE project_id = ? ORDER BY phase_number ASC`
    )
    .all(projectId) as any[];
  const date = new Date().toISOString().slice(0, 10);
  let md = `# GDD — ${projectName}\n\n> Gerado em ${date} pela Elysium Build Platform (E2E mock).\n\n`;
  for (const d of docs) {
    md += `## Etapa ${d.phase_number} — ${d.title}\n\n`;
    md += `> Status: **${d.status}** · v${d.version}\n\n`;
    md += `${d.content}\n\n`;
  }
  const p = projectPaths(projectId);
  const file = path.join(p.exports, `gdd-${date}.md`);
  writeFileSync(file, md);
  return file;
}

function exportJson(projectId: string) {
  const docs = db
    .prepare(`SELECT * FROM phase_documents WHERE project_id = ?`)
    .all(projectId);
  const assets = db
    .prepare(`SELECT * FROM generated_assets WHERE project_id = ?`)
    .all(projectId);
  const project = db
    .prepare(`SELECT * FROM game_projects WHERE id = ?`)
    .get(projectId);
  const data = { exportedAt: new Date().toISOString(), project, docs, assets };
  const p = projectPaths(projectId);
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(p.exports, `gdd-${date}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

// ---------- Respostas mockadas "realistas" para cada agente ----------

const DISCOVERY_TURN_1 =
  "Legal! Antes de eu te dar um primeiro esboço de pitch, me responde 3 coisas rápidas:\n\n1. **Gênero principal**: metroidvania, roguelike, narrativa, puzzle, ação, outro?\n2. **Gancho único**: o que faz ESTE jogo diferente de todos os outros do gênero?\n3. **Mood/vibe** em 1 palavra: melancólico, frenético, cozy, brutal, contemplativo...?";

const DISCOVERY_TURN_2 =
  "Ótimo — metroidvania melancólico com memórias fragmentadas é um nicho poderoso. Pergunta decisiva: **público-alvo** (casual, hardcore metroidvania fan, fãs de narrativa indie tipo Hollow Knight ou Gris?), **plataforma** (PC/Switch/mobile?) e **tempo de sessão** alvo (15 min, 1 hora, long-haul?).";

const DISCOVERY_DOC = `Estamos com material suficiente para fechar. Aqui vai a prévia:

<document title="Pitch & Visão — Hollow Reverie">
## Pitch
Para fãs de metroidvanias melancólicos à la Hollow Knight e Gris, **Hollow Reverie** é um metroidvania narrativo onde o jogador reconstrói memórias fragmentadas de uma civilização esquecida — diferente de outros do gênero, cada habilidade destrava uma camada emocional do mundo, não apenas uma zona física.

## Gênero & Plataforma
- Metroidvania 2D narrativo
- PC (Steam) na primeira janela, Switch depois.
- Sessão-alvo: 30-90 minutos.

## Público-alvo
Fãs de indies melancólicos (Hollow Knight, Gris, Ori), público maduro 25-40 anos, interesse em exploração lenta e simbólica.

## Mood / Fantasia Central
Melancolia barroca. O jogador se sente **arqueólogo emocional** de um mundo que chorou.

## 3 Pilares de Design
1. **Memória como mecânica** — habilidades são fragmentos de lembranças, não upgrades mecânicos.
2. **Silêncio como voz** — narrativa 90% ambiental, 10% diálogo mínimo.
3. **Ritmo contemplativo** — recompensa o jogador que para para olhar.

## Referências principais
- Hollow Knight (estrutura de mundo)
- Gris (paleta emocional)
- Rime (simbolismo)
- Sable (pacing)

## Anti-pilares (o que NÃO é este jogo)
- Não tem combate frenético.
- Não tem sistema de loot/RPG.
- Não tem boss-rush.
</document>

Quer **APROVAR**, **ITERAR** (me dê feedback) ou **REVISAR**?`;

const BENCHMARK_DOC = `Ok, com base no pitch aprovado, aqui vai o benchmark consolidado:

<document title="Benchmark de Mercado — Hollow Reverie">
## Jogos de Referência

| Jogo | Tags (Steam) | O que inspira | O que evitar |
|---|---|---|---|
| Hollow Knight | Metroidvania, Souls-like, 2D | estrutura de mundo interligado | combate hardcore com gates de skill |
| Gris | Atmosphere, Metroidvania, Emotional | paleta emocional, silêncio narrativo | ausência de agência mecânica profunda |
| Ori and the Blind Forest | Platformer, Metroidvania | responsividade do controle | estética demasiado fairy-tale |
| Rime | Puzzle, Exploration, Emotional | simbolismo visual | puzzles que interrompem o fluxo |
| Sable | Exploration, Open-world | pacing contemplativo | câmera 3D |

## SWOT (indie)
- **Strengths**: nicho bem definido, proposta emocional única, pipeline enxuto de pixel art.
- **Weaknesses**: combate minimalista pode afastar fãs de Metroidvanias tradicionais.
- **Opportunities**: lacuna entre Hollow Knight (combate pesado) e Gris (zero combate).
- **Threats**: saturação do gênero metroidvania em 2026-2027.

## Blue Ocean Canvas
- **Eliminar**: sistema de loot, HUD cheia, tutoriais textuais.
- **Reduzir**: combate, diálogos.
- **Aumentar**: simbolismo visual, efeitos climáticos reativos à narrativa.
- **Criar**: memórias como mecânica de destrave.

## Posicionamento Estratégico
"A ponte emocional entre Hollow Knight e Gris" — para quem gosta de explorar por exploração.

## Risco Principal
Audiência acha "pouco jogo". Mitigação: conteúdo side-opcional com profundidade mecânica opcional.
</document>

Quer **APROVAR**, **ITERAR** ou **REVISAR**?`;

// ---------- MAIN ----------

async function main() {
  console.log("\n╭─────────────────────────────────────────────────╮");
  console.log("│  Elysium Build Platform — E2E Test Harness      │");
  console.log("╰─────────────────────────────────────────────────╯");
  console.log(`  Workdir: ${WORKDIR}`);

  // [1] Environment
  await step("Ambiente: Node + Claude CLI + migração SQL", async () => {
    const nodeVer = process.version;
    const claudeInfo = await checkClaudeCliBinary();
    if (!existsSync(path.join(REPO, "src-tauri/migrations/001_initial.sql"))) {
      throw new Error("migration não encontrada");
    }
    log(
      "node=" + nodeVer,
      "claude=" + (claudeInfo.version ?? "missing"),
      "installed=" + claudeInfo.installed
    );
    log(
      "⚠ Claude CLI não autenticado — usando mock com mesmo formato de stream do CLI real."
    );
    return { nodeVer, claudeInfo };
  });

  // [2] Schema
  await step("Aplicar migration em SQLite (better-sqlite3)", () => {
    applyMigration();
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
      )
      .all() as any[];
    log("tabelas criadas:", tables.map((t) => t.name).join(", "));
    const expected = [
      "agent_conversations",
      "api_usage_metrics",
      "app_settings",
      "conversation_messages",
      "document_revisions",
      "game_projects",
      "generated_assets",
      "kb_connections",
      "kb_entries",
      "phase_documents",
    ];
    for (const t of expected) {
      if (!tables.find((x) => x.name === t))
        throw new Error(`tabela ${t} ausente`);
    }
    return tables.length;
  });

  // [3] Project
  const proj = await step("Criar projeto + estrutura de diretórios", () => {
    const p = createProject(
      "Hollow Reverie",
      "metroidvania melancólico sobre memórias fragmentadas"
    );
    const dirs = ensureProjectDirs(p.id);
    if (!existsSync(dirs.kb)) throw new Error("kb.json não criado");
    log("projectId=" + p.id);
    return p;
  });
  if (!proj) return finish();

  // [4] Claude mock round-trip
  await step("Round-trip Claude CLI (mock JSON-streaming)", async () => {
    const r = await streamMockClaude("Hello, Elysium! (ping)");
    if (r.fullText !== "Hello, Elysium! (ping)")
      throw new Error(
        `fullText mismatch: ${JSON.stringify(r.fullText)}`
      );
    log(
      `events=${r.events}, tokens-reconstituídos=${r.fullText.length}, cost=$${r.cost}`
    );
  });

  // [5] Discovery — conversa em 3 turnos
  const conv = getOrCreateConversation(proj.id, "discovery", 1);
  await step("Discovery Agent — turno 1 (boas-vindas + 3 perguntas)", async () => {
    appendMessage(
      conv.id,
      "user",
      "Quero fazer um metroidvania melancólico onde a mecânica central é recuperar memórias."
    );
    const r = await streamMockClaude(DISCOVERY_TURN_1);
    appendMessage(conv.id, "agent", r.fullText);
    log(`agent streamed ${r.fullText.length} chars em ${r.events} eventos`);
  });

  await step("Discovery Agent — turno 2 (aprofunda público/plataforma)", async () => {
    appendMessage(
      conv.id,
      "user",
      "Metroidvania 2D, gancho é 'memórias como habilidades', mood melancólico barroco."
    );
    const r = await streamMockClaude(DISCOVERY_TURN_2);
    appendMessage(conv.id, "agent", r.fullText);
  });

  const discoveryResult = await step(
    "Discovery Agent — turno 3 (gera <document> do pitch)",
    async () => {
      appendMessage(
        conv.id,
        "user",
        "Público: fãs de Hollow Knight/Gris, adultos 25-40. Plataforma: PC primeiro, Switch depois. Sessão: 30-90 min."
      );
      const r = await streamMockClaude(DISCOVERY_DOC);
      appendMessage(conv.id, "agent", r.fullText);
      if (!r.extractedDocument) throw new Error("<document> não extraído");
      log(
        `documento "${r.extractedDocument.title}" extraído (${r.extractedDocument.content.length} chars)`
      );
      return r.extractedDocument;
    }
  );
  if (!discoveryResult) return finish();

  // [6] Persist document
  const doc1 = await step("Persistir documento da Etapa 1 em phase_documents", () => {
    const saved = upsertDocument({
      projectId: proj.id,
      phase: 1,
      documentType: "pitch",
      title: discoveryResult.title,
      content: discoveryResult.content,
      agentType: "discovery",
    });
    if (!saved.id) throw new Error("save falhou");
    return saved;
  });
  if (!doc1) return finish();

  // [7] Approve + KB ingest (real embeddings)
  const ingested = await step(
    "Aprovar documento + ingestão no KB (embeddings MiniLM)",
    async () => {
      approveDocument(doc1.id);
      const n = await ingestDocument({
        projectId: proj.id,
        content: doc1.content,
        documentType: "pitch",
        phaseNumber: 1,
        agentType: "discovery",
        sourceDocumentId: doc1.id,
      });
      const row = db
        .prepare(`SELECT COUNT(*) as c FROM kb_entries WHERE project_id = ?`)
        .get(proj.id) as any;
      log(`${n} chunks → ${row.c} entries em kb_entries`);
      if (row.c === 0) throw new Error("nada foi inserido no KB");
      return n;
    }
  );
  if (!ingested) return finish();

  // [8] Semantic search
  await step('Busca semântica no KB ("qual é o mood do jogo?")', async () => {
    const results = await searchKb(proj.id, "qual é o mood principal do jogo?", 5);
    if (results.length === 0) throw new Error("zero resultados");
    const top = results[0];
    log(`top hit: sim=${top.similarity.toFixed(3)}`);
    log(`   trecho: ${top.entry.content.slice(0, 120).replace(/\n/g, " ")}...`);
    if (top.similarity < 0.25)
      throw new Error(
        `similaridade muito baixa (${top.similarity.toFixed(3)})`
      );
    // Sanity: deve mencionar "melancolia" ou "mood" no top result
    if (
      !/melanc|mood|fantasia/i.test(top.entry.content) &&
      !/melanc|mood/i.test(results[1]?.entry.content ?? "")
    ) {
      throw new Error(
        `resultados top não contêm termos de mood (recall suspeito)`
      );
    }
    return results.length;
  });

  // [9] Benchmark agent
  const bmResult = await step(
    "Benchmark Agent — turno com contexto do KB (Etapa 2)",
    async () => {
      const conv2 = getOrCreateConversation(proj.id, "benchmark", 2);
      const kbCtx = await searchKb(proj.id, "gênero, público, diferencial", 3);
      appendMessage(
        conv2.id,
        "user",
        "Mapeia 3-5 concorrentes. Use o que já foi aprovado no pitch."
      );
      // Validação importante: confirma que o KB de fato retornou contexto
      if (kbCtx.length === 0)
        throw new Error("KB não retornou contexto para o Benchmark");
      const r = await streamMockClaude(BENCHMARK_DOC);
      appendMessage(conv2.id, "agent", r.fullText);
      if (!r.extractedDocument) throw new Error("benchmark sem <document>");
      const saved = upsertDocument({
        projectId: proj.id,
        phase: 2,
        documentType: "benchmark",
        title: r.extractedDocument.title,
        content: r.extractedDocument.content,
        agentType: "benchmark",
      });
      approveDocument(saved.id);
      await ingestDocument({
        projectId: proj.id,
        content: saved.content,
        documentType: "benchmark",
        phaseNumber: 2,
        agentType: "benchmark",
        sourceDocumentId: saved.id,
      });
      log(
        `benchmark doc=${saved.id.slice(0, 8)}… (ingestado no KB, usado ${kbCtx.length} chunks de contexto)`
      );
      return saved;
    }
  );
  if (!bmResult) return finish();

  // [10] Export
  await step("Exportar GDD em Markdown + JSON", () => {
    const md = exportMarkdown(proj.id, proj.name);
    const json = exportJson(proj.id);
    const mdSize = readFileSync(md, "utf8").length;
    const jsonSize = readFileSync(json, "utf8").length;
    log(`md=${path.basename(md)} (${mdSize} chars)`);
    log(`json=${path.basename(json)} (${jsonSize} chars)`);
    if (mdSize < 500 || jsonSize < 500)
      throw new Error("export muito pequeno");
    if (!readFileSync(md, "utf8").includes("Hollow Reverie"))
      throw new Error("nome do projeto ausente no export");
  });

  // [11] Pipeline state assertion
  await step("Estado do pipeline: 2 etapas aprovadas, 11 pendentes", () => {
    const rows = db
      .prepare(
        `SELECT phase_number, status FROM phase_documents WHERE project_id = ? ORDER BY phase_number`
      )
      .all(proj.id) as any[];
    const approved = rows.filter((r) => r.status === "approved");
    if (approved.length !== 2) throw new Error(`esperava 2, tem ${approved.length}`);
    const conversations = db
      .prepare(
        `SELECT agent_type, message_count FROM agent_conversations WHERE project_id = ?`
      )
      .all(proj.id) as any[];
    log("conversations:", conversations);
    // Turnos esperados: 3 user + 3 agent = 6 mensagens em discovery; 1 + 1 = 2 em benchmark
    const disc = conversations.find((c) => c.agent_type === "discovery");
    const bm = conversations.find((c) => c.agent_type === "benchmark");
    if ((disc?.message_count ?? 0) < 5)
      throw new Error("discovery conv com poucos turnos");
    if ((bm?.message_count ?? 0) < 2)
      throw new Error("benchmark conv com poucos turnos");
  });

  finish();
}

function finish() {
  console.log("\n─── RELATÓRIO FINAL ───────────────────────────");
  const pass = report.filter((r) => r.status === "pass").length;
  const fail = report.filter((r) => r.status === "fail").length;
  const total = report.length;
  const totalMs = report.reduce((a, r) => a + r.ms, 0);
  for (const r of report) {
    const icon = r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "~";
    const color = r.status === "pass" ? "" : r.status === "fail" ? "" : "";
    console.log(
      ` ${icon} [${String(r.ms).padStart(5)}ms] ${r.step}${r.detail ? "  → " + r.detail : ""}${color}`
    );
  }
  console.log("───────────────────────────────────────────────");
  console.log(`Passou: ${pass}/${total}  Falhou: ${fail}  Total: ${totalMs}ms`);
  console.log(`Workdir: ${WORKDIR}`);
  db.close();
  if (fail > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error("erro fatal:", e);
  finish();
});
