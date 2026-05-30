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
 * Visual parameters per growth stage index.
 * stage 0 = seed (tiny brown mound), 1 = sprout (small green cone),
 * 2 = growing (medium cone), 3+ = mature (full-size cone or ripe sprite).
 */
interface StageVisual {
  coneRadius: number;
  coneHeight: number;
  posY: number;
}

const STAGE_VISUALS: StageVisual[] = [
  { coneRadius: 0.06, coneHeight: 0.12, posY: 0.06 }, // 0: seed — tiny mound
  { coneRadius: 0.1, coneHeight: 0.25, posY: 0.125 }, // 1: sprout — small
  { coneRadius: 0.13, coneHeight: 0.38, posY: 0.19 }, // 2: growing — medium
  { coneRadius: 0.15, coneHeight: 0.5, posY: 0.25 }, // 3: near-mature — tall
];

function stageVisual(stageIndex: number): StageVisual {
  return STAGE_VISUALS[Math.min(stageIndex, STAGE_VISUALS.length - 1)] ?? STAGE_VISUALS[0]!;
}

/**
 * Renders farming tiles using the OpenAI-generated tile textures (tilled or
 * watered soil), plus a Stardew-style crop sprite once the plant reaches
 * mature. Pre-mature growing plants show a stage-sized colored cone as a
 * lightweight indicator that grows visually with each stage.
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
        let growthStage = 0;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
        } else if (tile.kind === 'planted') {
          texture = wateredTex; // planted always sits on damp soil
          const def = CROPS[tile.crop];
          const stage = stageForDayCount(def, tile.daysGrown);
          stageColor = stage.color;
          growthStage = tile.growthStage;
          mature = tile.daysGrown >= def.daysToMature;
          cropId = tile.crop as keyof typeof CROP_SPRITES;
        }

        const visual = stageVisual(growthStage);

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Textured soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>
            {/* Growing-stage cone: scales up with each growth stage */}
            {stageColor && !mature && (
              <mesh position={[0, visual.posY, 0]} castShadow>
                <coneGeometry args={[visual.coneRadius, visual.coneHeight, 6]} />
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
