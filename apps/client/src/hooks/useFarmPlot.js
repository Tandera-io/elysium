// apps/client/src/hooks/useFarmPlot.js
//
// Stateful hook that bridges the farm store + inventory store into
// a single interface for FarmPlotManager and any other UI that needs
// to interact with a selected farm tile.

import { useState, useCallback } from 'react';
import { useFarmStore, CROPS, isMature } from '../stores/farmStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';

const SEED_TO_CROP = {
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
  seed_corn: 'corn',
};

/** Returns all seed items the player currently holds (qty > 0). */
function usePlayerSeeds() {
  return useInventoryStore((s) =>
    s.slots
      .filter((slot) => slot && slot.id.startsWith('seed_') && slot.qty > 0)
      .map((slot) => ({ seedId: slot.id, cropId: SEED_TO_CROP[slot.id] ?? null, qty: slot.qty })),
  );
}

/**
 * useFarmPlot — returns state + actions for a player-selected farm tile.
 *
 * Usage:
 *   const { selectedTile, selectTile, tileState, actions } = useFarmPlot();
 */
export function useFarmPlot() {
  const [selectedCoord, setSelectedCoord] = useState(null);

  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);
  const till = useFarmStore((s) => s.till);
  const water = useFarmStore((s) => s.water);
  const plant = useFarmStore((s) => s.plant);
  const harvest = useFarmStore((s) => s.harvest);
  const advanceDay = useFarmStore((s) => s.advanceDay);

  const removeItem = useInventoryStore((s) => s.remove);
  const addItem = useInventoryStore((s) => s.add);

  const seeds = usePlayerSeeds();

  const tileKey = selectedCoord ? `${selectedCoord.x},${selectedCoord.z}` : null;
  const tileState = tileKey ? (tiles[tileKey] ?? { kind: 'empty' }) : null;

  const isHarvestable =
    tileState?.kind === 'planted' && isMature(CROPS[tileState.crop], tileState.daysGrown);

  const cropDef = tileState?.kind === 'planted' ? CROPS[tileState.crop] : null;

  const selectTile = useCallback((coord) => {
    setSelectedCoord((prev) => (prev && prev.x === coord.x && prev.z === coord.z ? null : coord));
  }, []);

  const doTill = useCallback(() => {
    if (!selectedCoord) return false;
    return till(selectedCoord);
  }, [selectedCoord, till]);

  const doWater = useCallback(() => {
    if (!selectedCoord) return false;
    return water(selectedCoord);
  }, [selectedCoord, water]);

  const doPlant = useCallback(
    (seedId) => {
      if (!selectedCoord) return false;
      const cropId = SEED_TO_CROP[seedId];
      if (!cropId) return false;
      const ok = plant(selectedCoord, cropId);
      if (ok) removeItem(seedId, 1);
      return ok;
    },
    [selectedCoord, plant, removeItem],
  );

  const doHarvest = useCallback(() => {
    if (!selectedCoord) return null;
    const result = harvest(selectedCoord);
    if (result) addItem(result.crop, result.quantity);
    return result;
  }, [selectedCoord, harvest, addItem]);

  return {
    selectedCoord,
    selectTile,
    tileState,
    isHarvestable,
    cropDef,
    seeds,
    day,
    actions: {
      till: doTill,
      water: doWater,
      plant: doPlant,
      harvest: doHarvest,
      advanceDay,
    },
  };
}
