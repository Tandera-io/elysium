import type { EconomyItemId } from '../economy/itemDefs';
import type { CropId } from '../farming/CropDefs';

export type QuestStatus = 'available' | 'active' | 'ready_to_turn_in' | 'completed';
export type QuestType = 'deliver' | 'plant';

export interface Quest {
  id: string;
  giverNpcId: string;
  /** 'deliver': bring harvested items; 'plant': grow specific crop tiles. */
  questType: QuestType;
  /** Economy item associated with the quest. */
  item: EconomyItemId;
  /** For plant quests: the farming crop the player must plant. */
  cropId?: CropId;
  quantity: number;
  rewardCash: number;
  rewardReputation: number;
  status: QuestStatus;
  createdOnDay: number;
}
