import { type ThreeEvent } from '@react-three/fiber';
import { usePlayerStore } from '../../store/playerStore';
import { useToolStore } from '../../store/toolStore';
import { useFarmStore } from '../../systems/farming/farmStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { useFishingStore } from '../../systems/fishing/fishingStore';
import { useCookingStore } from '../../systems/cooking/cookingStore';
import { findPath } from './pathfinding';
import { DEFAULT_GRID, type GridConfig, worldToTile } from './WorldGrid';

/** Heuristic: world-space z > 30 units from center = water zone. */
function isWaterTile(worldZ: number): boolean {
  return worldZ > 30;
}

interface FloorProps {
  grid?: GridConfig;
}

/** Tile coordinates that contain a fireplace. */
const FIREPLACE_TILES: Array<{ x: number; z: number }> = [{ x: 5, z: 5 }];

function isFireplaceTile(x: number, z: number): boolean {
  return FIREPLACE_TILES.some((t) => t.x === x && t.z === z);
}

/**
 * Invisible interaction plane. Routes pointerdown to either:
 *   - 'move': click-to-move pathfinding
 *   - 'hoe' | 'water' | 'seed_*' | 'harvest': apply farm action on clicked tile
 *   - 'pickaxe': mine a rock at the clicked tile, drop ore into inventory
 *   - 'axe': chop a tree at the clicked tile, drop a log into inventory
 *   - fireplace tile: toggle the CookingPanel
 */
export function Floor({ grid = DEFAULT_GRID }: FloorProps) {
  const width = grid.width * grid.tileSize;
  const height = grid.height * grid.tileSize;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const tool = useToolStore.getState().current;
    const goal = worldToTile({ x: e.point.x, z: e.point.z }, grid);

    if (tool === 'move') {
      // Check for fireplace tile interaction during move mode
      if (isFireplaceTile(goal.x, goal.z)) {
        console.info('fireplace clicked');
        useCookingStore.getState().toggle();
        return;
      }

      const { position, setPath } = usePlayerStore.getState();
      const start = worldToTile({ x: position.x, z: position.z }, grid);
      const path = findPath(start, goal, { grid });
      setPath(path.slice(1));
      return;
    }

    const farm = useFarmStore.getState();
    const inv = useInventoryStore.getState();

    if (tool === 'hoe') {
      farm.till(goal);
    } else if (tool === 'water') {
      farm.water(goal);
    } else if (tool === 'seed_wheat') {
      if (inv.count('seed_wheat') > 0 && farm.plant(goal, 'wheat')) {
        inv.remove('seed_wheat', 1);
      }
    } else if (tool === 'seed_tomato') {
      if (inv.count('seed_tomato') > 0 && farm.plant(goal, 'tomato')) {
        inv.remove('seed_tomato', 1);
      }
    } else if (tool === 'harvest') {
      const yieldVal = farm.harvest(goal);
      if (yieldVal) inv.add(yieldVal.crop, yieldVal.quantity);
    } else if (tool === 'fishing_rod') {
      if (isWaterTile(e.point.z)) {
        useFishingStore.getState().openMinigame();
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
