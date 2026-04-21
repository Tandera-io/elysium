-- Relaxa os CHECK constraints que travavam a Expansão Narrativa (Etapas 8.1-8.8,
-- internamente phase_number 14-21). O CHECK antigo limitava a <=13 e por isso
-- INSERTs dos Specialist Writers (worldbuilder, npc_writer, bestiary_writer...)
-- falhavam silenciosamente.
--
-- SQLite não permite ALTER TABLE DROP CONSTRAINT → padrão é rename + recreate +
-- copy. Migration é idempotente: tauri-plugin-sql registra version=2 em
-- _sqlx_migrations após sucesso e não roda de novo.
--
-- Novo limite: 1..=21 (cobre 1-13 discovery + 14-21 specialist writers + folga).

PRAGMA foreign_keys = OFF;

-- ---------- game_projects.current_phase ----------
CREATE TABLE game_projects_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    current_phase INTEGER NOT NULL DEFAULT 1 CHECK (current_phase >= 1 AND current_phase <= 21),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
    project_data TEXT NOT NULL DEFAULT '{}',
    kb_vector_id TEXT
);

INSERT INTO game_projects_new (id, name, description, created_at, updated_at, current_phase, status, project_data, kb_vector_id)
SELECT id, name, description, created_at, updated_at, current_phase, status, project_data, kb_vector_id
FROM game_projects;

DROP TABLE game_projects;
ALTER TABLE game_projects_new RENAME TO game_projects;

CREATE INDEX IF NOT EXISTS idx_projects_status ON game_projects(status);

-- ---------- phase_documents.phase_number ----------
CREATE TABLE phase_documents_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    phase_number INTEGER NOT NULL CHECK (phase_number >= 1 AND phase_number <= 21),
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'approved', 'needs_revision')),
    agent_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at TEXT,
    metadata TEXT DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (project_id) REFERENCES game_projects(id) ON DELETE CASCADE
);

INSERT INTO phase_documents_new (id, project_id, phase_number, document_type, title, content, status, agent_type, created_at, updated_at, approved_at, metadata, version)
SELECT id, project_id, phase_number, document_type, title, content, status, agent_type, created_at, updated_at, approved_at, metadata, version
FROM phase_documents;

DROP TABLE phase_documents;
ALTER TABLE phase_documents_new RENAME TO phase_documents;

CREATE INDEX IF NOT EXISTS idx_docs_project ON phase_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_docs_phase ON phase_documents(project_id, phase_number);

PRAGMA foreign_keys = ON;
