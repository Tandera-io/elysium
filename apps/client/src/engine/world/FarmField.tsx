import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { NearestFilter, TextureLoader } from 'three';
import { useFarmStore } from '../../systems/farming/farmStore';
import { CROPS, stageForDayCount } from '../../systems/farming/CropDefs';
import { CROP_SPRITES, TILE_TEXTURES } from '../../content/assets';
import { BillboardSprite } from '../loader/BillboardSprite';
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
        let coneHeight = 0.4;
        let coneRadius = 0.15;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
        } else if (tile.kind === 'planted') {
          texture = wateredTex;
          const def = CROPS[tile.crop];
          const stage = stageForDayCount(def, tile.daysGrown);
          stageColor = stage.color;
          const maxStageIndex = def.stages.length - 1;
          const stageRatio = maxStageIndex > 0 ? stage.index / maxStageIndex : 0;
          coneHeight = 0.1 + stageRatio * 0.55;
          coneRadius = 0.04 + stageRatio * 0.12;
          mature = tile.daysGrown >= def.daysToMature;
          cropId = tile.crop as keyof typeof CROP_SPRITES;
        }

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Textured soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>
            {/* Growing-stage cone — scales up through each stage */}
            {stageColor && !mature && (
              <mesh position={[0, coneHeight / 2, 0]} castShadow>
                <coneGeometry args={[coneRadius, coneHeight, 6]} />
                <meshStandardMaterial color={stageColor} />
              </mesh>
            )}
            {/* Mature plant sprite with harvest-ready ring */}
            {mature && cropId && CROP_SPRITES[cropId] && (
              <>
                <BillboardSprite path={CROP_SPRITES[cropId]} height={1.1} billboard={false} />
                <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.3, 0.38, 16]} />
                  <meshStandardMaterial
                    color="#f5c842"
                    emissive="#f5c842"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

// Keep the export to silence the "unused" linter while we resolve dependents.
export { tileKey as _tileKey };
