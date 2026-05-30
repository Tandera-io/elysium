import { type ThreeEvent, useLoader } from '@react-three/fiber';
import { useMemo, useState } from 'react';
import { NearestFilter, TextureLoader } from 'three';
import type { TileState } from '../systems/farming/farmStore';
import { CROPS, isMature, stageForDayCount } from '../systems/farming/CropDefs';
import { CROP_SPRITES, PLOT_SPRITES } from '../content/assets';
import { BillboardSprite } from '../engine/loader/BillboardSprite';

const TILE_Y = 0.01;

export interface FarmingPlotTileProps {
  tileKey: string;
  tile: TileState;
  worldX: number;
  worldZ: number;
  tileSize: number;
  onInteract?: (key: string) => void;
}

function usePlotTexture(url: string) {
  const tex = useLoader(TextureLoader, url);
  useMemo(() => {
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.needsUpdate = true;
  }, [tex]);
  return tex;
}

/**
 * Renders a single farming plot tile in the 3D world.
 * Shows soil texture based on TileState (empty/tilled/watered/planted).
 * Highlights on hover and calls onInteract when clicked.
 */
export function FarmingPlotTile({
  tileKey,
  tile,
  worldX,
  worldZ,
  tileSize,
  onInteract,
}: FarmingPlotTileProps) {
  const [hovered, setHovered] = useState(false);

  const emptyTex = usePlotTexture(PLOT_SPRITES.empty);
  const tilledTex = usePlotTexture(PLOT_SPRITES.tilled);
  const wateredTex = usePlotTexture(PLOT_SPRITES.watered);

  let groundTex = emptyTex;
  let stageColor: string | null = null;
  let cropId: keyof typeof CROP_SPRITES | null = null;
  let mature = false;

  if (tile.kind === 'tilled') {
    groundTex = tile.watered ? wateredTex : tilledTex;
  } else if (tile.kind === 'planted') {
    groundTex = wateredTex;
    const def = CROPS[tile.crop];
    const stage = stageForDayCount(def, tile.daysGrown);
    mature = isMature(def, tile.daysGrown);
    stageColor = stage.color;
    cropId = tile.crop as keyof typeof CROP_SPRITES;
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onInteract?.(tileKey);
  };

  return (
    <group position={[worldX, TILE_Y, worldZ]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[tileSize * 0.98, tileSize * 0.98]} />
        <meshStandardMaterial
          map={groundTex}
          emissive={hovered ? '#aaffaa' : '#000000'}
          emissiveIntensity={hovered ? 0.18 : 0}
        />
      </mesh>

      {stageColor && !mature && (
        <mesh position={[0, 0.2, 0]} castShadow onClick={handleClick}>
          <coneGeometry args={[0.15, 0.4, 6]} />
          <meshStandardMaterial color={stageColor} />
        </mesh>
      )}

      {mature && cropId && CROP_SPRITES[cropId] && (
        <BillboardSprite path={CROP_SPRITES[cropId]} height={1.1} billboard={false} />
      )}
    </group>
  );
}
