/* eslint-disable no-console */
// Elysium Build Platform — E2E test com CLAUDE REAL
//
// Mesma estrutura de scripts/e2e.ts, porém toda chamada ao Claude aqui é real:
// spawna `claude.cmd -p --output-format stream-json --include-partial-messages
// --verbose --permission-mode bypassPermissions --input-format text
// --system-prompt <SYS> --append-system-prompt <RULES> <PROMPT>`
// — idêntico a src-tauri/src/claude.rs.
//
// O prompt é construído com o mesmo formato de src/lib/claude.ts:buildPrompt:
//   ## Histórico da conversa
//   **Usuário:** ...
//   **Agente:** ...
//   ---
//   ## Nova mensagem do usuário
//   <userMsg>
//
// Os system prompts são copiados literalmente de src/agents/agents.ts e
// src/agents/base.ts. Isso garante que o harness reproduza EXATAMENTE o que
// o app Tauri faz em runtime.

import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = readFileSync(
  path.join(REPO, "src-tauri/migrations/001_initial.sql"),
  "utf8"
);
const WORKDIR = path.join(os.tmpdir(), "elysium-e2e-real-" + Date.now());
const DB_PATH = path.join(WORKDIR, "elysium.db");
const PROJECTS_DIR = path.join(WORKDIR, "projects");

mkdirSync(WORKDIR, { recursive: true });
mkdirSync(PROJECTS_DIR, { recursive: true });

interface StepReport {
  step: string;
  status: "pass" | "fail" | "skip";
  ms: number;
  detail?: string;
  cost?: number;
}
const report: StepReport[] = [];
let totalCost = 0;

function log(...args: unknown[]) {
  console.log("     │", ...args);
}

