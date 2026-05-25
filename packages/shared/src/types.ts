/**
 * Cross-cutting types shared between client and server.
 * Keep this module dependency-free.
 */

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  timestamp: string;
  hasMeshyKey: boolean;
  hasAnthropicKey: boolean;
  hasOpenAIKey: boolean;
  npcModel: string;
}

export interface NpcPersonality {
  core_traits: string[];
  speech_style: string;
  values: string[];
  fears: string[];
}

export interface NpcSchedule {
  from: string;
  to: string;
  location: string;
  activity: string;
}

export interface NpcEconomyRole {
  produces?: string[];
  consumes?: string[];
  shop_inventory?: string[];
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  asset?: string;
  position?: { x: number; z: number };
  personality: NpcPersonality;
  relations?: Record<string, string>;
  schedule?: NpcSchedule[];
  economy_role?: NpcEconomyRole;
}

export type NpcEmotion = 'neutral' | 'happy' | 'annoyed' | 'sad' | 'excited';

export interface WorldContext {
  hour: number;
  dayInSeason: number;
  season: string;
  year: number;
  weather?: string;
}

export interface DialogueRequest {
  npcId: string;
  playerInput: string;
  worldContext: WorldContext;
}

export interface DialogueResponse {
  npcReply: string;
  emotion: NpcEmotion;
  memorySummary: string;
  actionHint?: 'open_shop' | 'offer_quest' | 'give_item' | null;
  cached?: boolean;
}

export interface DialogueMemoryEntry {
  t: string;
  type: 'dialogue' | 'event' | 'longterm';
  with: string;
  summary: string;
  sentiment: number;
}
