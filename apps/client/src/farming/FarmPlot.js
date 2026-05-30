/**
 * FarmPlot — thin facade over the Zustand farmStore for use in
 * PlayerInteractions and other non-React contexts.
 *
 * State machine:
 *   UNPLOWED (empty) → plow() → PLOWED (tilled) → plant(seed) → SEEDED (planted)
 *
 * Each FarmPlot instance wraps a single tile coordinate and delegates all
 * mutations to the Zustand farmStore so the React render tree stays in sync.
 */

import { useFarmStore } from '../systems/farming/farmStore';

/** Mirror of the farmStore TileState kind values, typed for JS consumers. */
export const PlotState = /** @type {const} */ ({
  UNPLOWED: 'empty',
  PLOWED: 'tilled',
  SEEDED: 'planted',
});

/**
 * FarmPlot wraps one tile coordinate and exposes the UNPLOWED→PLOWED→SEEDED
 * state machine as plain methods.  Instances are lightweight — they hold only
 * the coordinate; all mutable state lives in the farmStore.
 */
export class FarmPlot {
  /**
   * @param {{ x: number, z: number }} coord  Tile grid coordinates.
   */
  constructor(coord) {
    this.coord = coord;
  }

  /**
   * Current plot state — one of PlotState.UNPLOWED | PLOWED | SEEDED.
   * @returns {string}
   */
  get state() {
    return useFarmStore.getState().getTile(this.coord).kind;
  }

  /**
   * Returns true when the tile is empty (not yet tilled).
   * @returns {boolean}
   */
  get isUnplowed() {
    return this.state === PlotState.UNPLOWED;
  }

  /**
   * Returns true when the tile has been tilled but not yet planted.
   * @returns {boolean}
   */
  get isPlowed() {
    return this.state === PlotState.PLOWED;
  }

  /**
   * Returns true when the tile has a crop planted.
   * @returns {boolean}
   */
  get isSeeded() {
    return this.state === PlotState.SEEDED;
  }

  /**
   * Attempt to plow (till) this plot.  Only succeeds when state is UNPLOWED.
   * @returns {boolean} true if the transition succeeded.
   */
  plow() {
    return useFarmStore.getState().till(this.coord);
  }

  /**
   * Attempt to plant a seed on this plot.  Only succeeds when state is PLOWED.
   * @param {string} cropId  Crop identifier, e.g. 'wheat', 'tomato'.
   * @returns {boolean} true if the transition succeeded.
   */
  plant(cropId) {
    return useFarmStore.getState().plant(this.coord, cropId);
  }

  /**
   * Water this plot.  Works on both PLOWED and SEEDED tiles.
   * @returns {boolean}
   */
  water() {
    return useFarmStore.getState().water(this.coord);
  }

  /**
   * Harvest this plot if the crop is mature.
   * @returns {{ crop: string, quantity: number } | null}
   */
  harvest() {
    return useFarmStore.getState().harvest(this.coord);
  }

  /**
   * Serialize to a plain object for debugging / logging.
   * @returns {{ x: number, z: number, state: string }}
   */
  toJSON() {
    const tile = useFarmStore.getState().getTile(this.coord);
    return { x: this.coord.x, z: this.coord.z, state: tile.kind, tile };
  }
}

// ---------------------------------------------------------------------------
// Convenience free-functions (for callers that don't need a class instance)
// ---------------------------------------------------------------------------

/**
 * Plow (till) a farm tile at grid coordinates { x, z }.
 * Returns true if the plot was successfully plowed.
 * @param {{ x: number, z: number }} coord
 * @returns {boolean}
 */
export function plowPlot(coord) {
  return useFarmStore.getState().till(coord);
}

/**
 * Plant a seed on an already-plowed tile.
 * Returns true if planting succeeded.
 * @param {{ x: number, z: number }} coord
 * @param {string} cropId  e.g. 'wheat', 'tomato'
 * @returns {boolean}
 */
export function plantSeed(coord, cropId) {
  return useFarmStore.getState().plant(coord, cropId);
}

/**
 * Return the current state string for a tile.
 * One of PlotState.UNPLOWED | PLOWED | SEEDED.
 * @param {{ x: number, z: number }} coord
 * @returns {string}
 */
export function getPlotState(coord) {
  return useFarmStore.getState().getTile(coord).kind;
}

/**
 * Create (or retrieve — all state is in the store) a FarmPlot instance for
 * the given tile coordinate.
 * @param {{ x: number, z: number }} coord
 * @returns {FarmPlot}
 */
export function getFarmPlot(coord) {
  return new FarmPlot(coord);
}
