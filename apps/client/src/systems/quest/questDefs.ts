import type { EconomyItemId } from '../economy/itemDefs';

export type QuestStatus = 'available' | 'active' | 'ready_to_turn_in' | 'completed';

export interface Quest {
  id: string;
  giverNpcId: string;
  /** The need the NPC has — what they want delivered. */
  item: EconomyItemId;
  quantity: number;
  rewardCash: number;
  rewardReputation: number;
  status: QuestStatus;
  createdOnDay: number;
  /** In-world request line spoken by the NPC when offering this quest. */
  offerLine?: string;
  /** Line spoken by the NPC when the player turns in the quest. */
  completeLine?: string;
}
