import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { NearestFilter, TextureLoader } from 'three';
import { useFarmStore } from '../../systems/farming/farmStore';
import { CROPS, stageForDayCount } from '../../systems/farming/CropDefs';
import { CROP_SPRITES, TILE_TEXTURES } from '../../content/assets';
import { BillboardSprite } from '../loader/BillboardSprite';
import { tileKey } from './pathfinding';
import { tileToWorld, type GridConfig, DEFAULT_GRID } from './WorldGrid';
import { cropGrowthGeometry } from '../../features/farming/crop';

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
 * Renders farming tiles using the OpenAI-generated tile textures (tilled or
 * watered soil), plus a Stardew-style crop sprite once the plant reaches
 * mature. Pre-mature growing plants still show a small green cone as a
 * lightweight indicator (matures get the real sprite).
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
        let mature = false;
        let stageColor: string | null = null;
        let cropId: keyof typeof CROP_SPRITES | null = null;

        let stageIndex = 0;
        let totalStages = 1;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
        } else if (tile.kind === 'planted') {
          texture = wateredTex; // planted always sits on damp soil
          const def = CROPS[tile.crop];
          const stage = stageForDayCount(def, tile.daysGrown);
          stageColor = stage.color;
          stageIndex = stage.index;
          totalStages = def.stages.length;
          mature = tile.daysGrown >= def.daysToMature;
          cropId = tile.crop as keyof typeof CROP_SPRITES;
        }

        const geo = stageColor && !mature ? cropGrowthGeometry(stageIndex, totalStages) : null;

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Textured soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>
            {/* Growing-stage cone — scales up per stage so growth is visible */}
            {stageColor && !mature && geo && (
              <mesh position={[0, geo.yOffset, 0]} castShadow>
                <coneGeometry args={[geo.radius, geo.height, geo.segments]} />
                <meshStandardMaterial color={stageColor} />
              </mesh>
            )}
            {/* Mature plant sprite */}
            {mature && cropId && CROP_SPRITES[cropId] && (
              <BillboardSprite path={CROP_SPRITES[cropId]} height={1.1} billboard={false} />
            )}
          </group>
        );
      })}
    </group>
  );
}

// Keep the export to silence the "unused" linter while we resolve dependents.
export { tileKey as _tileKey };
