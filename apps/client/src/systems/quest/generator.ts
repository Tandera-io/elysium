import type { Actor } from '../economy/sim';
import { ITEMS, type EconomyItemId } from '../economy/itemDefs';
import type { Quest } from './questDefs';

/**
 * Inspect an NPC's economic state and propose a quest if there's a real
 * shortage (current stock below desiredStock by ≥ 3 units). Returns null
 * if the NPC is content. Pure function — easy to unit-test.
 */
export function proposeQuestFor(
  actor: Actor,
  day: number,
  options: { minDeficit?: number; rewardPerUnit?: number } = {},
): Quest | null {
  const minDeficit = options.minDeficit ?? 3;
  const rewardPerUnit = options.rewardPerUnit ?? 1.5;

  let worstItem: EconomyItemId | null = null;
  let worstDeficit = 0;
  for (const [item, desired] of Object.entries(actor.desiredStock) as [EconomyItemId, number][]) {
    if (!desired || desired <= 0) continue;
    const have = actor.stock[item] ?? 0;
    const deficit = desired - have;
    if (deficit >= minDeficit && deficit > worstDeficit) {
      worstItem = item;
      worstDeficit = deficit;
    }
  }
  if (!worstItem) return null;

  const quantity = Math.max(1, Math.ceil(worstDeficit / 2));
  const def = ITEMS[worstItem];
  const reward = Math.round(def.basePrice * quantity * rewardPerUnit);

  return {
    id: `${actor.id}-${worstItem}-d${day}`,
    giverNpcId: actor.id,
    item: worstItem,
    quantity,
    rewardCash: reward,
    rewardReputation: 1,
    status: 'available',
    createdOnDay: day,
  };
}
