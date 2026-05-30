import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Mesh, NearestFilter, TextureLoader } from 'three';
import { useFarmStore } from '../../systems/farming/farmStore';
import { CROPS, normalizedGrowthStage, stageForDayCount } from '../../systems/farming/CropDefs';
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
 * Stage-specific cone geometry parameters for pre-mature crop visuals.
 * Each stage has a different height and base radius to show progression.
 *
 *   Stage 0 (seed):    tiny nub just peeking out of the soil
 *   Stage 1 (sprout):  short narrow shoot
 *   Stage 2 (growing): taller, wider plant silhouette
 */
const STAGE_CONE: Record<0 | 1 | 2, { radius: number; height: number; segments: number }> = {
  0: { radius: 0.06, height: 0.12, segments: 4 }, // seed — tiny bump
  1: { radius: 0.1, height: 0.28, segments: 5 }, // sprout — slim shoot
  2: { radius: 0.18, height: 0.52, segments: 6 }, // growing — bushy
};

/**
 * A ring mesh that slowly pulses in opacity to signal a harvestable crop.
 * Uses useFrame for animation without re-rendering parent React tree.
 */
function HarvestGlowRing() {
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = ringRef.current;
    if (!mesh) return;
    // Pulse opacity between 0.3 and 1.0 at ~1 Hz
    const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2));
    if (mesh.material && 'opacity' in mesh.material) {
      (mesh.material as { opacity: number }).opacity = alpha;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.28, 0.38, 20]} />
      <meshStandardMaterial color="#f5d86a" transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
}

/**
 * A tiny water-drop indicator shown above tilled watered tiles and recently-
 * watered planted tiles so the player can see at a glance which soil is wet.
 */
function WaterIndicator() {
  return (
    <mesh position={[0.28, 0.18, 0.28]}>
      <sphereGeometry args={[0.045, 6, 6]} />
      <meshStandardMaterial color="#5ad4f5" transparent opacity={0.85} />
    </mesh>
  );
}

/**
 * Renders farming tiles using the generated tile textures (tilled or watered
 * soil), plus stage-aware crop visuals that animate as crops grow:
 *
 *   - Stage 0 (seed):    tiny brown nub
 *   - Stage 1 (sprout):  narrow green cone
 *   - Stage 2 (growing): wider, taller green cone
 *   - Stage 3 (ready):   ripe sprite + pulsing gold glow ring
 *
 * Watered tiles and watered planted tiles display a small water-drop bead.
 */
export function FarmField({ grid = DEFAULT_GRID }: FarmFieldProps) {
  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);
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
        let normalizedStage: 0 | 1 | 2 | 3 = 0;
        let stageColor: string | null = null;
        let cropId: keyof typeof CROP_SPRITES | null = null;
        let showWaterDrop = false;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
          showWaterDrop = tile.watered;
        } else if (tile.kind === 'planted') {
          const isWatered = tile.lastWateredOnDay >= day - 1;
          texture = isWatered ? wateredTex : tilledTex;
          showWaterDrop = isWatered;
          const def = CROPS[tile.crop];
          const stage = stageForDayCount(def, tile.daysGrown);
          stageColor = stage.color;
          mature = tile.daysGrown >= def.daysToMature;
          normalizedStage = normalizedGrowthStage(def, tile.daysGrown);
          cropId = tile.crop as keyof typeof CROP_SPRITES;
        }

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Textured soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>

            {/* Water indicator bead — visible when soil is wet */}
            {showWaterDrop && <WaterIndicator />}

            {/* Pre-mature crop — stage-scaled cone placeholder */}
            {stageColor &&
              !mature &&
              (() => {
                const geom = STAGE_CONE[normalizedStage as 0 | 1 | 2];
                const yPos = geom.height / 2 + 0.01;
                return (
                  <mesh position={[0, yPos, 0]} castShadow>
                    <coneGeometry args={[geom.radius, geom.height, geom.segments]} />
                    <meshStandardMaterial color={stageColor} />
                  </mesh>
                );
              })()}

            {/* Harvestable crop — real sprite + animated glow ring */}
            {mature && cropId && CROP_SPRITES[cropId] && (
              <>
                <HarvestGlowRing />
                <BillboardSprite path={CROP_SPRITES[cropId]} height={1.1} billboard={false} />
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
