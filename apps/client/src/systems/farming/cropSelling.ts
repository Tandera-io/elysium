/**
 * Crop-selling utilities.
 *
 * Bridge between the farming inventory (harvested crop items) and the player's
 * gold wallet. Selling converts crop items into gold at the crop's base
 * `sellPrice` (defined in CropDefs). Seasonal scarcity modifiers can be
 * layered on top via the optional `seasonMultiplier` argument.
 *
 * Usage:
 *   const { sold, goldEarned } = sellCrops('wheat', 5, inventoryStore, inventoryStore);
 */

import { CROPS, type CropId } from './CropDefs';
import type { InventoryActions, InventoryState } from '../inventory/inventoryStore';
import type { Season } from '../time/timeStore';

/**
 * Season price modifiers for each crop.
 * Crops in-season fetch base price. Out-of-season crops (harvested before wilt,
 * or stored across seasons) fetch a reduced price — they are oversupplied
 * during their own season and spoil faster.
 *
 * Values are multipliers applied to `CropDef.sellPrice`.
 */
export const SEASON_PRICE_MOD: Partial<Record<Season, Partial<Record<CropId, number>>>> = {
  spring: {
    strawberry: 1.5, // peak season for strawberry
    carrot: 1.2,
    wheat: 1.0,
    pumpkin: 0.6, // off-season surplus
    tomato: 0.7,
    corn: 0.7,
  },
  summer: {
    tomato: 1.5,
    corn: 1.3,
    wheat: 1.2,
    strawberry: 0.7,
    pumpkin: 0.7,
    carrot: 0.8,
  },
  autumn: {
    pumpkin: 1.5,
    carrot: 1.2,
    corn: 0.8,
    wheat: 0.8,
    strawberry: 0.6,
    tomato: 0.6,
  },
  winter: {
    // Nothing grows in winter; any stored crops sell at premium
    wheat: 1.3,
    pumpkin: 1.2,
    carrot: 1.1,
    tomato: 0.9,
    strawberry: 0.8,
    corn: 0.9,
  },
};

export interface SellResult {
  cropId: CropId;
  quantity: number;
  unitPrice: number;
  goldEarned: number;
}

/**
 * Compute the effective sell price per unit for a crop in the given season.
 */
export function effectiveSellPrice(cropId: CropId, season: Season): number {
  const base = CROPS[cropId].sellPrice;
  const mod = SEASON_PRICE_MOD[season]?.[cropId] ?? 1.0;
  return Math.round(base * mod);
}

/**
 * Sell `quantity` units of `cropId` from the player's inventory.
 * Removes the items and adds the gold. Returns the transaction result, or null
 * if the player had insufficient stock.
 */
export function sellCrops(
  cropId: CropId,
  quantity: number,
  inventory: InventoryState & InventoryActions,
  season: Season,
): SellResult | null {
  const available = inventory.count(cropId);
  if (available < quantity) return null;

  const unitPrice = effectiveSellPrice(cropId, season);
  const goldEarned = unitPrice * quantity;

  const removed = inventory.remove(cropId, quantity);
  if (!removed) return null;

  inventory.addGold(goldEarned);

  return { cropId, quantity, unitPrice, goldEarned };
}

/**
 * Sell ALL of a given crop from the player's inventory.
 */
export function sellAllOfCrop(
  cropId: CropId,
  inventory: InventoryState & InventoryActions,
  season: Season,
): SellResult | null {
  const qty = inventory.count(cropId);
  if (qty === 0) return null;
  return sellCrops(cropId, qty, inventory, season);
}
