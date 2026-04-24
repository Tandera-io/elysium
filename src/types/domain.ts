// Tipos de domínio da Elysium Build Platform. Mirram o schema SQL em
// src-tauri/migrations/001_initial.sql.

export type ProjectStatus = "in_progress" | "completed" | "archived";
export type DocumentStatus =
  | "draft"
  | "completed"
  | "approved"
  | "needs_revision";
export type ConversationStatus = "active" | "completed" | "paused";
export type MessageRole = "user" | "agent" | "system";
export type AssetType =
  | "sprite"
  | "tile"
  | "concept_art"
  | "audio"
  | "music"
  | "sfx";
export type AssetStatus =
  | "pending"
  | "generated"
  | "approved"
  | "rejected"
  | "archived";
export type Generator = "pixellab" | "elevenlabs" | "openai";

export type AgentType =
  | "discovery"
  | "benchmark"
  | "mechanics_designer"
  | "lore_writer"
  | "level_designer"
  | "art_director"
  | "audio_director"
  | "asset_producer"
  // Specialist narrative writers (Etapa 8.5 — expansão da história).
  | "worldbuilder"
  | "npc_writer"
  | "bestiary_writer"
  | "loot_writer"
  | "quest_writer"
  | "dialogue_writer"
  | "crafting_writer"
  | "exploration_writer";

export interface GameProject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  current_phase: number;
  status: ProjectStatus;
  project_data: string;
  kb_vector_id: string | null;
}

export interface PhaseDocument {
  id: string;
  project_id: string;
  phase_number: number;
  document_type: string;
  title: string;
  content: string;
  status: DocumentStatus;
  agent_type: AgentType;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  metadata: string;
  version: number;
}

export interface DocumentRevision {
  id: string;
  document_id: string;
  version: number;
  content: string;
  changes_summary: string | null;
  created_at: string;
  created_by_agent: string;
}

export interface AgentConversation {
  id: string;
  project_id: string;
  agent_type: AgentType;
  phase_number: number;
  conversation_data: string;
  status: ConversationStatus;
  started_at: string;
  completed_at: string | null;
  message_count: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata: string;
  sequence_number: number;
}

export interface GeneratedAsset {
  id: string;
  project_id: string;
  asset_type: AssetType;
  file_path: string;
  file_name: string;
  prompt: string;
  prompt_hash: string;
  generator: Generator;
  status: AssetStatus;
  created_at: string;
  approved_at: string | null;
  file_size_bytes: number | null;
  generation_metadata: string;
  iteration_count: number;
}

// F0 Concept Pipeline v2 ------------------------------------------------

export type AssetJobTier = "high" | "medium" | "low";
export type AssetJobStatus =
  | "pending"
  | "running"
  | "generated"
  | "approved"
  | "failed"
  | "skipped";
export type AssetJobCategory =
  | "character"
  | "npc"
  | "boss"
  | "enemy"
  | "creature"
  | "location"
  | "biome"
  | "poi"
  | "faction"
  | "weapon"
  | "armor"
  | "item"
  | "consumable"
  | "material";

export interface AssetJob {
  id: string;
  project_id: string;
  canon_slug: string;
  canon_entry_id: string;
  kind: string;
  tier: AssetJobTier;
  category: AssetJobCategory;
  prompt: string;
  prompt_hash: string;
  size: string;
  status: AssetJobStatus;
  attempts: number;
  last_error: string | null;
  heartbeat_at: string | null;
  asset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueSnapshot {
  total: number;
  byStatus: Record<AssetJobStatus, number>;
  byTier: Record<AssetJobTier, number>;
  currentlyRunning: string[]; // canon_slugs em execução
}

export interface KbEntry {
  id: string;
  project_id: string;
  content: string;
  content_hash: string;
  document_type: string;
  phase_number: number | null;
  agent_type: AgentType | null;
  tags: string;
  created_at: string;
  metadata: string;
  source_document_id: string | null;
}

export interface KbConnection {
  id: string;
  source_entry_id: string;
  target_entry_id: string;
  connection_type: string;
  strength: number;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}
