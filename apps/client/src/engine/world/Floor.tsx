import { type ThreeEvent } from '@react-three/fiber';
import { usePlayerStore } from '../../store/playerStore';
import { useToolStore } from '../../store/toolStore';
import { useGroundItemStore } from '../../systems/groundItems/groundItemStore';
import { playerTool } from '../../player/PlayerTool';
import { findPath } from './pathfinding';
import { DEFAULT_GRID, type GridConfig, worldToTile } from './WorldGrid';

interface FloorProps {
  grid?: GridConfig;
}

/**
 * Invisible interaction plane. Routes pointerdown to either:
 *   - 'move': pick up ground item if present, otherwise click-to-move pathfinding
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
      // Pick up any ground item at the clicked tile before moving.
      const groundItem = useGroundItemStore.getState().getAtTile(goal.x, goal.z);
      if (groundItem) {
        playerTool.pickupGroundItem(groundItem);
        return;
      }
      const { position, setPath } = usePlayerStore.getState();
      const start = worldToTile({ x: position.x, z: position.z }, grid);
      const path = findPath(start, goal, { grid });
      setPath(path.slice(1));
      return;
    }

    playerTool.apply(goal);
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
