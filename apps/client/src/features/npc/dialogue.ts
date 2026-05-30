export { DORINHA_DIALOGUE, DORINHA_NPC_ID } from './dialogue/dorinha';
export type { DorinhaQuickReply } from './dialogue/dorinha';

export { NINA_DIALOGUE, NINA_NPC_ID } from './dialogue/nina';
export type { NinaQuickReply } from './dialogue/nina';

export { ARNALDO_DIALOGUE, ARNALDO_NPC_ID } from './dialogue/arnaldo';
export type { ArnaldoQuickReply } from './dialogue/arnaldo';

export { PADRE_PEDRO_DIALOGUE, PADRE_PEDRO_NPC_ID } from './dialogue/padre-pedro';
export type { PadrePedroQuickReply } from './dialogue/padre-pedro';

export { SOFIA_DIALOGUE, SOFIA_NPC_ID } from './dialogue/sofia';
export type { SofiaQuickReply } from './dialogue/sofia';

import DORINHA_DIALOGUE from './dialogue/dorinha';
import NINA_DIALOGUE from './dialogue/nina';
import ARNALDO_DIALOGUE from './dialogue/arnaldo';
import PADRE_PEDRO_DIALOGUE from './dialogue/padre-pedro';
import SOFIA_DIALOGUE from './dialogue/sofia';

export interface NpcQuickReply {
  label: string;
  input: string;
}

export interface NpcDialogueConfig {
  npcId: string;
  greetings: readonly NpcQuickReply[];
  topics: Readonly<Record<string, readonly NpcQuickReply[]>>;
  shopTriggerPhrases: readonly string[];
}

/** All registered NPC dialogue configs, keyed by npc id. */
export const NPC_DIALOGUE_CONFIGS: Readonly<Record<string, NpcDialogueConfig>> = {
  dorinha: DORINHA_DIALOGUE,
  nina: NINA_DIALOGUE,
  arnaldo: ARNALDO_DIALOGUE,
  'padre-pedro': PADRE_PEDRO_DIALOGUE,
  sofia: SOFIA_DIALOGUE,
};

/** Returns the dialogue config for an NPC, or null if none registered. */
export function getNpcDialogueConfig(npcId: string): NpcDialogueConfig | null {
  return NPC_DIALOGUE_CONFIGS[npcId] ?? null;
}

/** Returns true if the npc's last NPC reply contains a shop-opening trigger phrase. */
export function detectsShopTrigger(npcId: string, npcReply: string): boolean {
  const config = NPC_DIALOGUE_CONFIGS[npcId];
  if (!config) return false;
  const lower = npcReply.toLowerCase();
  return config.shopTriggerPhrases.some((phrase) => lower.includes(phrase));
}
