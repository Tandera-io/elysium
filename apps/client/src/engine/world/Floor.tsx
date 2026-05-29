import { type ThreeEvent } from '@react-three/fiber';
import { usePlayerStore } from '../../store/playerStore';
import { useToolStore } from '../../store/toolStore';
import { useFarmStore } from '../../systems/farming/farmStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { findPath } from './pathfinding';
import { DEFAULT_GRID, type GridConfig, worldToTile } from './WorldGrid';

/** Energy cost per farming action. */
const FARMING_ENERGY_COST = 1;

interface FloorProps {
  grid?: GridConfig;
}

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

    const player = usePlayerStore.getState();
    if (player.energy <= 0) return;

    const farm = useFarmStore.getState();
    const inv = useInventoryStore.getState();
    let acted = false;

    if (tool === 'hoe') {
      acted = farm.till(goal);
    } else if (tool === 'water') {
      acted = farm.water(goal);
    } else if (tool === 'seed_wheat') {
      if (inv.count('seed_wheat') > 0 && farm.plant(goal, 'wheat')) {
        inv.remove('seed_wheat', 1);
        acted = true;
      }
    } else if (tool === 'seed_tomato') {
      if (inv.count('seed_tomato') > 0 && farm.plant(goal, 'tomato')) {
        inv.remove('seed_tomato', 1);
        acted = true;
      }
    } else if (tool === 'harvest') {
      const yieldVal = farm.harvest(goal);
      if (yieldVal) {
        inv.add(yieldVal.crop, yieldVal.quantity);
        acted = true;
      }
    }

    if (acted) player.drainEnergy(FARMING_ENERGY_COST);
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
