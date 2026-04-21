-- Elysium Build Platform - Schema inicial
-- App mono-usuário local; entidade User removida (sessão = disco do usuário).

CREATE TABLE IF NOT EXISTS game_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    current_phase INTEGER NOT NULL DEFAULT 1 CHECK (current_phase >= 1 AND current_phase <= 13),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
    project_data TEXT NOT NULL DEFAULT '{}',
    kb_vector_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON game_projects(status);

CREATE TABLE IF NOT EXISTS phase_documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    phase_number INTEGER NOT NULL CHECK (phase_number >= 1 AND phase_number <= 13),
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

CREATE INDEX IF NOT EXISTS idx_docs_project ON phase_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_docs_phase ON phase_documents(project_id, phase_number);

CREATE TABLE IF NOT EXISTS document_revisions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    changes_summary TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by_agent TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES phase_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revs_doc ON document_revisions(document_id);

CREATE TABLE IF NOT EXISTS agent_conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    phase_number INTEGER NOT NULL,
    conversation_data TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    message_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES game_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conv_project ON agent_conversations(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unique_phase
    ON agent_conversations(project_id, agent_type, phase_number);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    sequence_number INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_msgs_conv ON conversation_messages(conversation_id, sequence_number);

CREATE TABLE IF NOT EXISTS generated_assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('sprite', 'tile', 'concept_art', 'audio', 'music', 'sfx')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    generator TEXT NOT NULL CHECK (generator IN ('pixellab', 'elevenlabs')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'approved', 'rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at TEXT,
    file_size_bytes INTEGER,
    generation_metadata TEXT DEFAULT '{}',
    iteration_count INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (project_id) REFERENCES game_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_project ON generated_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_hash ON generated_assets(prompt_hash);

CREATE TABLE IF NOT EXISTS kb_entries (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    document_type TEXT NOT NULL,
    phase_number INTEGER,
    agent_type TEXT,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    source_document_id TEXT,
    FOREIGN KEY (project_id) REFERENCES game_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_project ON kb_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_kb_hash ON kb_entries(content_hash);

CREATE TABLE IF NOT EXISTS kb_connections (
    id TEXT PRIMARY KEY,
    source_entry_id TEXT NOT NULL,
    target_entry_id TEXT NOT NULL,
    connection_type TEXT NOT NULL,
    strength REAL NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_entry_id) REFERENCES kb_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (target_entry_id) REFERENCES kb_entries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_usage_metrics (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    api_provider TEXT NOT NULL CHECK (api_provider IN ('claude', 'pixellab', 'elevenlabs')),
    endpoint TEXT NOT NULL,
    tokens_used INTEGER,
    cost_usd REAL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    response_time_ms INTEGER,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout'))
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
