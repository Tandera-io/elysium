/**
 * CropGrowth — renders a crop plant above a farming tile, choosing the correct
 * sprite for each growth stage and animating it with a subtle vertical bob.
 *
 * Stage → sprite mapping (generic PLOT_SPRITES, available for all crops):
 *   stage 0  → seed.png      (small mound, barely visible)
 *   stage 1  → sprout.png    (first leaves)
 *   stage 2  → grown.png     (full plant body)
 *   stage last (mature) → CROP_SPRITES[cropId] if available, else harvestable.png
 *
 * The component is a pure R3F mesh — no DOM, no CSS.  It follows the same
 * texture-loading and billboard conventions as BillboardSprite.tsx.
 */

import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { NearestFilter, TextureLoader } from 'three';
import { CROP_SPRITES, PLOT_SPRITES } from '../../content/assets';

// ─── Stage → plot-sprite key ─────────────────────────────────────────────────
// Maps a normalised stage index (0-based, clamped to last) to the generic
// per-stage plot sprite.  Stage indices beyond 2 all collapse to 'grown'
// until the crop is mature, at which point callers should pass mature=true.
const STAGE_SPRITE_KEYS = ['seed', 'sprout', 'grown', 'grown'];

/**
 * Derive which PLOT_SPRITES key to use for a given (stageIndex, mature) pair.
 * @param {number} stageIndex  - current CropStage.index value
 * @param {boolean} mature     - true when daysGrown >= crop.daysToMature
 * @returns {keyof typeof PLOT_SPRITES}
 */
function plotSpriteKey(stageIndex, mature) {
  if (mature) return 'harvestable';
  return STAGE_SPRITE_KEYS[Math.min(stageIndex, STAGE_SPRITE_KEYS.length - 1)] ?? 'seed';
}

// ─── Per-stage display config ─────────────────────────────────────────────────
/** Visual scale (height in world units) and y-offset per logical stage group. */
const STAGE_CONFIG = [
  { height: 0.25, yOffset: 0.0 }, // seed  — tiny
  { height: 0.45, yOffset: 0.0 }, // sprout
  { height: 0.75, yOffset: 0.0 }, // grown
  { height: 1.1, yOffset: 0.0 }, // mature / harvestable
];

function stageConfig(stageIndex, mature) {
  if (mature) return STAGE_CONFIG[3];
  return STAGE_CONFIG[Math.min(stageIndex, STAGE_CONFIG.length - 2)] ?? STAGE_CONFIG[0];
}

// ─── Bob animation params ─────────────────────────────────────────────────────
const BOB_AMPLITUDE = 0.03; // world units
const BOB_SPEED = 1.4; // radians / second

// ─── Internal sprite mesh ─────────────────────────────────────────────────────
/**
 * @param {{ texture: import('three').Texture, height: number, yOffset: number, bob: boolean }} props
 */
function CropMesh({ texture, height, yOffset, bob }) {
  const meshRef = useRef(null);
  const time = useRef(0);

  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = height * aspect;

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (bob) {
      time.current += delta * BOB_SPEED;
      mesh.position.y = height / 2 + yOffset + Math.sin(time.current) * BOB_AMPLITUDE;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2 + yOffset, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.5} depthWrite />
    </mesh>
  );
}

// ─── CropGrowth (public API) ──────────────────────────────────────────────────
/**
 * Renders the above-soil plant sprite for a planted tile.
 *
 * Props:
 *   cropId      {string}  — one of 'wheat' | 'tomato' | 'pumpkin' | 'corn' | 'strawberry'
 *   stageIndex  {number}  — CropStage.index for the current day count
 *   mature      {boolean} — true when daysGrown >= crop.daysToMature
 *
 * The component loads textures at mount; the caller is responsible for only
 * rendering it when tile.kind === 'planted'.
 */
export function CropGrowth({ cropId, stageIndex, mature }) {
  // Decide which sprite path to use.
  // Mature crops use the crop-specific ripe sprite (from CROP_SPRITES) when
  // available; otherwise fall back to the generic harvestable plot sprite.
  const spritePath = useMemo(() => {
    if (mature && CROP_SPRITES[cropId]) {
      return CROP_SPRITES[cropId]; // string path, loaded with leading /
    }
    return PLOT_SPRITES[plotSpriteKey(stageIndex, mature)]; // Vite ?url — absolute
  }, [cropId, stageIndex, mature]);

  // useLoader deduplicates by path — shared textures are only fetched once.
  // CROP_SPRITES paths need the leading '/' that BillboardSprite adds; PLOT_SPRITES
  // Vite ?url values are already absolute paths.
  const loadPath = useMemo(
    () =>
      spritePath.startsWith('/') || spritePath.startsWith('http') || spritePath.startsWith('data:')
        ? spritePath
        : `/${spritePath}`,
    [spritePath],
  );

  const texture = useLoader(TextureLoader, loadPath);

  useMemo(() => {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  const { height, yOffset } = stageConfig(stageIndex, mature);
  // Bob only on non-mature growing plants (gives a "living" feel without
  // distracting from the ripe sprite the player is about to harvest).
  const bob = !mature;

  return <CropMesh texture={texture} height={height} yOffset={yOffset} bob={bob} />;
}
