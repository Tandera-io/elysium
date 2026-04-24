-- Expande o CHECK constraint da coluna `generator` em `generated_assets`
-- para incluir 'openai' (gpt-image como gerador alternativo de concept arts).
-- SQLite não suporta ALTER TABLE DROP CONSTRAINT → padrão rename+recreate+copy.
-- Migration é idempotente (tauri-plugin-sql registra version=3 em _sqlx_migrations).

PRAGMA foreign_keys = OFF;

CREATE TABLE generated_assets_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('sprite', 'tile', 'concept_art', 'audio', 'music', 'sfx')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    generator TEXT NOT NULL CHECK (generator IN ('pixellab', 'elevenlabs', 'openai')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'approved', 'rejected', 'archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at TEXT,
    file_size_bytes INTEGER,
    generation_metadata TEXT NOT NULL DEFAULT '{}',
    iteration_count INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (project_id) REFERENCES game_projects(id) ON DELETE CASCADE
);

INSERT INTO generated_assets_new (id, project_id, asset_type, file_path, file_name, prompt, prompt_hash, generator, status, created_at, approved_at, file_size_bytes, generation_metadata, iteration_count)
SELECT id, project_id, asset_type, file_path, file_name, prompt, prompt_hash, generator, status, created_at, approved_at, file_size_bytes, generation_metadata, iteration_count
FROM generated_assets;

DROP TABLE generated_assets;
ALTER TABLE generated_assets_new RENAME TO generated_assets;

CREATE INDEX IF NOT EXISTS idx_assets_project ON generated_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_hash ON generated_assets(prompt_hash);

PRAGMA foreign_keys = ON;
