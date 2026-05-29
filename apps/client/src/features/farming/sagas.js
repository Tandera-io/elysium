/**
 * sagas.js — Farming side-effect orchestrators.
 *
 * This module implements the "saga" pattern without Redux-Saga: each exported
 * function is a pure side-effect runner that coordinates between the Zustand
 * stores (farmStore, inventoryStore) and returns a result descriptor so the
 * caller (Farm.jsx) can render feedback.
 *
 * Pattern:
 *   const result = runPlantSaga({ tile, cropId })
 *   // result: { ok: true, message: '...' } | { ok: false, reason: '...' }
 */

import { useFarmStore } from '../systems/farming/farmStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { CROPS } from '../data/crops';

// ---------------------------------------------------------------------------
// Saga result helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} message
 * @returns {{ ok: true, message: string }}
 */
function ok(message) {
  return { ok: true, message };
}

/**
 * @param {string} reason
 * @returns {{ ok: false, reason: string }}
 */
function fail(reason) {
  return { ok: false, reason };
}

// ---------------------------------------------------------------------------
// Till saga — hoe a tile so it accepts seeds
// ---------------------------------------------------------------------------

/**
 * Attempts to till the tile at `coord`.
 * Fails if the tile is already tilled or planted.
 *
 * @param {{ x: number, z: number }} coord
 * @returns {{ ok: boolean, message?: string, reason?: string }}
 */
export function runTillSaga(coord) {
  const farm = useFarmStore.getState();
  const success = farm.till(coord);
  if (!success) {
    const tile = farm.getTile(coord);
    if (tile.kind === 'tilled') return fail('Tile já está arado.');
    if (tile.kind === 'planted') return fail('Não pode arar uma plantação.');
    return fail('Não foi possível arar este tile.');
  }
  return ok('Tile arado com sucesso!');
}

// ---------------------------------------------------------------------------
// Water saga — water a tilled or planted tile
// ---------------------------------------------------------------------------

/**
 * Waters the tile at `coord`.
 * Works on tilled and planted tiles.
 *
 * @param {{ x: number, z: number }} coord
 * @returns {{ ok: boolean, message?: string, reason?: string }}
 */
export function runWaterSaga(coord) {
  const farm = useFarmStore.getState();
  const success = farm.water(coord);
  if (!success) {
    const tile = farm.getTile(coord);
    if (tile.kind === 'empty') return fail('Não é possível regar um tile vazio.');
    return fail('Não foi possível regar este tile.');
  }
  return ok('Tile regado!');
}

// ---------------------------------------------------------------------------
// Plant saga — consume a seed from inventory and plant on a tilled tile
// ---------------------------------------------------------------------------

/**
 * Attempts to plant `cropId` on the tile at `coord`.
 * Consumes 1 seed from inventory if available and tile is tilled.
 *
 * @param {{ x: number, z: number }} coord
 * @param {import('../data/crops').CropId} cropId
 * @returns {{ ok: boolean, message?: string, reason?: string }}
 */
export function runPlantSaga(coord, cropId) {
  const farm = useFarmStore.getState();
  const inv = useInventoryStore.getState();

  const tile = farm.getTile(coord);
  if (tile.kind !== 'tilled') {
    if (tile.kind === 'empty') return fail('Você precisa arar o tile primeiro.');
    if (tile.kind === 'planted') return fail('Já existe uma plantação aqui.');
    return fail('Tile não está pronto para plantio.');
  }

  const cropDef = CROPS[cropId];
  if (!cropDef) return fail(`Cultura desconhecida: ${cropId}`);

  const seedItem = cropDef.seedItem;
  const seedCount = inv.count(seedItem);
  if (seedCount < 1) {
    return fail(`Sem sementes de ${cropDef.name} no inventário.`);
  }

  // Deduct seed from inventory before planting (atomic-ish: if farm.plant
  // fails we don't refund — this shouldn't happen since we checked `tilled`).
  const removed = inv.remove(seedItem, 1);
  if (!removed) return fail('Falha ao consumir semente do inventário.');

  const planted = farm.plant(coord, cropId);
  if (!planted) {
    // Rollback: return the seed
    inv.add(seedItem, 1);
    return fail('Falha ao plantar. Semente devolvida ao inventário.');
  }

  return ok(`${cropDef.emoji} ${cropDef.name} plantado! Aguarde ${cropDef.daysToMature} dias.`);
}

// ---------------------------------------------------------------------------
// Harvest saga — harvest a mature crop and add yield to inventory
// ---------------------------------------------------------------------------

/**
 * Attempts to harvest the crop on `coord`.
 * Fails if the tile is not planted or not mature.
 *
 * @param {{ x: number, z: number }} coord
 * @returns {{ ok: boolean, message?: string, reason?: string, harvest?: { cropId: string, quantity: number } }}
 */
export function runHarvestSaga(coord) {
  const farm = useFarmStore.getState();
  const inv = useInventoryStore.getState();

  const tile = farm.getTile(coord);
  if (tile.kind !== 'planted') {
    if (tile.kind === 'tilled') return fail('Nada plantado aqui para colher.');
    if (tile.kind === 'empty') return fail('Tile vazio — nada para colher.');
    return fail('Nada para colher aqui.');
  }

  const result = farm.harvest(coord);
  if (!result) {
    const cropDef = CROPS[tile.crop];
    const remaining = cropDef ? cropDef.daysToMature - tile.daysGrown : '?';
    return fail(
      `${cropDef?.name ?? 'Plantação'} ainda não está madura. Faltam ~${remaining} dias.`,
    );
  }

  const { crop: cropId, quantity } = result;
  const cropDef = CROPS[cropId];

  // Add harvested items to inventory
  inv.add(cropId, quantity);

  return {
    ok: true,
    message: `Colheu ${quantity}x ${cropDef?.emoji ?? ''} ${cropDef?.name ?? cropId}!`,
    harvest: { cropId, quantity },
  };
}

// ---------------------------------------------------------------------------
// Convenience: dispatch a tool action by tool id
// ---------------------------------------------------------------------------

/**
 * Routes the active tool action to the correct saga.
 *
 * @param {string} toolId  - Active tool id from toolStore.
 * @param {{ x: number, z: number }} coord - Target tile.
 * @param {string} [activeCropId] - Required when toolId is 'seed_*'.
 * @returns {{ ok: boolean, message?: string, reason?: string }}
 */
export function dispatchToolAction(toolId, coord, activeCropId) {
  switch (toolId) {
    case 'hoe':
      return runTillSaga(coord);
    case 'water':
      return runWaterSaga(coord);
    case 'harvest':
      return runHarvestSaga(coord);
    default:
      if (toolId && toolId.startsWith('seed_')) {
        // e.g. 'seed_wheat' → 'wheat'
        const cropId = toolId.replace('seed_', '');
        return runPlantSaga(
          coord,
          /** @type {import('../data/crops').CropId} */ (activeCropId ?? cropId),
        );
      }
      return fail(`Ferramenta '${toolId}' não realiza ações de fazenda.`);
  }
}
