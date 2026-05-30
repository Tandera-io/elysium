// apps/client/src/inventory/Item.js
//
// Item data model — defines every pickable game item and provides factory
// helpers used by Inventory.js and UI overlays.
//
// Design notes:
//   - Items are plain value objects; mutation never happens — use withQty().
//   - stackable=true  → crops, seeds (qty can be > 1 per slot)
//   - stackable=false → tools, equipment (one per slot, qty always 1)
//   - sellPrice is in gold (G).  0 means the item cannot be sold.
//   - icon is an emoji shorthand shown in slot cells when no sprite is loaded.
//
// Exported surface:
//   STACK_MAX                     — hard per-slot quantity ceiling (99)
//   ITEM_DEFS                     — registry: itemId → ItemDef
//   Item                          — value-object class
//   makeItem(itemId, qty?)        — factory: constructs an Item from the registry
//   isKnownItem(itemId)           — guard for unknown ids
//   itemName(itemId)              — localised display name (Portuguese)
//   canStack(itemIdA, itemIdB)    — true when two ids can share a slot

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STACK_MAX = 99;

// ---------------------------------------------------------------------------
// Item registry
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ItemDef
 * @property {string}  id        — unique item identifier
 * @property {string}  name      — display name (Portuguese)
 * @property {string}  icon      — emoji fallback for slot cells
 * @property {boolean} stackable — true = crops/seeds; false = tools
 * @property {number}  sellPrice — gold earned per unit when sold to a vendor (0 = not for sale)
 */

/** @type {Record<string, ItemDef>} */
export const ITEM_DEFS = {
  // ── Harvested crops ─────────────────────────────────────────────────────
  wheat: { id: 'wheat', name: 'Trigo', icon: '🌾', stackable: true, sellPrice: 50 },
  tomato: { id: 'tomato', name: 'Tomate', icon: '🍅', stackable: true, sellPrice: 60 },
  pumpkin: { id: 'pumpkin', name: 'Abóbora', icon: '🎃', stackable: true, sellPrice: 80 },
  corn: { id: 'corn', name: 'Milho', icon: '🌽', stackable: true, sellPrice: 55 },
  strawberry: { id: 'strawberry', name: 'Morango', icon: '🍓', stackable: true, sellPrice: 90 },

  // ── Seeds ────────────────────────────────────────────────────────────────
  seed_wheat: {
    id: 'seed_wheat',
    name: 'Sementes de trigo',
    icon: '🌾',
    stackable: true,
    sellPrice: 5,
  },
  seed_tomato: {
    id: 'seed_tomato',
    name: 'Sementes de tomate',
    icon: '🍅',
    stackable: true,
    sellPrice: 8,
  },
  seed_pumpkin: {
    id: 'seed_pumpkin',
    name: 'Sementes de abóbora',
    icon: '🎃',
    stackable: true,
    sellPrice: 12,
  },
  seed_corn: {
    id: 'seed_corn',
    name: 'Sementes de milho',
    icon: '🌽',
    stackable: true,
    sellPrice: 10,
  },
  seed_strawberry: {
    id: 'seed_strawberry',
    name: 'Sementes de morango',
    icon: '🍓',
    stackable: true,
    sellPrice: 15,
  },

  // ── Tools (non-stackable) ────────────────────────────────────────────────
  hoe: { id: 'hoe', name: 'Enxada', icon: '⛏️', stackable: false, sellPrice: 0 },
  watering_can: { id: 'watering_can', name: 'Regador', icon: '💧', stackable: false, sellPrice: 0 },
  scythe: { id: 'scythe', name: 'Foice', icon: '✂️', stackable: false, sellPrice: 0 },
};

// ---------------------------------------------------------------------------
// Item class
// ---------------------------------------------------------------------------

export class Item {
  /**
   * @param {Object} opts
   * @param {string}  opts.id
   * @param {string}  opts.name
   * @param {string}  opts.icon
   * @param {boolean} opts.stackable
   * @param {number}  opts.sellPrice
   * @param {number}  [opts.qty]
   */
  constructor({ id, name, icon, stackable, sellPrice, qty = 1 }) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.stackable = stackable;
    this.sellPrice = sellPrice;
    this.qty = stackable ? Math.min(qty, STACK_MAX) : 1;
  }

  /**
   * Returns a new Item with a different qty (the original is unchanged).
   *
   * @param {number} qty
   * @returns {Item}
   */
  withQty(qty) {
    return new Item({ ...this, qty });
  }

  /**
   * True when this item can be merged into the same slot as `other`.
   *
   * @param {Item} other
   * @returns {boolean}
   */
  canStackWith(other) {
    return this.stackable && other.stackable && this.id === other.id && this.qty < STACK_MAX;
  }

  /**
   * Gold value if the full stack is sold.
   *
   * @returns {number}
   */
  totalSellValue() {
    return this.sellPrice * this.qty;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Construct an Item from the registry by id.
 * Falls back to a generic unknown item if id is not registered.
 *
 * @param {string} itemId
 * @param {number} [qty]
 * @returns {Item}
 */
export function makeItem(itemId, qty = 1) {
  const def = ITEM_DEFS[itemId] ?? {
    id: itemId,
    name: itemId,
    icon: '?',
    stackable: true,
    sellPrice: 0,
  };
  return new Item({ ...def, qty });
}

/**
 * @param {string} itemId
 * @returns {boolean}
 */
export function isKnownItem(itemId) {
  return Object.prototype.hasOwnProperty.call(ITEM_DEFS, itemId);
}

/**
 * Returns the localised display name for an item id, falling back to the id itself.
 *
 * @param {string} itemId
 * @returns {string}
 */
export function itemName(itemId) {
  return ITEM_DEFS[itemId]?.name ?? itemId;
}

/**
 * True when two item ids can share a slot (both stackable and same id).
 *
 * @param {string} idA
 * @param {string} idB
 * @returns {boolean}
 */
export function canStack(idA, idB) {
  return idA === idB && (ITEM_DEFS[idA]?.stackable ?? true);
}
