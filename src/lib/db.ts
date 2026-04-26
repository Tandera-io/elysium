// Wrapper tipado em cima de @tauri-apps/plugin-sql.
//
// Todas as operações são async. A instância do DB é lazy para evitar
// inicializações múltiplas durante HMR.

import Database from "@tauri-apps/plugin-sql";
import { nanoid } from "nanoid";
import type {
  AgentConversation,
  AgentType,
  ConversationMessage,
  GameProject,
  GeneratedAsset,
  KbEntry,
  MessageRole,
  PhaseDocument,
} from "@/types/domain";
import { isTauri } from "./utils";

let _db: Database | null = null;
let _loading: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  if (_loading) return _loading;
  if (!isTauri()) {
    throw new Error(
      "Banco SQLite requer ambiente Tauri. Rode via `npm run tauri:dev`."
    );
  }
  _loading = Database.load("sqlite:elysium.db").then((db) => {
    _db = db;
    return db;
  });
  return _loading;
}

export function uid(): string {
  return nanoid();
}

// Helper para rows de tipo any -> T tipado; o SQL já retorna JSON compatível.
async function q<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return (await db.select<T[]>(sql, params)) ?? [];
}

async function exec(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  await db.execute(sql, params);
}

// ---------- Projects ----------

export const projectsRepo = {
  async list(): Promise<GameProject[]> {
    return q<GameProject>(
      "SELECT * FROM game_projects WHERE status != 'archived' ORDER BY updated_at DESC"
    );
  },
  async get(id: string): Promise<GameProject | null> {
    const rows = await q<GameProject>(
      "SELECT * FROM game_projects WHERE id = ?",
      [id]
    );
    return rows[0] ?? null;
  },
  async create(
    name: string,
    description?: string
  ): Promise<GameProject> {
    const id = uid();
    await exec(
      `INSERT INTO game_projects (id, name, description)
       VALUES (?, ?, ?)`,
      [id, name, description ?? null]
    );
    const proj = await this.get(id);
    if (!proj) throw new Error("falha ao criar projeto");
    return proj;
  },
  async update(
    id: string,
    patch: Partial<
      Pick<GameProject, "name" | "description" | "current_phase" | "status" | "project_data">
    >
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await exec(
      `UPDATE game_projects SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  },
  async archive(id: string): Promise<void> {
    await exec(
      "UPDATE game_projects SET status = 'archived', updated_at = datetime('now') WHERE id = ?",
      [id]
    );
  },
};

// ---------- Phase documents ----------

export const documentsRepo = {
  async listByProject(projectId: string): Promise<PhaseDocument[]> {
    return q<PhaseDocument>(
      "SELECT * FROM phase_documents WHERE project_id = ? ORDER BY phase_number ASC, updated_at DESC",
      [projectId]
    );
  },
  async getByPhase(
    projectId: string,
    phase: number
  ): Promise<PhaseDocument | null> {
    const rows = await q<PhaseDocument>(
      `SELECT * FROM phase_documents
       WHERE project_id = ? AND phase_number = ?
       ORDER BY updated_at DESC LIMIT 1`,
      [projectId, phase]
    );
    return rows[0] ?? null;
  },
  async upsert(doc: {
    projectId: string;
    phase: number;
    documentType: string;
    title: string;
    content: string;
    agentType: AgentType;
    metadata?: Record<string, unknown>;
  }): Promise<PhaseDocument> {
    const existing = await this.getByPhase(doc.projectId, doc.phase);
    if (existing) {
      await exec(
        `INSERT INTO document_revisions (id, document_id, version, content, created_by_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [uid(), existing.id, existing.version, existing.content, existing.agent_type]
      );
      await exec(
        `UPDATE phase_documents
         SET content = ?, title = ?, version = version + 1, updated_at = datetime('now'), status = 'draft', metadata = ?
         WHERE id = ?`,
        [
          doc.content,
          doc.title,
          JSON.stringify(doc.metadata ?? {}),
          existing.id,
        ]
      );
      const updated = await this.getByPhase(doc.projectId, doc.phase);
      if (!updated) throw new Error("falha ao atualizar documento");
      return updated;
    }
    const id = uid();
    await exec(
      `INSERT INTO phase_documents
        (id, project_id, phase_number, document_type, title, content, agent_type, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        doc.projectId,
        doc.phase,
        doc.documentType,
        doc.title,
        doc.content,
        doc.agentType,
        JSON.stringify(doc.metadata ?? {}),
      ]
    );
    const created = await q<PhaseDocument>(
      "SELECT * FROM phase_documents WHERE id = ?",
      [id]
    );
    return created[0]!;
  },
  async setStatus(
    id: string,
    status: PhaseDocument["status"]
  ): Promise<void> {
    const ts = status === "approved" ? "datetime('now')" : "NULL";
    await exec(
      `UPDATE phase_documents
       SET status = ?, approved_at = ${ts}, updated_at = datetime('now')
       WHERE id = ?`,
      [status, id]
    );
  },
  // Grava o manifest do Asset Producer dentro de metadata (JSON merge).
  async setManifest(id: string, manifest: unknown): Promise<void> {
    const rows = await q<{ metadata: string }>(
      "SELECT metadata FROM phase_documents WHERE id = ?",
      [id]
    );
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(rows[0]?.metadata ?? "{}") ?? {};
    } catch {
      meta = {};
    }
    meta.manifest = manifest;
    await exec(
      `UPDATE phase_documents SET metadata = ?, updated_at = datetime('now') WHERE id = ?`,
      [JSON.stringify(meta), id]
    );
  },
  async getManifest(id: string): Promise<unknown | null> {
    const rows = await q<{ metadata: string }>(
      "SELECT metadata FROM phase_documents WHERE id = ?",
      [id]
    );
    try {
      const meta = JSON.parse(rows[0]?.metadata ?? "{}") ?? {};
      return (meta as any).manifest ?? null;
    } catch {
      return null;
    }
  },
};

// ---------- Agent conversations & messages ----------

export const conversationsRepo = {
  async getOrCreate(
    projectId: string,
    agentType: AgentType,
    phase: number
  ): Promise<AgentConversation> {
    const existing = await q<AgentConversation>(
      `SELECT * FROM agent_conversations
       WHERE project_id = ? AND agent_type = ? AND phase_number = ?
       LIMIT 1`,
      [projectId, agentType, phase]
    );
    if (existing[0]) return existing[0];
    const id = uid();
    await exec(
      `INSERT INTO agent_conversations
         (id, project_id, agent_type, phase_number)
       VALUES (?, ?, ?, ?)`,
      [id, projectId, agentType, phase]
    );
    const rows = await q<AgentConversation>(
      "SELECT * FROM agent_conversations WHERE id = ?",
      [id]
    );
    return rows[0]!;
  },
  async listMessages(conversationId: string): Promise<ConversationMessage[]> {
    return q<ConversationMessage>(
      `SELECT * FROM conversation_messages
       WHERE conversation_id = ?
       ORDER BY sequence_number ASC`,
      [conversationId]
    );
  },
  async appendMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationMessage> {
    const id = uid();
    const rows = await q<{ c: number }>(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 as c
       FROM conversation_messages WHERE conversation_id = ?`,
      [conversationId]
    );
    const seq = rows[0]?.c ?? 1;
    await exec(
      `INSERT INTO conversation_messages
         (id, conversation_id, role, content, metadata, sequence_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, conversationId, role, content, JSON.stringify(metadata ?? {}), seq]
    );
    await exec(
      `UPDATE agent_conversations
       SET message_count = message_count + 1
       WHERE id = ?`,
      [conversationId]
    );
    const out = await q<ConversationMessage>(
      "SELECT * FROM conversation_messages WHERE id = ?",
      [id]
    );
    return out[0]!;
  },
};

// ---------- Assets ----------

export const assetsRepo = {
  async listByProject(projectId: string): Promise<GeneratedAsset[]> {
    // Default: esconde arquivados. Use listByProjectAll() para incluir.
    return q<GeneratedAsset>(
      "SELECT * FROM generated_assets WHERE project_id = ? AND (status IS NULL OR status != 'archived') ORDER BY created_at DESC",
      [projectId]
    );
  },
  async listByProjectAll(projectId: string): Promise<GeneratedAsset[]> {
    return q<GeneratedAsset>(
      "SELECT * FROM generated_assets WHERE project_id = ? ORDER BY created_at DESC",
      [projectId]
    );
  },
  async listArchived(projectId: string): Promise<GeneratedAsset[]> {
    return q<GeneratedAsset>(
      "SELECT * FROM generated_assets WHERE project_id = ? AND status = 'archived' ORDER BY created_at DESC",
      [projectId]
    );
  },
  async archive(id: string): Promise<void> {
    await exec(
      "UPDATE generated_assets SET status = 'archived' WHERE id = ?",
      [id]
    );
  },
  async unarchive(id: string, restoredStatus: GeneratedAsset["status"] = "generated"): Promise<void> {
    await exec("UPDATE generated_assets SET status = ? WHERE id = ?", [
      restoredStatus,
      id,
    ]);
  },
  async purgeArchived(projectId: string): Promise<number> {
    const before = await q<{ c: number }>(
      "SELECT COUNT(*) as c FROM generated_assets WHERE project_id = ? AND status = 'archived'",
      [projectId]
    );
    await exec(
      "DELETE FROM generated_assets WHERE project_id = ? AND status = 'archived'",
      [projectId]
    );
    return before[0]?.c ?? 0;
  },
  async create(
    data: Omit<GeneratedAsset, "id" | "created_at" | "approved_at"> & {
      id?: string;
    }
  ): Promise<GeneratedAsset> {
    const id = data.id ?? uid();
    await exec(
      `INSERT INTO generated_assets
        (id, project_id, asset_type, file_path, file_name, prompt, prompt_hash,
         generator, status, file_size_bytes, generation_metadata, iteration_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.project_id,
        data.asset_type,
        data.file_path,
        data.file_name,
        data.prompt,
        data.prompt_hash,
        data.generator,
        data.status,
        data.file_size_bytes ?? null,
        data.generation_metadata,
        data.iteration_count,
      ]
    );
    const rows = await q<GeneratedAsset>(
      "SELECT * FROM generated_assets WHERE id = ?",
      [id]
    );
    return rows[0]!;
  },
  async findByPromptHash(
    projectId: string,
    hash: string
  ): Promise<GeneratedAsset | null> {
    const rows = await q<GeneratedAsset>(
      "SELECT * FROM generated_assets WHERE project_id = ? AND prompt_hash = ? LIMIT 1",
      [projectId, hash]
    );
    return rows[0] ?? null;
  },
  async findById(id: string): Promise<GeneratedAsset | null> {
    const rows = await q<GeneratedAsset>(
      "SELECT * FROM generated_assets WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  },
  async setStatus(
    id: string,
    status: GeneratedAsset["status"]
  ): Promise<void> {
    const ts = status === "approved" ? "datetime('now')" : "NULL";
    await exec(
      `UPDATE generated_assets
       SET status = ?, approved_at = ${ts}
       WHERE id = ?`,
      [status, id]
    );
  },
};

// ---------- KB entries (metadata; vetores em vectra) ----------

export const kbRepo = {
  async listByProject(projectId: string): Promise<KbEntry[]> {
    return q<KbEntry>(
      "SELECT * FROM kb_entries WHERE project_id = ? ORDER BY created_at DESC",
      [projectId]
    );
  },
  async insert(entry: Omit<KbEntry, "id" | "created_at">): Promise<KbEntry> {
    const id = uid();
    await exec(
      `INSERT INTO kb_entries
        (id, project_id, content, content_hash, document_type,
         phase_number, agent_type, tags, metadata, source_document_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.project_id,
        entry.content,
        entry.content_hash,
        entry.document_type,
        entry.phase_number,
        entry.agent_type,
        entry.tags,
        entry.metadata,
        entry.source_document_id,
      ]
    );
    const rows = await q<KbEntry>("SELECT * FROM kb_entries WHERE id = ?", [id]);
    return rows[0]!;
  },
  async findById(id: string): Promise<KbEntry | null> {
    const rows = await q<KbEntry>("SELECT * FROM kb_entries WHERE id = ?", [
      id,
    ]);
    return rows[0] ?? null;
  },
  async deleteByProject(projectId: string): Promise<void> {
    await exec("DELETE FROM kb_entries WHERE project_id = ?", [projectId]);
  },
};

// ---------- Settings ----------

export const settingsRepo = {
  async get(key: string): Promise<string | null> {
    const rows = await q<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = ?",
      [key]
    );
    return rows[0]?.value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    await exec(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [key, value]
    );
  },
  async all(): Promise<Record<string, string>> {
    const rows = await q<{ key: string; value: string }>(
      "SELECT key, value FROM app_settings"
    );
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
};
