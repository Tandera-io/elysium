// Recuperação das 13 fases aprovadas a partir de D:\Indie Game Vibe Dev\GDD.md
// (fonte preservada manualmente pelo usuário antes do incidente de cascade da
// migration 002).
//
// Uso:
//   node scripts/restore-from-gdd.cjs                 # dry-run (somente read)
//   node scripts/restore-from-gdd.cjs --write         # grava no DB
//
// O script NÃO sobrescreve phase_documents já existentes (gate de segurança).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-",
  21
);

const WRITE = process.argv.includes("--write");
const FORCE = process.argv.includes("--force"); // permite rodar mesmo com docs existentes

const APPDATA = process.env.APPDATA;
if (!APPDATA) {
  console.error("APPDATA env var não disponível.");
  process.exit(1);
}

const DB_PATH = path.join(APPDATA, "com.elysium.buildplatform", "elysium.db");
const PROJECT_ID = "x6EV8OgqQQAZR8gJL6FSI";
const GDD_PATH = path.join("D:", "Indie Game Vibe Dev", "GDD.md");

// Fatias (1-indexed inclusivo) extraídas por inspeção do GDD.md real.
// Caso o arquivo mude, reexecute uma inspeção antes de rodar --write.
const PLAN = [
  { n: 1,  docType: "pitch",            agent: "discovery",          range: [1, 85],       title: "Pitch & Visão" },
  { n: 2,  docType: "benchmark",        agent: "benchmark",          range: [86, 134],     title: "Benchmark de Mercado" },
  { n: 3,  docType: "core_loop",        agent: "mechanics_designer", range: [135, 261],    title: "Core Loop & MDA/Tetrad" },
  { n: 4,  docType: "mda_tetrad",       agent: "mechanics_designer", range: [262, 573],    title: "Engenharia de Gameplay (Sistemas & Specs)" },
  // 5+6 são combinados no GDD.md — v3 (linhas 735-864). Ambos recebem o
  // mesmo corpo, fiel ao que o usuário escreveu:
  { n: 5,  docType: "lore_world",       agent: "lore_writer",        range: [735, 864],    title: "Worldbuilding & Personagens (v3)" },
  { n: 6,  docType: "characters",       agent: "lore_writer",        range: [735, 864],    title: "Worldbuilding & Personagens (v3)" },
  { n: 7,  docType: "levels",           agent: "level_designer",     range: [866, 955],    title: "Níveis & Progressão" },
  { n: 8,  docType: "quests",           agent: "level_designer",     range: [956, 1262],   title: "Quests & Diálogos" },
  { n: 9,  docType: "art_direction",    agent: "art_director",       range: [1263, 1360],  title: "Direção de Arte" },
  { n: 10, docType: "storyboard",       agent: "art_director",       range: [1361, 1585],  title: "Storyboard & Concept Arts" },
  { n: 11, docType: "audio_direction",  agent: "audio_director",     range: [1586, 2499],  title: "Direção de Áudio" },
  { n: 12, docType: "asset_production", agent: "asset_producer",     range: [2500, 2540],  title: "Asset Sheet do Vertical Slice" },
  { n: 13, docType: "gdd_final",        agent: "asset_producer",     range: [2541, 2695],  title: "GDD Final & Roadmap" },
];

function extractSlice(lines, startLine, endLine) {
  // startLine/endLine são 1-indexed inclusivos (como no arquivo).
  const raw = lines.slice(startLine - 1, endLine);
  // Remove o cabeçalho "Etapa X —..." se for a 1ª linha não vazia.
  // Se logo abaixo houver OUTRA linha "Etapa X —..." (duplicata), remove também.
  let i = 0;
  while (i < raw.length && raw[i].trim() === "") i++;
  const isEtapaHeader = (s) => /^(etapa)\s+\d+/i.test(s.trim());
  if (i < raw.length && isEtapaHeader(raw[i])) i++;
  while (i < raw.length && raw[i].trim() === "") i++;
  if (i < raw.length && isEtapaHeader(raw[i])) i++;
  // Remove linhas em branco no final.
  let j = raw.length;
  while (j > i && raw[j - 1].trim() === "") j--;
  return raw.slice(i, j).join("\n");
}

function chunkText(text, size = 1200, overlap = 150) {
  if (text.length <= size) return [text];
  const out = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    out.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return out;
}

function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function nowSqlite() {
  return new Date().toISOString().replace("T", " ").replace(/\..+$/, "");
}

