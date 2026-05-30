/**
 * Inventory facade
 *
 * Provides an ergonomic imperative API over `useInventoryStore` for
 * player-interaction code (e.g. PlayerTool, NPC shops, pickup triggers).
 *
 * Usage:
 *   import { inventory } from './Inventory';
 *   inventory.pickup('seed_wheat', 3);
 *   inventory.equipFromSlot(0);
 */

import { useInventoryStore } from '../systems/inventory/inventoryStore';

class Inventory {
  /**
   * Add qty of itemId to the player's inventory.
   * Returns true if all items fit; false if inventory was full and some items
   * could not be added.
   *
   * @param {string} itemId
   * @param {number} qty
   * @returns {boolean}
   */
  pickup(itemId, qty = 1) {
    return useInventoryStore.getState().add(itemId, qty);
  }

  /**
   * Remove qty of itemId from the player's inventory.
   * Returns true if the removal succeeded; false if insufficient quantity.
   *
   * @param {string} itemId
   * @param {number} qty
   * @returns {boolean}
   */
  use(itemId, qty = 1) {
    return useInventoryStore.getState().remove(itemId, qty);
  }

  /**
   * Return the total count of itemId across all slots.
   *
   * @param {string} itemId
   * @returns {number}
   */
  count(itemId) {
    return useInventoryStore.getState().count(itemId);
  }

  /**
   * Return true if the player has at least qty of itemId.
   *
   * @param {string} itemId
   * @param {number} qty
   * @returns {boolean}
   */
  hasItem(itemId, qty = 1) {
    return this.count(itemId) >= qty;
  }

  /**
   * Equip the item in the given inventory slot as the active tool.
   * Toggles off if the slot is already equipped.
   * Returns the ItemId that became equipped, or null if unequipped / not equippable.
   *
   * @param {number} slotIndex
   * @returns {string | null}
   */
  equipFromSlot(slotIndex) {
    return useInventoryStore.getState().equipTool(slotIndex);
  }

  /**
   * Unequip the currently equipped tool, reverting to the move tool.
   */
  unequip() {
    useInventoryStore.getState().unequipTool();
  }

  /**
   * Return the index of the currently equipped slot, or null.
   *
   * @returns {number | null}
   */
  get equippedSlotIndex() {
    return useInventoryStore.getState().equippedSlotIndex;
  }

  /**
   * Return the currently equipped SlotItem, or null.
   *
   * @returns {{ id: string, qty: number } | null}
   */
  get equippedItem() {
    const state = useInventoryStore.getState();
    const idx = state.equippedSlotIndex;
    if (idx === null) return null;
    return state.slots[idx] ?? null;
  }

  /**
   * Add gold to the player's wallet.
   *
   * @param {number} amount
   */
  addGold(amount) {
    useInventoryStore.getState().addGold(amount);
  }

  /**
   * Deduct gold from the player's wallet.
   * Returns false if the player has insufficient funds.
   *
   * @param {number} amount
   * @returns {boolean}
   */
  spendGold(amount) {
    return useInventoryStore.getState().removeGold(amount);
  }

  /**
   * Return the player's current gold balance.
   *
   * @returns {number}
   */
  get gold() {
    return useInventoryStore.getState().gold;
  }
}

export const inventory = new Inventory();
export default inventory;
