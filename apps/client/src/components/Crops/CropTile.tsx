import { useMemo } from 'react';
import { Texture } from 'three';
import { type TileState } from '../../systems/farming/farmStore';
import { CROPS, stageForDayCount, isMature } from '../../systems/farming/CropDefs';

interface CropTileProps {
  tileState: TileState;
  position: [number, number, number];
  tileSize: number;
  tilledTex: Texture;
  wateredTex: Texture;
}

/**
 * Renders a single farm tile. Shows a tilled/watered soil plane and a simple
 * color cone placeholder for growing crops. Mature crops show a taller/brighter
 * cone until a sprite system replaces them.
 */
export function CropTile({ tileState, position, tileSize, tilledTex, wateredTex }: CropTileProps) {
  const halfSize = tileSize / 2;

  const soilTexture = useMemo(() => {
    if (tileState.kind === 'tilled') return tileState.watered ? wateredTex : tilledTex;
    if (tileState.kind === 'planted') return wateredTex;
    return tilledTex;
  }, [tileState, tilledTex, wateredTex]);

  if (tileState.kind === 'empty') return null;

  const cropVisual = (() => {
    if (tileState.kind !== 'planted') return null;
    const def = CROPS[tileState.crop];
    const stage = stageForDayCount(def, tileState.daysGrown);
    const mature = isMature(def, tileState.daysGrown);
    const height = mature
      ? tileSize * 0.8
      : tileSize * 0.3 + (stage.index / def.stages.length) * tileSize * 0.3;
    const color = stage.color;
    return { height, color };
  })();

  return (
    <group position={position}>
      {/* Soil plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[tileSize, tileSize]} />
        <meshBasicMaterial map={soilTexture} />
      </mesh>

      {/* Crop visual placeholder */}
      {cropVisual && (
        <mesh position={[0, cropVisual.height / 2, 0]}>
          <coneGeometry args={[halfSize * 0.3, cropVisual.height, 6]} />
          <meshBasicMaterial color={cropVisual.color} />
        </mesh>
      )}
    </group>
  );
}
