import { type ThreeEvent } from '@react-three/fiber';
import { usePlayerStore } from '../../store/playerStore';
import { findPath } from './pathfinding';
import { DEFAULT_GRID, type GridConfig, worldToTile } from './WorldGrid';

interface FloorProps {
  grid?: GridConfig;
}

/**
 * An invisible interaction plane that captures clicks for click-to-move.
 * Visible ground rendering is handled by <TileMap />.
 */
export function Floor({ grid = DEFAULT_GRID }: FloorProps) {
  const width = grid.width * grid.tileSize;
  const height = grid.height * grid.tileSize;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { position, setPath } = usePlayerStore.getState();
    const start = worldToTile({ x: position.x, z: position.z }, grid);
    const goal = worldToTile({ x: e.point.x, z: e.point.z }, grid);
    const path = findPath(start, goal, { grid });
    // Skip the start tile (we're already on it) and head straight for the rest.
    setPath(path.slice(1));
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