function main() {
  console.log(`[restore] mode : ${WRITE ? "WRITE" : "DRY-RUN"}${FORCE ? " (FORCE)" : ""}`);
  console.log(`[restore] db   : ${DB_PATH}`);
  console.log(`[restore] gdd  : ${GDD_PATH}\n`);

  if (!fs.existsSync(DB_PATH)) {
    console.error("DB não encontrado.");
    process.exit(1);
  }
  if (!fs.existsSync(GDD_PATH)) {
    console.error("GDD.md não encontrado.");
    process.exit(1);
  }

  const raw = fs.readFileSync(GDD_PATH, "utf8");
  const lines = raw.split(/\r?\n/);
  console.log(`[restore] GDD.md lido: ${raw.length} chars, ${lines.length} linhas.`);

  // Prepara as seções a gravar.
  const plan = [];
  for (const p of PLAN) {
    const [a, b] = p.range;
    if (b > lines.length) {
      console.warn(`  [warn] phase ${p.n}: range [${a}, ${b}] excede o arquivo (${lines.length} linhas).`);
    }
    const content = extractSlice(lines, a, b);
    plan.push({ ...p, content });
  }

  console.log(`\n[restore] Plano:`);
  for (const p of plan) {
    console.log(
      `  - phase ${String(p.n).padStart(2)}: "${p.title}"  (${p.content.length} chars, lines ${p.range[0]}-${p.range[1]})`
    );
  }

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  const proj = db
    .prepare("SELECT id, name, current_phase FROM game_projects WHERE id = ?")
    .get(PROJECT_ID);
  if (!proj) {
    console.error(`\n[restore] ABORT: projeto ${PROJECT_ID} não existe.`);
    process.exit(1);
  }
  console.log(
    `\n[restore] projeto: "${proj.name}" (current_phase=${proj.current_phase})`
  );

  const existing = db
    .prepare(
      "SELECT phase_number, COUNT(*) as c FROM phase_documents WHERE project_id = ? GROUP BY phase_number"
    )
    .all(PROJECT_ID);
  if (existing.length > 0) {
    console.log(`[restore] phase_documents existentes:`);
    for (const e of existing) console.log(`    phase ${e.phase_number}: ${e.c}`);
    if (!FORCE) {
      console.error(
        `\n[restore] ABORT: já existem phase_documents. Use --force pra apagá-los antes de restaurar.`
      );
      db.close();
      process.exit(1);
    }
  } else {
    console.log(`[restore] phase_documents existentes: 0`);
  }

  const kbCount = db
    .prepare("SELECT COUNT(*) as c FROM kb_entries WHERE project_id = ?")
    .get(PROJECT_ID);
  console.log(`[restore] kb_entries existentes: ${kbCount.c}`);

  if (!WRITE) {
    console.log(
      `\n[restore] DRY-RUN ok. Pra gravar rode: node scripts/restore-from-gdd.cjs --write${existing.length ? " --force" : ""}`
    );
    db.close();
    return;
  }

  // Backup defensivo antes de gravar.
  const ts = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const bkDir = path.join("D:", "Indie Game Vibe Dev", "backup", `_pre-restore-${ts}`);
  fs.mkdirSync(bkDir, { recursive: true });
  fs.copyFileSync(DB_PATH, path.join(bkDir, "elysium.db"));
  for (const side of ["elysium.db-shm", "elysium.db-wal"]) {
    const p = path.join(APPDATA, "com.elysium.buildplatform", side);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(bkDir, side));
  }
  console.log(`\n[restore] backup defensivo salvo em ${bkDir}`);

  const insertDoc = db.prepare(
    `INSERT INTO phase_documents
       (id, project_id, phase_number, document_type, title, content,
        status, agent_type, created_at, updated_at, approved_at,
        metadata, version)
     VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?, 1)`
  );
  const deleteDoc = db.prepare(
    `DELETE FROM phase_documents WHERE project_id = ? AND phase_number = ?`
  );
  const deleteKb = db.prepare(
    `DELETE FROM kb_entries WHERE project_id = ? AND phase_number = ?`
  );
  const insertKb = db.prepare(
    `INSERT INTO kb_entries
       (id, project_id, content, content_hash, document_type,
        phase_number, agent_type, tags, metadata, source_document_id,
        created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const now = nowSqlite();
  let docsInserted = 0;
  let chunksInserted = 0;

  const tx = db.transaction(() => {
    for (const p of plan) {
      if (FORCE) {
        deleteKb.run(PROJECT_ID, p.n);
        deleteDoc.run(PROJECT_ID, p.n);
      }
      const docId = nanoid();
      insertDoc.run(
        docId,
        PROJECT_ID,
        p.n,
        p.docType,
        p.title,
        p.content,
        p.agent,
        now,
        now,
        now,
        JSON.stringify({
          restored_from: "GDD.md",
          restored_at: now,
          restored_reason: "migration-002-cascade-wipe",
          source_lines: p.range,
        })
      );
      docsInserted++;

      const pieces = chunkText(p.content);
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        insertKb.run(
          nanoid(),
          PROJECT_ID,
          piece,
          sha256(piece),
          p.docType,
          p.n,
          p.agent,
          "[]",
          JSON.stringify({
            chunk: i,
            total: pieces.length,
            mode: "lexical",
            restored: true,
          }),
          docId,
          now
        );
        chunksInserted++;
      }
    }
  });

  tx();
  db.pragma("wal_checkpoint(FULL)");
  db.close();

  console.log(
    `\n[restore] OK: ${docsInserted} phase_documents + ${chunksInserted} kb_entries inseridos.`
  );
}

main();
