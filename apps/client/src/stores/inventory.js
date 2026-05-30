/**
 * inventory.js
 *
 * Standalone JS facade over the canonical TypeScript inventory store.
 * All reactive state lives in:
 *   src/systems/inventory/inventoryStore.ts
 *
 * This file provides:
 *   1. A plain re-export of the Zustand hook for React components.
 *   2. An imperative API for non-React / legacy JS callers.
 *
 * Usage (React):
 *   import { useInventoryStore } from './stores/inventory.js';
 *   const slots = useInventoryStore(s => s.slots);
 *
 * Usage (imperative):
 *   import { addItem, removeItem, useItem, getGold } from './stores/inventory.js';
 *   addItem('wheat', 5);
 *   useItem('seed_wheat');
 */

import { useInventoryStore as _useInventoryStore } from '../systems/inventory/inventoryStore';

// -- Re-export the canonical Zustand hook ------------------------------------
export { useInventoryStore } from '../systems/inventory/inventoryStore';

// ---------------------------------------------------------------------------
// Imperative API
// ---------------------------------------------------------------------------

function _store() {
  return _useInventoryStore.getState();
}

/**
 * Add qty of item to inventory. Returns true if all items fit.
 * @param {string} id
 * @param {number} qty
 * @returns {boolean}
 */
export function addItem(id, qty) {
  return _store().add(id, qty);
}

/**
 * Remove qty of item from inventory. Returns true if removal succeeded.
 * @param {string} id
 * @param {number} qty
 * @returns {boolean}
 */
export function removeItem(id, qty) {
  return _store().remove(id, qty);
}

/**
 * Use (consume) one unit of the item at the given slot index.
 * Returns true if the slot was occupied and the item was consumed.
 * @param {number} slotIndex
 * @returns {boolean}
 */
export function useItemAtSlot(slotIndex) {
  return _store().useSlot(slotIndex);
}

/**
 * Use one unit of an item by id — consumes from the first slot that holds it.
 * Returns true if the item was found and consumed.
 * @param {string} id
 * @returns {boolean}
 */
export function useItem(id) {
  const slots = _store().slots;
  const idx = slots.findIndex((s) => s !== null && s.id === id);
  if (idx === -1) return false;
  return _store().useSlot(idx);
}

/**
 * Count total qty of an item across all slots.
 * @param {string} id
 * @returns {number}
 */
export function countItem(id) {
  return _store().count(id);
}

/**
 * Get the player's current gold.
 * @returns {number}
 */
export function getGold() {
  return _store().gold;
}

/**
 * Add gold to the player's wallet.
 * @param {number} amount
 */
export function addGold(amount) {
  _store().addGold(amount);
}

/**
 * Remove gold from the player's wallet. Returns false if insufficient funds.
 * @param {number} amount
 * @returns {boolean}
 */
export function removeGold(amount) {
  return _store().removeGold(amount);
}
