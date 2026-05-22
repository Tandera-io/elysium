import { Grid } from '@react-three/drei';
import { DEFAULT_GRID, type GridConfig } from './WorldGrid';

interface TileMapProps {
  grid?: GridConfig;
}

/**
 * Renders the ground plane + a grid overlay covering the world.
 * The grid lines are an at-runtime helper; later phases swap them for
 * tile-aware textured meshes per biome.
 */
export function TileMap({ grid = DEFAULT_GRID }: TileMapProps) {
  const width = grid.width * grid.tileSize;
  const height = grid.height * grid.tileSize;

  return (
    <group>
      {/* Ground plane — a single quad colored like grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#6f9a4a" />
      </mesh>
      {/* Grid overlay (drei) */}
      <Grid
        args={[width, height]}
        cellSize={grid.tileSize}
        cellThickness={0.6}
        cellColor="#5b8038"
        sectionSize={5 * grid.tileSize}
        sectionThickness={1.2}
        sectionColor="#3d5b22"
        fadeDistance={120}
        fadeStrength={1}
        infiniteGrid={false}
        followCamera={false}
      />
    </group>
  );
}
