import {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
  PLAYER_ACTIONS,
} from './pipeline/index.js';

import FERRAZ_DIALOGUE from '../features/npc/dialogue/ferraz';
import MARINA_DIALOGUE from '../features/npc/dialogue/marina';
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

export interface NpcDialogueConfig {
  npcId: string;
  greetings: QuickReply[];
  topics: Record<string, QuickReply[]>;
  shopTriggerPhrases: string[];
}

const _greetings = new Map<string, QuickReply[]>();
const _topics = new Map<string, Record<string, QuickReply[]>>();
const _shopTriggers = new Map<string, string[]>();

export function registerNPC(config: NpcDialogueConfig): void {
  _greetings.set(config.npcId, config.greetings ?? []);
  _topics.set(config.npcId, config.topics ?? {});
  _shopTriggers.set(config.npcId, config.shopTriggerPhrases ?? []);
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

export {
  triggerDialogue,
  getActionResponse,
  getFirstMeetingLine,
  getRepeatVisitLine,
  classifyContext,
  PLAYER_ACTIONS,
};

registerNPC(FERRAZ_DIALOGUE as NpcDialogueConfig);
registerNPC(MARINA_DIALOGUE as NpcDialogueConfig);
registerNPC(NINA_DIALOGUE as NpcDialogueConfig);
registerNPC(DORINHA_DIALOGUE as NpcDialogueConfig);
registerNPC(PADRE_PEDRO_DIALOGUE as NpcDialogueConfig);
registerNPC(ARNALDO_DIALOGUE as NpcDialogueConfig);
registerNPC(SOFIA_DIALOGUE as NpcDialogueConfig);
registerNPC(ROMEU_DIALOGUE as NpcDialogueConfig);
