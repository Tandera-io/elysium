import { Grid } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { NearestFilter, RepeatWrapping, TextureLoader } from 'three';
import { TILE_TEXTURES } from '../../content/assets';
import { DEFAULT_GRID, type GridConfig } from './WorldGrid';

interface TileMapProps {
  grid?: GridConfig;
}

/**
 * Renders the ground plane: a single big quad textured with the OpenAI-generated
 * grass tile, repeated grid.width × grid.height times so each in-game tile shows
 * one full grass texture. A subtle grid overlay still rides on top for now to
 * help debugging (can be removed later).
 */
export function TileMap({ grid = DEFAULT_GRID }: TileMapProps) {
  const width = grid.width * grid.tileSize;
  const height = grid.height * grid.tileSize;

  const grassTex = useLoader(TextureLoader, `/${TILE_TEXTURES.grass}`);
  useMemo(() => {
    grassTex.wrapS = RepeatWrapping;
    grassTex.wrapT = RepeatWrapping;
    grassTex.magFilter = NearestFilter;
    grassTex.minFilter = NearestFilter;
    grassTex.repeat.set(grid.width, grid.height);
    grassTex.needsUpdate = true;
  }, [grassTex, grid.width, grid.height]);

  return (
    <group>
      {/* Tiled grass ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={grassTex} />
      </mesh>
      {/* Faint grid overlay so tiles are still readable visually */}
      <Grid
        args={[width, height]}
        cellSize={grid.tileSize}
        cellThickness={0.3}
        cellColor="#2d4a1d"
        sectionSize={5 * grid.tileSize}
        sectionThickness={0.6}
        sectionColor="#1a2e10"
        fadeDistance={120}
        fadeStrength={1}
        infiniteGrid={false}
        followCamera={false}
      />
    </group>
  );
}
