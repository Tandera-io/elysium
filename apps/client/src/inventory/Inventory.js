import { useInventoryStore } from '../systems/inventory/inventoryStore';

/**
 * Facade over the inventory Zustand store.
 * Exposes pickup/use semantics for player interaction code.
 */
export class Inventory {
  /** @param {string} itemId @param {number} [qty] @returns {boolean} */
  pickup(itemId, qty = 1) {
    return useInventoryStore.getState().add(itemId, qty);
  }

  /** @param {string} itemId @param {number} [qty] @returns {boolean} */
  use(itemId, qty = 1) {
    return useInventoryStore.getState().remove(itemId, qty);
  }

  /** @param {string} itemId @returns {number} */
  count(itemId) {
    return useInventoryStore.getState().count(itemId);
  }

  /** @param {string} itemId @param {number} [qty] @returns {boolean} */
  hasItem(itemId, qty = 1) {
    return this.count(itemId) >= qty;
  }
}

export const inventory = new Inventory();
