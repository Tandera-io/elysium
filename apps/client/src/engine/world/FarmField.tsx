import { useFrame, useLoader } from '@react-three/fiber';
import { type ReactNode, useMemo, useRef } from 'react';
import { Group, NearestFilter, TextureLoader } from 'three';
import { useFarmStore } from '../../systems/farming/farmStore';
import { CROPS, stageForDayCount } from '../../systems/farming/CropDefs';
import { CROP_SPRITES, TILE_TEXTURES } from '../../content/assets';
import { BillboardSprite } from '../loader/BillboardSprite';
import { tileKey } from './pathfinding';
import { tileToWorld, type GridConfig, DEFAULT_GRID } from './WorldGrid';

const TILE_HEIGHT = 0.01;

// ---------------------------------------------------------------------------
// Per-stage cone geometry parameters — each stage gets a distinct shape.
// [radiusBottom, height] in world units.
// ---------------------------------------------------------------------------
const STAGE_CONE: Record<number, [number, number]> = {
  0: [0.07, 0.15], // seed  — tiny nub
  1: [0.1, 0.28], // sprout — slim shoot
  2: [0.14, 0.42], // young  — taller
  3: [0.18, 0.55], // mature — full size (pre-harvest)
};

// ---------------------------------------------------------------------------
// HarvestBob — wrapper that bobs the mature crop sprite up/down each frame.
// ---------------------------------------------------------------------------
interface HarvestBobProps {
  children: ReactNode;
}

function HarvestBob({ children }: HarvestBobProps) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    // Gentle sinusoidal float: ±0.06 units at ~0.9 Hz
    g.position.y = Math.sin(clock.getElapsedTime() * 5.5) * 0.06;
  });
  return <group ref={groupRef}>{children}</group>;
}

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
        let stageIndex = 0;
        let cropId: keyof typeof CROP_SPRITES | null = null;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
        } else if (tile.kind === 'planted') {
          texture = wateredTex; // planted always sits on damp soil
          const def = CROPS[tile.crop];
          const stage = stageForDayCount(def, tile.daysGrown);
          stageColor = stage.color;
          stageIndex = stage.index;
          mature = tile.daysGrown >= def.daysToMature;
          cropId = tile.crop as keyof typeof CROP_SPRITES;
        }

        // Pick cone dimensions for this growth stage (clamp to known range 0-3).
        const [coneRadius, coneHeight] = STAGE_CONE[Math.min(stageIndex, 3)] ?? [0.15, 0.4];
        // Y position so the cone sits on top of the soil quad.
        const coneY = coneHeight / 2 + TILE_HEIGHT;

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Textured soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>
            {/* Growing-stage cone — distinct size per stage */}
            {stageColor && !mature && (
              <mesh position={[0, coneY, 0]} castShadow>
                <coneGeometry args={[coneRadius, coneHeight, 6]} />
                <meshStandardMaterial color={stageColor} />
              </mesh>
            )}
            {/* Mature plant sprite — gently bobs up/down */}
            {mature && cropId && CROP_SPRITES[cropId] && (
              <HarvestBob>
                <BillboardSprite path={CROP_SPRITES[cropId]} height={1.1} billboard={false} />
              </HarvestBob>
            )}
          </group>
        );
      })}
    </group>
  );
}

// Keep the export to silence the "unused" linter while we resolve dependents.
export { tileKey as _tileKey };
