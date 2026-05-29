import { useFarmStore } from './farmStore';
import { useInventoryStore } from '../inventory/inventoryStore';
import type { TileCoord } from '../../engine/world/WorldGrid';
import type { ToolId } from '../../store/toolStore';

export type InteractResult = 'ok' | 'fail' | 'noop';

/**
 * Apply the active hotbar tool to a farm tile coordinate.
 * Bridges the farmStore, inventoryStore, and toolStore without
 * any async complexity — this is the "saga" layer for farming.
 *
 * Returns:
 *   'ok'   — action succeeded
 *   'fail' — not enough inventory (e.g. no seeds)
 *   'noop' — tile not in the right state for this tool
 */
export function applyToolToTile(coord: TileCoord, tool: ToolId): InteractResult {
  const farm = useFarmStore.getState();
  const inv = useInventoryStore.getState();

  switch (tool) {
    case 'hoe':
      return farm.till(coord) ? 'ok' : 'noop';

    case 'water':
      return farm.water(coord) ? 'ok' : 'noop';

    case 'seed_wheat': {
      if (!inv.remove('seed_wheat', 1)) return 'fail';
      const planted = farm.plant(coord, 'wheat');
      if (!planted) {
        inv.add('seed_wheat', 1);
        return 'noop';
      }
      return 'ok';
    }

    case 'seed_tomato': {
      if (!inv.remove('seed_tomato', 1)) return 'fail';
      const planted = farm.plant(coord, 'tomato');
      if (!planted) {
        inv.add('seed_tomato', 1);
        return 'noop';
      }
      return 'ok';
    }

    case 'seed_corn': {
      if (!inv.remove('seed_corn', 1)) return 'fail';
      const planted = farm.plant(coord, 'corn');
      if (!planted) {
        inv.add('seed_corn', 1);
        return 'noop';
      }
      return 'ok';
    }

    case 'seed_pumpkin': {
      if (!inv.remove('seed_pumpkin', 1)) return 'fail';
      const planted = farm.plant(coord, 'pumpkin');
      if (!planted) {
        inv.add('seed_pumpkin', 1);
        return 'noop';
      }
      return 'ok';
    }

    case 'seed_strawberry': {
      if (!inv.remove('seed_strawberry', 1)) return 'fail';
      const planted = farm.plant(coord, 'strawberry');
      if (!planted) {
        inv.add('seed_strawberry', 1);
        return 'noop';
      }
      return 'ok';
    }

    case 'harvest': {
      const result = farm.harvest(coord);
      if (!result) return 'noop';
      inv.add(result.crop, result.quantity);
      return 'ok';
    }

    default:
      return 'noop';
  }
}
