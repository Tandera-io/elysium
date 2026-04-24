-- F0 Concept Pipeline v2 — job queue persistente.
-- Permite retomar geração após crash, dedupe por canon_slug e
-- rastreio de status individual por item.

CREATE TABLE IF NOT EXISTS asset_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    canon_slug TEXT NOT NULL,
    canon_entry_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('high', 'medium', 'low')),
    category TEXT NOT NULL,
    prompt TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    size TEXT NOT NULL DEFAULT '1024x1024',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'generated', 'approved', 'failed', 'skipped')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    heartbeat_at TEXT,
    asset_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES game_projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_project_slug ON asset_jobs(project_id, canon_slug);
CREATE INDEX IF NOT EXISTS idx_jobs_project_status ON asset_jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_heartbeat ON asset_jobs(status, heartbeat_at);