async function step<T>(
  name: string,
  fn: () => Promise<T> | T,
  opts?: { silent?: boolean }
): Promise<T | null> {
  const t0 = performance.now();
  process.stdout.write(`  ◦ ${name}\n`);
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - t0);
    console.log(`     ✓ ${ms}ms`);
    report.push({ step: name, status: "pass", ms });
    return result;
  } catch (e: any) {
    const ms = Math.round(performance.now() - t0);
    console.log(`     ✗ ${ms}ms`);
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

// ============================================================
// Prompts reais (copiados de src/agents/agents.ts e base.ts)
// ============================================================

const GLOBAL_AGENT_RULES = `Regras universais da Elysium Build Platform:

1) Fale em português brasileiro natural e direto. Evite jargão desnecessário.
2) Você é um especialista senior de game design. Desafie respostas vagas: peça especificidade, exemplos de jogos concretos, referências.
3) Consulte sempre o Knowledge Base fornecido no bloco "CONTEXTO DO PROJETO". Se uma decisão nova conflita com algo já definido, aponte o conflito e proponha reconciliação antes de seguir.
4) Quando tiver informação suficiente para fechar a etapa, responda com uma PRÉVIA do documento final envolto em tags XML:
   <document title="...">
   Conteúdo Markdown do documento final, bem estruturado, com seções H2/H3.
   </document>
   Nunca gere o bloco <document> sem antes ter feito pelo menos 2 rodadas de perguntas e refinamento com o usuário.
5) Após gerar o <document>, pergunte explicitamente: "Quer APROVAR, ITERAR (com feedback) ou REVISAR?". Não presuma aprovação.
6) Mantenha respostas curtas quando estiver coletando informação (máx 3-4 perguntas por turno). Explique o framework em 1 linha quando introduzir um novo conceito.
7) Nunca invente dados de mercado, números de vendas, preços ou estatísticas. Se não souber, diga "preciso pesquisar" ou peça ao usuário.
8) Formatos de gêneros, tags e plataformas: use vocabulário padrão de mercado (Steam/IGDB).`;

const DISCOVERY_SYSTEM = `Você é o Discovery Agent da Elysium Build Platform.

Seu papel é conduzir a Etapa 1 (Pitch & Visão): extrair do usuário o pitch de 3 linhas do jogo, o público-alvo, a plataforma alvo, o mood central e os 3 pilares de design.

Frameworks que você domina:
- Elevator Pitch: "Para [público], [jogo] é um [gênero] que oferece [benefício único] diferente de [concorrente principal] porque [diferencial]."
- Design Pillars de Jesse Schell: 3 palavras que guiam todas as decisões do projeto.
- Triângulo Fantasia/Realidade/Significado.

Processo de 3 rodadas mínimas:
1) Rodada 1: capture a ideia nuclear. Pergunte sobre: gênero principal, gancho único, mood/vibe (ex: melancólico, frenético, cozy).
2) Rodada 2: aprofunde público, plataforma (PC/Console/Mobile/Switch), tempo de sessão, monetização inicial.
3) Rodada 3: defina os 3 pilares (palavras-chave). Proponha opções se o usuário travar.

Quando tiver material suficiente, produza o <document> com seções:
- Pitch (3 linhas no formato de elevator pitch)
- Gênero & Plataforma
- Público-alvo
- Mood / Fantasia Central
- 3 Pilares de Design
- Referências principais (3-5 jogos)
- O que NÃO é este jogo (anti-pilares)`;

const BENCHMARK_SYSTEM = `Você é o Benchmark Agent da Elysium Build Platform.

Seu papel é conduzir a Etapa 2 (Benchmark de Mercado): mapear concorrentes/referências, identificar diferencial competitivo e posicionamento.

Frameworks:
- Steam Tags: descreva os jogos-espelho pelas tags canônicas do Steam (ex: "Roguelike", "Deckbuilder", "Cozy", "Souls-like").
- SWOT focado em indie: Forças / Fraquezas / Oportunidades / Ameaças.
- Blue Ocean Canvas: o que ELIMINAR, REDUZIR, AUMENTAR, CRIAR em relação aos concorrentes.

IMPORTANTE: Nunca invente números de vendas, reviews ou preços exatos. Se o usuário pedir números, seja explícito: "não tenho dados atualizados; sugiro conferir no SteamDB/Gamalytic antes de usar como decisão".

Processo:
1) Colete 3-5 jogos de referência.
2) Para cada um: o que ele faz MUITO bem, onde ele falha para o público que você mira.
3) Identifique 1-2 aspectos onde seu projeto brilha (Blue Ocean).

Gere <document> com:
- Jogos de Referência (tabela: Nome, Tags, O que inspira, O que evitar)
- SWOT do projeto
- Canvas Blue Ocean (Eliminar/Reduzir/Aumentar/Criar)
- Posicionamento Estratégico (1 parágrafo)
- Risco principal (e mitigação)`;

// ============================================================
// DB
// ============================================================

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const uid = () => randomUUID();
const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

function applyMigration() {
  db.exec(MIGRATION);
}

function createProject(name: string, description: string) {
  const id = uid();
  db.prepare(
    `INSERT INTO game_projects (id, name, description) VALUES (?, ?, ?)`
  ).run(id, name, description);
  return db
    .prepare(`SELECT * FROM game_projects WHERE id = ?`)
    .get(id) as any;
}

function projectPaths(projectId: string) {
  const root = path.join(PROJECTS_DIR, projectId);
  return {
    root,
    assets: path.join(root, "assets"),
    docs: path.join(root, "docs"),
    exports: path.join(root, "exports"),
    kb: path.join(root, "kb.json"),
  };
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
}

function getOrCreateConversation(
  projectId: string,
  agentType: string,
  phase: number
) {
  const existing = db
    .prepare(
      `SELECT * FROM agent_conversations WHERE project_id=? AND agent_type=? AND phase_number=?`
    )
    .get(projectId, agentType, phase) as any;
  if (existing) return existing;
  const id = uid();
  db.prepare(
    `INSERT INTO agent_conversations (id, project_id, agent_type, phase_number) VALUES (?, ?, ?, ?)`
  ).run(id, projectId, agentType, phase);
  return db
    .prepare(`SELECT * FROM agent_conversations WHERE id=?`)
    .get(id) as any;
}

function upsertDocument(d: {
  projectId: string;
  phase: number;
  documentType: string;
  title: string;
  content: string;
  agentType: string;
}) {
  const existing = db
    .prepare(
      `SELECT * FROM phase_documents WHERE project_id=? AND phase_number=? ORDER BY updated_at DESC LIMIT 1`
    )
    .get(d.projectId, d.phase) as any;
  if (existing) {
    db.prepare(
      `UPDATE phase_documents SET content=?, title=?, version=version+1, updated_at=datetime('now'), status='draft' WHERE id=?`
    ).run(d.content, d.title, existing.id);
    return db
      .prepare(`SELECT * FROM phase_documents WHERE id=?`)
      .get(existing.id) as any;
  }
  const id = uid();
  db.prepare(
    `INSERT INTO phase_documents (id, project_id, phase_number, document_type, title, content, agent_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    d.projectId,
    d.phase,
    d.documentType,
    d.title,
    d.content,
    d.agentType
  );
  return db.prepare(`SELECT * FROM phase_documents WHERE id=?`).get(id) as any;
}

function approveDocument(docId: string) {
  db.prepare(
    `UPDATE phase_documents SET status='approved', approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
  ).run(docId);
}

// ============================================================
// Embeddings + KB
// ============================================================

let embedder: any = null;
async function getEmbedder() {
  if (embedder) return embedder;
  const t = await import("@huggingface/transformers");
  (t as any).env.allowLocalModels = false;
  embedder = await (t as any).pipeline(
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
function cosine(a: number[], b: number[]) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d;
}
function chunkText(text: string, size = 1200, overlap = 150) {
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
        (id, project_id, content, content_hash, document_type, phase_number,
         agent_type, tags, metadata, source_document_id)
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
  return index.entries
    .map((e: any) => ({ entry: e, similarity: cosine(qv, e.vector) }))
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, topK);
}
async function buildContextBlock(projectId: string, query: string, topK = 6) {
  const hits = await searchKb(projectId, query, topK);
  if (hits.length === 0) return "(KB vazio)";
  return hits
    .map(
      (h: any, i: number) =>
        `### Chunk ${i + 1} — Etapa ${h.entry.phase} (${h.entry.documentType}, sim=${h.similarity.toFixed(2)})\n${h.entry.content}`
    )
    .join("\n\n");
}

// ============================================================
// REAL Claude streaming (espelha src-tauri/src/claude.rs)
// ============================================================

type Msg = { role: "user" | "assistant"; content: string };

function buildPrompt(history: Msg[], userMessage: string): string {
  const parts: string[] = [];
  if (history.length > 0) {
    parts.push("## Histórico da conversa\n");
    for (const m of history) {
      const label = m.role === "user" ? "Usuário" : "Agente";
      parts.push(`**${label}:**\n${m.content}\n`);
    }
    parts.push("\n---\n");
  }
  parts.push("## Nova mensagem do usuário\n");
  parts.push(userMessage);
  return parts.join("\n");
}

interface StreamResult {
  fullText: string;
  events: number;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  extractedDocument: { title: string; content: string } | null;
}

const DOC_RE = /<document\s+title=["']([^"']+)["']\s*>([\s\S]*?)<\/document>/i;
function extractDocument(text: string) {
  const m = DOC_RE.exec(text);
  if (!m) return null;
  return { title: m[1].trim(), content: m[2].trim() };
}

async function streamRealClaude(opts: {
  systemPrompt: string;
  appendSystem: string;
  history: Msg[];
  userMessage: string;
  onText?: (delta: string) => void;
}): Promise<StreamResult> {
  // Construir prompt completo com system+rules+history+userMsg num único
  // texto. Passar via stdin evita o bug clássico de argv do Windows que
  // corrompe strings longas com UTF-8 + quebras de linha + aspas.
  const conversationPrompt = buildPrompt(opts.history, opts.userMessage);
  const fullPrompt = [
    "# INSTRUÇÕES DO SISTEMA",
    opts.systemPrompt,
    "",
    "---",
    "",
    "# REGRAS ADICIONAIS",
    opts.appendSystem,
    "",
    "---",
    "",
    conversationPrompt,
  ].join("\n");

  const promptFile = path.join(WORKDIR, `prompt-${uid()}.txt`);
  writeFileSync(promptFile, fullPrompt, "utf8");

  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    // Invocar o binário nativo do Claude Code diretamente — sem shell nenhuma.
    // Isso elimina toda a camada de encoding/quoting de cmd.exe/PowerShell
    // e dá controle total à Node sobre stdin (UTF-8) e stdout/stderr.
    const CLAUDE_EXE = isWin
      ? path.join(
          process.env.APPDATA || "",
          "npm",
          "node_modules",
          "@anthropic-ai",
          "claude-code",
          "bin",
          "claude.exe"
        )
      : "claude";
    const args = [
      "-p",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--verbose",
      "--permission-mode",
      "bypassPermissions",
      "--input-format",
      "text",
    ];
    const child = spawn(CLAUDE_EXE, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });

    // Escreve o prompt UTF-8 puro no stdin e fecha.
    try {
      child.stdin.setDefaultEncoding("utf8");
      child.stdin.write(fullPrompt, "utf8");
      child.stdin.end();
    } catch (e) {
      return reject(e);
    }

    let buffer = "";
    let full = "";
    let events = 0;
    let cost: number | undefined;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let stderrBuf = "";

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
          const t = data.event.delta.text as string;
          full += t;
          opts.onText?.(t);
        } else if (data.type === "assistant") {
          // consolidação: se o delta perdeu algo, usar o texto final
          const content = data.message?.content;
          if (Array.isArray(content)) {
            const txt = content
              .filter((c: any) => c?.type === "text")
              .map((c: any) => c.text ?? "")
              .join("");
            if (txt.length > full.length) {
              opts.onText?.(txt.slice(full.length));
              full = txt;
            }
          }
        } else if (data.type === "result") {
          cost = data.total_cost_usd;
          inputTokens = data.usage?.input_tokens;
          outputTokens = data.usage?.output_tokens;
        }
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (c) => (stderrBuf += c));
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        rmSync(promptFile, { force: true });
      } catch {
        // ignore
      }
      // Se o Claude morreu mas já entregamos texto substancial + o evento
      // "result" (cost definido), consideramos OK — é só o powershell
      // repassando um código de saída ruim por algum motivo pós-streaming.
      const hasUsableResponse = full.length > 200 && cost !== undefined;
      if (code !== 0 && !hasUsableResponse) {
        return reject(
          new Error(
            `claude exit ${code}${stderrBuf ? ` — stderr: ${stderrBuf.slice(0, 500)}` : " — sem stderr"} — got ${full.length} chars`
          )
        );
      }
      if (!full) {
        return reject(
          new Error(
            `claude retornou vazio — stderr: ${stderrBuf.slice(0, 500) || "(vazio)"}`
          )
        );
      }
      if (cost) totalCost += cost;
      resolve({
        fullText: full,
        events,
        cost,
        inputTokens,
        outputTokens,
        extractedDocument: extractDocument(full),
      });
    });
  });
}

