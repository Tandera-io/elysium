import type { ItemId, SlotItem } from '../systems/inventory/inventoryStore';

export declare class Inventory {
  /** Add qty of itemId to the player's inventory. Returns false if full. */
  pickup(itemId: ItemId, qty?: number): boolean;
  /** Remove qty of itemId from the player's inventory. Returns false if insufficient. */
  use(itemId: ItemId, qty?: number): boolean;
  /** Total count of itemId across all slots. */
  count(itemId: ItemId): number;
  /** True if the player has at least qty of itemId. */
  hasItem(itemId: ItemId, qty?: number): boolean;
  /**
   * Equip the item in the given slot as the active tool.
   * Toggles off if the slot is already equipped.
   * Returns the equipped ItemId, or null if unequipped / not equippable.
   */
  equipFromSlot(slotIndex: number): ItemId | null;
  /** Unequip the current tool, reverting to the move tool. */
  unequip(): void;
  /** Index of the currently equipped slot, or null. */
  readonly equippedSlotIndex: number | null;
  /** The currently equipped SlotItem, or null. */
  readonly equippedItem: SlotItem | null;
  /** Add gold to the player's wallet. */
  addGold(amount: number): void;
  /** Deduct gold. Returns false if insufficient funds. */
  spendGold(amount: number): boolean;
  /** Current gold balance. */
  readonly gold: number;
}

export declare const inventory: Inventory;
export default inventory;
