import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { NearestFilter, TextureLoader } from 'three';
import { useFarmStore } from '../../systems/farming/farmStore';
import { TILE_TEXTURES } from '../../content/assets';
import { CropGrowthStageSprite } from '../loader/CropGrowthStageSprite';
import { tileKey } from './pathfinding';
import { tileToWorld, type GridConfig, DEFAULT_GRID } from './WorldGrid';

const TILE_HEIGHT = 0.01;

interface FarmFieldProps {
  grid?: GridConfig;
}

function useTileTexture(path: string) {
  const tex = useLoader(TextureLoader, `/${path}`);
  useMemo(() => {
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.needsUpdate = true;
  }, [tex]);
  return tex;
}

/**
 * Renders farming tiles using the generated tile textures (tilled or watered
 * soil), plus a growth-stage sprite for every planted crop at every stage.
 * CropGrowthStageSprite handles stage→sprite mapping, height scaling, and
 * billboard rotation for all crops from seed through mature/harvest-ready.
 */
export function FarmField({ grid = DEFAULT_GRID }: FarmFieldProps) {
  const tiles = useFarmStore((s) => s.tiles);
  const size = grid.tileSize;

  const tilledTex = useTileTexture(TILE_TEXTURES.tilled);
  const wateredTex = useTileTexture(TILE_TEXTURES.watered);

  const entries = Object.entries(tiles);

  return (
    <group>
      {entries.map(([key, tile]) => {
        if (tile.kind === 'empty') return null;
        const [xStr, zStr] = key.split(',');
        const tileX = Number(xStr);
        const tileZ = Number(zStr);
        if (Number.isNaN(tileX) || Number.isNaN(tileZ)) return null;
        const world = tileToWorld({ x: tileX, z: tileZ }, grid);

        let texture = tilledTex;
        let plantedCropId: string | null = null;
        let daysGrown = 0;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
        } else if (tile.kind === 'planted') {
          // Use watered texture when the crop was watered on or after planting day
          const isWatered = tile.lastWateredOnDay >= tile.plantedOnDay;
          texture = isWatered ? wateredTex : tilledTex;
          plantedCropId = tile.crop;
          daysGrown = tile.daysGrown;
        }

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Textured soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>
            {/* Crop sprite — all growth stages including mature */}
            {plantedCropId && (
              <CropGrowthStageSprite
                cropId={plantedCropId as import('../../systems/farming/CropDefs').CropId}
                daysGrown={daysGrown}
                maxHeight={1.1}
                billboard
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

// Keep the export to silence the "unused" linter while we resolve dependents.
export { tileKey as _tileKey };
