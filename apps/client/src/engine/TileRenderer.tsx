import { Grid } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { NearestFilter, RepeatWrapping, TextureLoader } from 'three';
import { TILE_TEXTURES } from '../content/assets';
import { useTimeStore, currentSeason, type Season } from '../systems/time/timeStore';
import { DEFAULT_GRID, type GridConfig } from './world/WorldGrid';

interface SeasonPalette {
  ground: string;
  grid: string;
  sectionGrid: string;
}

const SEASON_PALETTE: Record<Season, SeasonPalette> = {
  spring: { ground: '#b8e88a', grid: '#2d4a1d', sectionGrid: '#1a2e10' },
  summer: { ground: '#e8d870', grid: '#5a4a10', sectionGrid: '#3a3008' },
  autumn: { ground: '#c87830', grid: '#6a3010', sectionGrid: '#4a2008' },
  winter: { ground: '#d8e8f0', grid: '#204060', sectionGrid: '#102840' },
};

interface TileRendererProps {
  grid?: GridConfig;
}

export function TileRenderer({ grid = DEFAULT_GRID }: TileRendererProps) {
  const season = useTimeStore((s) => currentSeason(s));
  const palette = SEASON_PALETTE[season];
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={grassTex} color={palette.ground} />
      </mesh>
      <Grid
        args={[width, height]}
        cellSize={grid.tileSize}
        cellThickness={0.3}
        cellColor={palette.grid}
        sectionSize={5 * grid.tileSize}
        sectionThickness={0.6}
        sectionColor={palette.sectionGrid}
        fadeDistance={120}
        fadeStrength={1}
        infiniteGrid={false}
        followCamera={false}
      />
    </group>
  );
}
