import {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
  PLAYER_ACTIONS,
} from './pipeline/index.js';

import FERRAZ_DIALOGUE from '../features/npc/dialogue/ferraz';
import NINA_DIALOGUE from '../features/npc/dialogue/nina';
import DORINHA_DIALOGUE from '../features/npc/dialogue/dorinha';
import PADRE_PEDRO_DIALOGUE from '../features/npc/dialogue/padre_pedro';
import ARNALDO_DIALOGUE from '../features/npc/dialogue/arnaldo';
import SOFIA_DIALOGUE from '../features/npc/dialogue/sofia';
import ROMEU_DIALOGUE from '../features/npc/dialogue/romeu';

export interface QuickReply {
  label: string;
  input: string;
}

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export type ChoreState = 'assigned' | 'working' | 'completed';

export interface NpcDialogueConfig {
  npcId: string;
  greetings: QuickReply[];
  topics: Record<string, QuickReply[]>;
  shopTriggerPhrases: string[];
  choreDialogue?: ChoreDialogueLines;
}

const _greetings = new Map<string, QuickReply[]>();
const _topics = new Map<string, Record<string, QuickReply[]>>();
const _shopTriggers = new Map<string, string[]>();
const _choreDialogue = new Map<string, ChoreDialogueLines>();

export function registerNPC(config: NpcDialogueConfig): void {
  _greetings.set(config.npcId, config.greetings ?? []);
  _topics.set(config.npcId, config.topics ?? {});
  _shopTriggers.set(config.npcId, config.shopTriggerPhrases ?? []);
  if (config.choreDialogue) {
    _choreDialogue.set(config.npcId, config.choreDialogue);
  }
}

export function getGreetings(npcId: string): QuickReply[] {
  return _greetings.get(npcId) ?? [];
}

export function getTopics(npcId: string): Record<string, QuickReply[]> {
  return _topics.get(npcId) ?? {};
}

export function getShopTriggerPhrases(npcId: string): string[] {
  return _shopTriggers.get(npcId) ?? [];
}

export function isShopTrigger(npcId: string, replyText: string): boolean {
  const lower = replyText.toLowerCase();
  return getShopTriggerPhrases(npcId).some((phrase) => lower.includes(phrase));
}

/**
 * Returns a random chore dialogue line for the given NPC and chore state.
 * Returns null if the NPC has no chore dialogue registered.
 */
export function getChoreDialogue(npcId: string, state: ChoreState): string | null {
  const lines = _choreDialogue.get(npcId);
  if (!lines) return null;
  const pool = lines[state];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
  PLAYER_ACTIONS,
};

registerNPC(FERRAZ_DIALOGUE as NpcDialogueConfig);
registerNPC(NINA_DIALOGUE as NpcDialogueConfig);
registerNPC(DORINHA_DIALOGUE as NpcDialogueConfig);
registerNPC(PADRE_PEDRO_DIALOGUE as NpcDialogueConfig);
registerNPC(ARNALDO_DIALOGUE as NpcDialogueConfig);
registerNPC(SOFIA_DIALOGUE as NpcDialogueConfig);
registerNPC(ROMEU_DIALOGUE as NpcDialogueConfig);