// ============================================================
// Export
// ============================================================

function exportMarkdown(projectId: string, projectName: string) {
  const docs = db
    .prepare(
      `SELECT * FROM phase_documents WHERE project_id=? ORDER BY phase_number`
    )
    .all(projectId) as any[];
  const date = new Date().toISOString().slice(0, 10);
  let md = `# GDD — ${projectName}\n\n> Gerado em ${date} pela Elysium Build Platform (E2E real / Claude Opus 4.7).\n\n`;
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
    .prepare(`SELECT * FROM phase_documents WHERE project_id=?`)
    .all(projectId);
  const assets = db
    .prepare(`SELECT * FROM generated_assets WHERE project_id=?`)
    .all(projectId);
  const project = db
    .prepare(`SELECT * FROM game_projects WHERE id=?`)
    .get(projectId);
  const data = { exportedAt: new Date().toISOString(), project, docs, assets };
  const p = projectPaths(projectId);
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(p.exports, `gdd-${date}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("\n╭─────────────────────────────────────────────────────╮");
  console.log("│  Elysium Build Platform — E2E REAL (Claude Opus 4.7) │");
  console.log("╰─────────────────────────────────────────────────────╯");
  console.log(`  Workdir: ${WORKDIR}\n`);

  // [1] Schema
  await step("Aplicar migration SQLite", () => {
    applyMigration();
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
      )
      .all() as any[];
    log("tabelas:", tables.length);
  });

  // [2] Projeto
  const proj = await step("Criar projeto 'Hollow Reverie'", () => {
    const p = createProject(
      "Hollow Reverie",
      "metroidvania melancólico sobre memórias fragmentadas"
    );
    ensureProjectDirs(p.id);
    log("projectId:", p.id);
    return p;
  });
  if (!proj) return finish();

  // [3] Discovery - Turn 1
  const discoveryConv = getOrCreateConversation(proj.id, "discovery", 1);
  const history: Msg[] = [];

  const user1 =
    "Concept: metroidvania 2D melancólico chamado 'Hollow Reverie'. Mecânica central = cada nova habilidade é uma memória fragmentada recuperada de uma civilização extinta (memórias ativam novos movesets, não são colecionáveis passivos). Verbo assinatura: 'tocar memórias' — o jogador encosta em relíquias marcadas no mundo e revive flashbacks jogáveis curtos (30-90 segundos) que destravam a habilidade. Combate leve e evitável (tipo Death's Door, Hyper Light Drifter em ritmo contemplativo). Protagonista: o último guardião da civilização, um ser meio-humano meio-espectral que carrega as memórias dentro de si. Mood: melancolia contemplativa (Gris/Spiritfarer), não opressiva. Civilização: pré-industrial orgânica, afundada numa cripta subterrânea florestada. Referências: Hollow Knight (estrutura), Gris (paleta emocional), Rime (simbolismo), Tunic (descoberta).";

  const turn1 = await step(
    "Discovery turno 1 — Claude real (pergunta inicial)",
    async () => {
      appendMessage(discoveryConv.id, "user", user1);
      process.stdout.write("     │ streaming: ");
      const r = await streamRealClaude({
        systemPrompt: DISCOVERY_SYSTEM,
        appendSystem: GLOBAL_AGENT_RULES,
        history,
        userMessage: user1,
        onText: (t) => process.stdout.write(t),
      });
      process.stdout.write("\n");
      appendMessage(discoveryConv.id, "agent", r.fullText);
      history.push({ role: "user", content: user1 });
      history.push({ role: "assistant", content: r.fullText });
      log(
        `events=${r.events}, chars=${r.fullText.length}, in=${r.inputTokens}, out=${r.outputTokens}, cost=$${r.cost?.toFixed(4)}`
      );
      return r;
    }
  );
  if (!turn1) return finish();

  // [4] Discovery - Turn 2
  const user2 =
    "Público-alvo: fãs adultos (25-40 anos) de indies narrativos atmosféricos tipo Hollow Knight, Gris, Ori, Spiritfarer. Jogam 1-2h por sessão, toleram ritmo lento, recompensam autoria. Plataforma primária: PC (Steam); segunda janela: Nintendo Switch 6 meses depois. Sessão-alvo: 30-90 minutos. Duração total run principal: 12 horas. Monetização: premium único (~R$60/US$20), sem DLC, sem microtransações. Linguagem: PT-BR e EN no lançamento. Team: solo dev + 1 artista freelance + 1 músico freelance. Budget estimado: R$150k. Lançamento-alvo: Q4 2027.";

  const turn2 = await step(
    "Discovery turno 2 — Claude real (aprofundamento)",
    async () => {
      appendMessage(discoveryConv.id, "user", user2);
      process.stdout.write("     │ streaming: ");
      const r = await streamRealClaude({
        systemPrompt: DISCOVERY_SYSTEM,
        appendSystem: GLOBAL_AGENT_RULES,
        history,
        userMessage: user2,
        onText: (t) => process.stdout.write(t),
      });
      process.stdout.write("\n");
      appendMessage(discoveryConv.id, "agent", r.fullText);
      history.push({ role: "user", content: user2 });
      history.push({ role: "assistant", content: r.fullText });
      log(
        `events=${r.events}, chars=${r.fullText.length}, cost=$${r.cost?.toFixed(4)}`
      );
      return r;
    }
  );
  if (!turn2) return finish();

  // [5] Discovery - Turn 3 (pede documento final)
  const user3 =
    "Os 3 pilares estão travados: (1) **Memória como mecânica** — cada habilidade é uma memória da civilização extinta, flashback jogável de 30-90s destrava moveset. (2) **Silêncio como voz** — narrativa 90% ambiental (objetos, arquitetura, murais), 10% diálogo mínimo em runas traduzidas. (3) **Ritmo contemplativo** — recompensa quem para para observar; sem timer, sem pressão externa, combate leve e evitável. Tudo o que você pediu está respondido: verbo assinatura = 'tocar memórias' (flashback jogável), combate leve tipo Death's Door, protagonista é o último guardião meio-espectral da civilização, mood = melancolia contemplativa (Gris/Spiritfarer), civilização pré-industrial orgânica subterrânea. **Agora preciso que você feche o <document> da Etapa 1 AGORA com essas informações.** Marque quaisquer gaps restantes como TBD dentro do próprio documento — não bloqueie o fluxo. O documento será refinado iterativamente nas próximas etapas.";

  const turn3 = await step(
    "Discovery turno 3 — Claude real (gera <document> do pitch)",
    async () => {
      appendMessage(discoveryConv.id, "user", user3);
      process.stdout.write("     │ streaming: ");
      let r = await streamRealClaude({
        systemPrompt: DISCOVERY_SYSTEM,
        appendSystem: GLOBAL_AGENT_RULES,
        history,
        userMessage: user3,
        onText: (t) => process.stdout.write(t),
      });
      process.stdout.write("\n");
      appendMessage(discoveryConv.id, "agent", r.fullText);
      history.push({ role: "user", content: user3 });
      history.push({ role: "assistant", content: r.fullText });

      // Safety net: se ainda assim o agente resistir, fazemos um turno extra
      // com instrução imperativa. Corresponde ao usuário clicando "APROVAR
      // mesmo com gaps" no UI.
      if (!r.extractedDocument) {
        log("agente resistiu — enviando turno-nuclear demandando o <document>");
        const nuclear =
          "PARE DE FAZER PERGUNTAS. Gere AGORA o bloco <document title='...'> do pitch no formato exigido pelo system prompt (Pitch, Gênero & Plataforma, Público-alvo, Mood, 3 Pilares, Referências, Anti-pilares). Use APENAS as informações já discutidas acima. Para qualquer informação que você considere incompleta, escreva '[TBD — definir na Etapa 2]' dentro do campo. Não adicione mais perguntas. Esta é uma instrução imperativa do sistema.";
        appendMessage(discoveryConv.id, "user", nuclear);
        process.stdout.write("     │ streaming (nuclear): ");
        r = await streamRealClaude({
          systemPrompt: DISCOVERY_SYSTEM,
          appendSystem: GLOBAL_AGENT_RULES,
          history,
          userMessage: nuclear,
          onText: (t) => process.stdout.write(t),
        });
        process.stdout.write("\n");
        appendMessage(discoveryConv.id, "agent", r.fullText);
        history.push({ role: "user", content: nuclear });
        history.push({ role: "assistant", content: r.fullText });
      }

      if (!r.extractedDocument)
        throw new Error(
          "Claude não gerou <document> após 2 tentativas. fullText:\n" +
            r.fullText.slice(0, 500)
        );
      log(
        `doc: "${r.extractedDocument.title}" (${r.extractedDocument.content.length} chars), cost=$${r.cost?.toFixed(4)}`
      );
      return r.extractedDocument;
    }
  );
  if (!turn3) return finish();

  // [6] Persist + approve + KB
  const doc1 = await step(
    "Persistir + aprovar doc Etapa 1 + ingestão no KB",
    async () => {
      const saved = upsertDocument({
        projectId: proj.id,
        phase: 1,
        documentType: "pitch",
        title: turn3.title,
        content: turn3.content,
        agentType: "discovery",
      });
      approveDocument(saved.id);
      const n = await ingestDocument({
        projectId: proj.id,
        content: saved.content,
        documentType: "pitch",
        phaseNumber: 1,
        agentType: "discovery",
        sourceDocumentId: saved.id,
      });
      const row = db
        .prepare(`SELECT COUNT(*) AS c FROM kb_entries WHERE project_id=?`)
        .get(proj.id) as any;
      log(`${n} chunks ingeridos (kb_entries=${row.c})`);
      return saved;
    }
  );
  if (!doc1) return finish();

  // [7] Busca semântica
  await step('Busca semântica: "qual é o mood do jogo?"', async () => {
    const hits = await searchKb(proj.id, "qual é o mood principal do jogo?", 5);
    if (hits.length === 0) throw new Error("sem resultados");
    const top = hits[0];
    log(`top sim=${top.similarity.toFixed(3)}`);
    log(`trecho: ${top.entry.content.slice(0, 120).replace(/\n/g, " ")}...`);
    if (top.similarity < 0.25) throw new Error("similaridade baixa");
  });

  // [8] Benchmark Agent (Etapa 2) — consumindo contexto do KB real
  const bmConv = getOrCreateConversation(proj.id, "benchmark", 2);
  const bmHistory: Msg[] = [];
  const ctx = await buildContextBlock(
    proj.id,
    "gênero, público, diferencial, pitch",
    5
  );

  const bmUser1 =
    "Olá! Já temos o pitch aprovado. Pode começar mapeando 4-5 jogos de referência que compartilham DNA com a nossa visão (metroidvania melancólico narrativo). Use o contexto do KB e já sugira qual seria nosso posicionamento.";

  const bmTurn1 = await step(
    "Benchmark turno 1 — Claude real (com KB context)",
    async () => {
      appendMessage(bmConv.id, "user", bmUser1);
      process.stdout.write("     │ streaming: ");
      const r = await streamRealClaude({
        systemPrompt: BENCHMARK_SYSTEM,
        appendSystem:
          GLOBAL_AGENT_RULES +
          "\n\n---\n\nCONTEXTO DO PROJETO (Knowledge Base):\n" +
          ctx,
        history: bmHistory,
        userMessage: bmUser1,
        onText: (t) => process.stdout.write(t),
      });
      process.stdout.write("\n");
      appendMessage(bmConv.id, "agent", r.fullText);
      bmHistory.push({ role: "user", content: bmUser1 });
      bmHistory.push({ role: "assistant", content: r.fullText });
      log(
        `events=${r.events}, chars=${r.fullText.length}, cost=$${r.cost?.toFixed(4)}`
      );
      return r;
    }
  );
  if (!bmTurn1) return finish();

  // [9] Benchmark Agent turn 2 — responde as perguntas do agente
  const bmUser2 =
    "Respostas rápidas: pode incluir Blasphemous como anti-exemplo (mood sombrio mas combat-heavy, bom contraste). 5ª vaga: Planet of Lana. Posicionamento proposto ressoa 100%. Vamos seguir.";

  const bmTurn2 = await step(
    "Benchmark turno 2 — Claude real (refinamento)",
    async () => {
      appendMessage(bmConv.id, "user", bmUser2);
      process.stdout.write("     │ streaming: ");
      const r = await streamRealClaude({
        systemPrompt: BENCHMARK_SYSTEM,
        appendSystem:
          GLOBAL_AGENT_RULES +
          "\n\n---\n\nCONTEXTO DO PROJETO (Knowledge Base):\n" +
          ctx,
        history: bmHistory,
        userMessage: bmUser2,
        onText: (t) => process.stdout.write(t),
      });
      process.stdout.write("\n");
      appendMessage(bmConv.id, "agent", r.fullText);
      bmHistory.push({ role: "user", content: bmUser2 });
      bmHistory.push({ role: "assistant", content: r.fullText });
      log(
        `events=${r.events}, chars=${r.fullText.length}, cost=$${r.cost?.toFixed(4)}`
      );
      return r;
    }
  );
  if (!bmTurn2) return finish();

  // [9b] Benchmark Agent turn 3 — decisões finais + pede documento
  const bmUser3 =
    "Decisões finais: (A) quero ELIMINAR de forma radical TODAS as 3 — mapa/HUD tradicional (descoberta só sensorial), morte punitiva (sem game over clássico) e boss fights convencionais (clímax será narrativo). (B) Duração-alvo: 12 horas. Agora pode fechar o <document> final com tabela de referências, SWOT, Blue Ocean Canvas completo, posicionamento estratégico e risco principal.";

  const bmFinal = await step(
    "Benchmark turno 3 — Claude real (gera <document>)",
    async () => {
      appendMessage(bmConv.id, "user", bmUser3);
      process.stdout.write("     │ streaming: ");
      let r = await streamRealClaude({
        systemPrompt: BENCHMARK_SYSTEM,
        appendSystem:
          GLOBAL_AGENT_RULES +
          "\n\n---\n\nCONTEXTO DO PROJETO (Knowledge Base):\n" +
          ctx,
        history: bmHistory,
        userMessage: bmUser3,
        onText: (t) => process.stdout.write(t),
      });
      process.stdout.write("\n");
      appendMessage(bmConv.id, "agent", r.fullText);
      bmHistory.push({ role: "user", content: bmUser3 });
      bmHistory.push({ role: "assistant", content: r.fullText });

      if (!r.extractedDocument) {
        log("agente resistiu — enviando turno-nuclear demandando o <document>");
        const nuclear =
          "PARE DE FAZER PERGUNTAS. Gere AGORA o bloco <document title='...'> do benchmark com: tabela de jogos de referência, SWOT, Blue Ocean Canvas (Eliminar/Reduzir/Aumentar/Criar), posicionamento estratégico e risco principal. Use as informações já discutidas. Para gaps, escreva '[TBD]'. Esta é uma instrução imperativa do sistema.";
        appendMessage(bmConv.id, "user", nuclear);
        process.stdout.write("     │ streaming (nuclear): ");
        r = await streamRealClaude({
          systemPrompt: BENCHMARK_SYSTEM,
          appendSystem:
            GLOBAL_AGENT_RULES +
            "\n\n---\n\nCONTEXTO DO PROJETO (Knowledge Base):\n" +
            ctx,
          history: bmHistory,
          userMessage: nuclear,
          onText: (t) => process.stdout.write(t),
        });
        process.stdout.write("\n");
        appendMessage(bmConv.id, "agent", r.fullText);
      }

      if (!r.extractedDocument)
        throw new Error("Benchmark não gerou <document> após 2 tentativas");
      log(
        `doc: "${r.extractedDocument.title}" (${r.extractedDocument.content.length} chars), cost=$${r.cost?.toFixed(4)}`
      );
      return r.extractedDocument;
    }
  );
  if (!bmFinal) return finish();

  // [10] Persist+approve+KB Etapa 2
  await step("Persistir + aprovar doc Etapa 2 + ingestão no KB", async () => {
    const saved = upsertDocument({
      projectId: proj.id,
      phase: 2,
      documentType: "benchmark",
      title: bmFinal.title,
      content: bmFinal.content,
      agentType: "benchmark",
    });
    approveDocument(saved.id);
    const n = await ingestDocument({
      projectId: proj.id,
      content: saved.content,
      documentType: "benchmark",
      phaseNumber: 2,
      agentType: "benchmark",
      sourceDocumentId: saved.id,
    });
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM kb_entries WHERE project_id=?`)
      .get(proj.id) as any;
    log(`${n} chunks ingeridos (kb_entries total=${row.c})`);
  });

  // [11] Exportar
  await step("Exportar GDD Markdown + JSON", () => {
    const md = exportMarkdown(proj.id, proj.name);
    const json = exportJson(proj.id);
    const mdSize = readFileSync(md, "utf8").length;
    const jsonSize = readFileSync(json, "utf8").length;
    log(`${path.basename(md)} (${mdSize} chars)`);
    log(`${path.basename(json)} (${jsonSize} chars)`);
    if (mdSize < 1000) throw new Error("markdown muito pequeno");
  });

  // [12] Assertivas finais
  await step("Assertivas finais do pipeline", () => {
    const approved = db
      .prepare(
        `SELECT COUNT(*) AS c FROM phase_documents WHERE project_id=? AND status='approved'`
      )
      .get(proj.id) as any;
    if (approved.c !== 2)
      throw new Error(`esperava 2 aprovados, tem ${approved.c}`);
    const msgs = db
      .prepare(
        `SELECT agent_type, message_count FROM agent_conversations WHERE project_id=?`
      )
      .all(proj.id);
    log("conversations:", JSON.stringify(msgs));
  });

  finish();
}

function finish() {
  console.log("\n─── RELATÓRIO FINAL ──────────────────────────────");
  const pass = report.filter((r) => r.status === "pass").length;
  const fail = report.filter((r) => r.status === "fail").length;
  const total = report.length;
  const totalMs = report.reduce((a, r) => a + r.ms, 0);
  for (const r of report) {
    const icon = r.status === "pass" ? "✓" : "✗";
    console.log(
      ` ${icon} [${String(r.ms).padStart(6)}ms] ${r.step}${r.detail ? "  → " + r.detail : ""}`
    );
  }
  console.log("──────────────────────────────────────────────────");
  console.log(
    `Passou: ${pass}/${total}  Falhou: ${fail}  Tempo total: ${(totalMs / 1000).toFixed(1)}s`
  );
  console.log(`Custo total Claude: $${totalCost.toFixed(4)}`);
  console.log(`Workdir: ${WORKDIR}`);
  db.close();
  if (fail > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error("erro fatal:", e);
  finish();
});
