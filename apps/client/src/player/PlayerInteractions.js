/**
 * PlayerInteractions — proximity-based farming action dispatcher.
 *
 * Detects when the player is standing on a farm tile and routes the active
 * tool action (hoe, seed, water, harvest) to the matching farmStore mutation.
 *
 * Key bindings (registered by mountFarmingInteractions / PlayerInteractionsProvider):
 *   E  — legacy auto-action: auto-plow an empty tile, or auto-plant first
 *         available seed on a tilled tile (no tool selection required).
 *   F  — tool-aware action: applies the hotbar-selected tool to the tile.
 *
 * Usage (React):
 *   Call mountFarmingInteractions() inside a useEffect in App.tsx and return
 *   the cleanup function it provides.
 *
 * Usage (R3F click handler):
 *   const handleTileClick = useFarmTileClick();
 *   <mesh onClick={(e) => handleTileClick(worldToTile(e.point))} />
 */

import { usePlayerStore } from '../store/playerStore';
import { useToolStore } from '../store/toolStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { worldToTile } from '../engine/world/WorldGrid';
import { FarmPlot, plowPlot, plantSeed, getPlotState, PlotState } from '../farming/FarmPlot';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ordered list of seed item ids → crop ids tried when planting (legacy path). */
const SEED_PRIORITY = [
  { itemId: 'seed_wheat', cropId: 'wheat' },
  { itemId: 'seed_tomato', cropId: 'tomato' },
  { itemId: 'seed_corn', cropId: 'corn' },
];

/**
 * Map seed tool-ids to crop ids understood by farmStore / CropDefs.
 * Extend this map when new seed tools are added to the hotbar.
 * @type {Record<string, string>}
 */
const SEED_TOOL_TO_CROP = {
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
  seed_corn: 'corn',
};

// ---------------------------------------------------------------------------
// Core tool dispatcher
// ---------------------------------------------------------------------------

/**
 * Apply the given tool to the farm tile at `coord`.
 * Returns a result object describing the outcome.
 *
 * This is the single point of truth for all player-initiated farming actions
 * and is called by both keyboard handlers and 3D click handlers.
 *
 * @param {{ x: number, z: number }} coord  Tile grid coordinates.
 * @param {string} toolId  Active tool id from toolStore.
 * @returns {{ success: boolean, action: string, reason?: string }}
 */
export function applyToolToTile(coord, toolId) {
  const plot = new FarmPlot(coord);

  // --- Hoe: UNPLOWED → PLOWED ---
  if (toolId === 'hoe') {
    if (plot.state !== PlotState.UNPLOWED) {
      return { success: false, action: 'plow', reason: 'tile_already_tilled' };
    }
    const ok = plot.plow();
    return { success: ok, action: 'plow' };
  }

  // --- Watering can ---
  if (toolId === 'water') {
    if (plot.state === PlotState.UNPLOWED) {
      return { success: false, action: 'water', reason: 'tile_not_tilled' };
    }
    const ok = plot.water();
    return { success: ok, action: 'water' };
  }

  // --- Seed tools: PLOWED → SEEDED ---
  const cropId = SEED_TOOL_TO_CROP[toolId];
  if (cropId) {
    if (plot.state !== PlotState.PLOWED) {
      return { success: false, action: 'plant', reason: 'tile_not_plowed' };
    }
    const inv = useInventoryStore.getState();
    if (inv.count(toolId) < 1) {
      return { success: false, action: 'plant', reason: 'no_seeds' };
    }
    const ok = plot.plant(cropId);
    if (ok) inv.remove(toolId, 1);
    return { success: ok, action: 'plant', cropId };
  }

  // --- Harvest ---
  if (toolId === 'harvest') {
    if (plot.state !== PlotState.SEEDED) {
      return { success: false, action: 'harvest', reason: 'nothing_to_harvest' };
    }
    const result = plot.harvest();
    if (!result) {
      return { success: false, action: 'harvest', reason: 'crop_not_mature' };
    }
    useInventoryStore.getState().add(result.crop, result.quantity);
    return { success: true, action: 'harvest', result };
  }

  return { success: false, action: 'none', reason: 'wrong_tool' };
}

// ---------------------------------------------------------------------------
// Legacy helpers
// ---------------------------------------------------------------------------

/**
 * Attempt a farming interaction at the player's current world position.
 * Uses auto-seed-selection: tries seed_wheat → seed_tomato → seed_corn.
 * Returns a description of what happened, or null if nothing was done.
 * @returns {string | null}
 */
export function tryFarmInteraction() {
  const { position } = usePlayerStore.getState();
  const tile = worldToTile({ x: position.x, z: position.z });
  const state = getPlotState(tile);

  if (state === PlotState.UNPLOWED) {
    const ok = plowPlot(tile);
    return ok ? 'plowed' : null;
  }

  if (state === PlotState.PLOWED) {
    const inventory = useInventoryStore.getState();
    for (const { itemId, cropId } of SEED_PRIORITY) {
      if (inventory.count(itemId) > 0) {
        const ok = plantSeed(tile, cropId);
        if (ok) {
          inventory.remove(itemId, 1);
          return `planted:${cropId}`;
        }
      }
    }
    return null; // no seeds available
  }

  return null;
}

/**
 * Mount global keydown listeners for farming interactions.
 *   E — legacy auto-plow/plant at player position
 *   F — tool-aware: apply active hotbar tool to tile under player
 * Returns a cleanup function — pass it as the return value of useEffect.
 * @returns {() => void}
 */
export function mountFarmingInteractions() {
  function onKeyDown(e) {
    if (e.code === 'KeyE') {
      tryFarmInteraction();
      return;
    }
    if (e.code === 'KeyF') {
      const toolId = useToolStore.getState().current;
      if (toolId === 'move') return;
      const pos = usePlayerStore.getState().position;
      const coord = worldToTile({ x: pos.x, z: pos.z });
      applyToolToTile(coord, toolId);
    }
  }

  globalThis.addEventListener('keydown', onKeyDown);
  return () => globalThis.removeEventListener('keydown', onKeyDown);
}

// ---------------------------------------------------------------------------
// React / R3F hook
// ---------------------------------------------------------------------------

/**
 * Hook: returns a callback that applies the active hotbar tool to a clicked
 * tile coordinate.  Intended for use in 3D click handlers inside FarmField.
 *
 * @returns {(coord: { x: number, z: number }) => { success: boolean, action: string }}
 */
export function useFarmTileClick() {
  return (coord) => {
    const toolId = useToolStore.getState().current;
    return applyToolToTile(coord, toolId);
  };
}
