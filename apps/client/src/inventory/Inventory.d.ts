import type { ItemId } from '../systems/inventory/inventoryStore';

export class Inventory {
  pickup(itemId: ItemId, qty?: number): boolean;
  use(itemId: ItemId, qty?: number): boolean;
  count(itemId: ItemId): number;
  hasItem(itemId: ItemId, qty?: number): boolean;
}

export const inventory: Inventory;
