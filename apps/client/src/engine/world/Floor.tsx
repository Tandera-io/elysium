import { type ThreeEvent } from '@react-three/fiber';
import { usePlayerStore } from '../../store/playerStore';
import { useToolStore } from '../../store/toolStore';
import { useFarmStore } from '../../systems/farming/farmStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { useTimeStore, currentSeason } from '../../systems/time/timeStore';
import { findPath } from './pathfinding';
import { DEFAULT_GRID, type GridConfig, worldToTile } from './WorldGrid';

interface FloorProps {
  grid?: GridConfig;
}

/** Map from seed tool id to crop id and seed item id */
const SEED_TOOL_MAP: Record<string, { crop: string; seedItem: string }> = {
  seed_wheat: { crop: 'wheat', seedItem: 'seed_wheat' },
  seed_tomato: { crop: 'tomato', seedItem: 'seed_tomato' },
  seed_corn: { crop: 'corn', seedItem: 'seed_corn' },
  seed_pumpkin: { crop: 'pumpkin', seedItem: 'seed_pumpkin' },
  seed_strawberry: { crop: 'strawberry', seedItem: 'seed_strawberry' },
  seed_carrot: { crop: 'carrot', seedItem: 'seed_carrot' },
};

/**
 * Invisible interaction plane. Routes pointerdown to either:
 *   - 'move': click-to-move pathfinding
 *   - 'hoe' | 'water' | 'seed_*' | 'harvest': apply farm action on clicked tile
 */
export function Floor({ grid = DEFAULT_GRID }: FloorProps) {
  const width = grid.width * grid.tileSize;
  const height = grid.height * grid.tileSize;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const tool = useToolStore.getState().current;
    const goal = worldToTile({ x: e.point.x, z: e.point.z }, grid);

    if (tool === 'move') {
      const { position, setPath } = usePlayerStore.getState();
      const start = worldToTile({ x: position.x, z: position.z }, grid);
      const path = findPath(start, goal, { grid });
      setPath(path.slice(1));
      return;
    }

    const farm = useFarmStore.getState();
    const inv = useInventoryStore.getState();
    const timeState = useTimeStore.getState();
    const season = currentSeason(timeState);

    if (tool === 'hoe') {
      farm.till(goal);
    } else if (tool === 'water') {
      farm.water(goal);
    } else if (tool === 'harvest') {
      const yieldVal = farm.harvest(goal);
      if (yieldVal) inv.add(yieldVal.crop, yieldVal.quantity);
    } else {
      // Handle all seed tools generically
      const mapping = SEED_TOOL_MAP[tool];
      if (mapping) {
        const { crop, seedItem } = mapping;
        if (inv.count(seedItem as Parameters<typeof inv.count>[0]) > 0) {
          const planted = farm.plant(goal, crop as Parameters<typeof farm.plant>[1], season);
          if (planted) {
            inv.remove(seedItem as Parameters<typeof inv.remove>[0], 1);
          }
        }
      }
    }
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={handleClick}
      visible={false}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}
