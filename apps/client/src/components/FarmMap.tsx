/**
 * FarmMap — wires up a named farm layout (from farmLayouts.ts) so its
 * pre-defined plot of tiles appears tilled in the world. Handles tool-based
 * interactions (hoe, water, seed, harvest) when the player clicks a tile.
 */

import { useCallback, useEffect } from 'react';
import { FarmField } from '../engine/world/FarmField';
import { useFarmStore } from '../systems/farming/farmStore';
import { useToolStore } from '../store/toolStore';
import { FARM_LAYOUTS } from '../data/farmLayouts';

export interface FarmMapProps {
  layoutId?: string;
}

export function FarmMap({ layoutId = 'marisa' }: FarmMapProps) {
  const till = useFarmStore((s) => s.till);
  const water = useFarmStore((s) => s.water);
  const plant = useFarmStore((s) => s.plant);
  const harvest = useFarmStore((s) => s.harvest);
  const currentTool = useToolStore((s) => s.current);

  useEffect(() => {
    const layout = FARM_LAYOUTS[layoutId];
    if (!layout) return;
    for (let dz = 0; dz < layout.height; dz++) {
      for (let dx = 0; dx < layout.width; dx++) {
        till({ x: layout.origin.x + dx, z: layout.origin.z + dz });
      }
    }
  }, [layoutId, till]);

  const handleInteract = useCallback(
    (key: string) => {
      const [xStr, zStr] = key.split(',');
      const coord = { x: Number(xStr), z: Number(zStr) };
      switch (currentTool) {
        case 'hoe':
          till(coord);
          break;
        case 'water':
          water(coord);
          break;
        case 'seed_wheat':
          plant(coord, 'wheat');
          break;
        case 'seed_tomato':
          plant(coord, 'tomato');
          break;
        case 'harvest':
          harvest(coord);
          break;
        default:
          break;
      }
    },
    [currentTool, till, water, plant, harvest],
  );

  return <FarmField onInteract={handleInteract} />;
}
