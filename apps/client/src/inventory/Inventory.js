// apps/client/src/inventory/Inventory.js
//
// Inventory facade — wraps the canonical TypeScript inventoryStore and exposes
// a plain-JS API for picking up, using, and storing items.  Non-React code
// (NPC scripts, dialogue pipelines, Phaser scenes) can call these functions
// directly without touching Zustand or React hooks.
//
// Design notes:
//   - The underlying store lives in systems/inventory/inventoryStore.ts.
//     This file adds imperative helpers and item-metadata enrichment.
//   - pickUp / store both add qty to the inventory (same behaviour; two names
//     for clarity: "player walks over item" vs "buy from shop").
//   - use() consumes exactly 1 of an item (e.g. planting a seed).
//   - All write functions return a result object { ok: boolean, reason?: string }
//     so callers can surface errors in the UI without exceptions.
//
// Exported surface:
//   INVENTORY_SIZE          — maximum slot count (re-exported from store)
//   useInventoryStore       — Zustand hook (re-exported, for React components)
//   pickUp(itemId, qty?)    — add items; returns { ok, overflow }
//   store(itemId, qty?)     — alias of pickUp (semantically: buy/loot)
//   use(itemId)             — consume 1 item; returns { ok, reason? }
//   remove(itemId, qty?)    — remove qty items; returns { ok, reason? }
//   count(itemId)           — total quantity across all slots
//   swap(slotA, slotB)      — exchange two slot positions
//   isFull()                — true when every slot is occupied
//   addGold(n)              — credit gold to the player
//   removeGold(n)           — debit gold; returns { ok, reason? }
//   getSnapshot()           — plain-object copy of current inventory state
//   enrichSlots(slots)      — attach Item metadata to raw store slots

import { useInventoryStore, INVENTORY_SIZE } from '../systems/inventory/inventoryStore';
import { makeItem, itemName, ITEM_DEFS } from './Item.js';

export { useInventoryStore, INVENTORY_SIZE };

// ---------------------------------------------------------------------------
// Imperative API
// ---------------------------------------------------------------------------

/**
 * Pick up items and place them into the inventory.
 * Stacks into existing slots first, then fills empty slots.
 *
 * @param {string} itemId
 * @param {number} [qty]
 * @returns {{ ok: boolean, overflow: number }}
 *   ok=true when all items fit; ok=false + overflow>0 when inventory is full.
 */
export function pickUp(itemId, qty = 1) {
  if (qty <= 0) return { ok: true, overflow: 0 };
  const state = useInventoryStore.getState();
  const ok = state.add(itemId, qty);
  const newCount = useInventoryStore.getState().count(itemId);
  const placed = newCount - state.count(itemId) + qty; // calculate delta
  const overflow = ok ? 0 : Math.max(0, qty - placed);
  return { ok, overflow };
}

/**
 * Add items received from a shop or loot drop (semantic alias for pickUp).
 *
 * @param {string} itemId
 * @param {number} [qty]
 * @returns {{ ok: boolean, overflow: number }}
 */
export function store(itemId, qty = 1) {
  return pickUp(itemId, qty);
}

/**
 * Consume exactly 1 of an item (e.g. planting a seed, eating food).
 *
 * @param {string} itemId
 * @returns {{ ok: boolean, reason?: string }}
 */
export function use(itemId) {
  const state = useInventoryStore.getState();
  if (state.count(itemId) < 1) {
    return { ok: false, reason: `Sem ${itemName(itemId)} no inventário.` };
  }
  state.remove(itemId, 1);
  return { ok: true };
}

/**
 * Remove a specific quantity from the inventory.
 *
 * @param {string} itemId
 * @param {number} [qty]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function remove(itemId, qty = 1) {
  if (qty <= 0) return { ok: true };
  const state = useInventoryStore.getState();
  const have = state.count(itemId);
  if (have < qty) {
    return {
      ok: false,
      reason: `Faltam ${qty - have} × ${itemName(itemId)}.`,
    };
  }
  state.remove(itemId, qty);
  return { ok: true };
}

/**
 * Total quantity of itemId across all slots.
 *
 * @param {string} itemId
 * @returns {number}
 */
export function count(itemId) {
  return useInventoryStore.getState().count(itemId);
}

/**
 * Exchange the contents of two inventory slots (supports same-id merge).
 *
 * @param {number} slotA
 * @param {number} slotB
 */
export function swap(slotA, slotB) {
  useInventoryStore.getState().swap(slotA, slotB);
}

/**
 * True when every slot is occupied (no room for new unique stacks).
 *
 * @returns {boolean}
 */
export function isFull() {
  return useInventoryStore.getState().slots.every((s) => s !== null);
}

/**
 * Credit gold to the player wallet.
 *
 * @param {number} amount
 */
export function addGold(amount) {
  useInventoryStore.getState().addGold(amount);
}

/**
 * Debit gold from the player wallet.
 *
 * @param {number} amount
 * @returns {{ ok: boolean, reason?: string }}
 */
export function removeGold(amount) {
  const ok = useInventoryStore.getState().removeGold(amount);
  if (!ok) return { ok: false, reason: `Ouro insuficiente (precisa de ${amount}G).` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Snapshot & enrichment
// ---------------------------------------------------------------------------

/**
 * Returns a plain-object snapshot of the current inventory state.
 * Safe to serialize (no Proxy, no circular refs).
 *
 * @returns {{ slots: Array<{id:string,qty:number}|null>, gold: number }}
 */
export function getSnapshot() {
  const { slots, gold } = useInventoryStore.getState();
  return { slots: slots.map((s) => (s ? { ...s } : null)), gold };
}

/**
 * Attach full Item metadata to raw store slots.
 * Useful when a UI component needs icons, names, and sell prices
 * alongside the raw id/qty pairs from the store.
 *
 * @param {Array<{id:string,qty:number}|null>} slots  — from useInventoryStore
 * @returns {Array<import('./Item.js').Item|null>}
 */
export function enrichSlots(slots) {
  return slots.map((s) => (s ? makeItem(s.id, s.qty) : null));
}

/**
 * Compute total sell value of all stackable items currently in the inventory.
 * Non-sellable items (sellPrice=0) are excluded from the sum.
 *
 * @returns {number}
 */
export function totalSellValue() {
  const { slots } = useInventoryStore.getState();
  return slots.reduce((sum, s) => {
    if (!s) return sum;
    const def = ITEM_DEFS[s.id];
    return sum + (def ? def.sellPrice * s.qty : 0);
  }, 0);
}
