import type { Texture } from 'three';
import type { TileState } from '../../systems/farming/farmStore';
import { CROPS, stageForDayCount } from '../../systems/farming/CropDefs';
import { CROP_SPRITES } from '../../content/assets';
import { BillboardSprite } from '../../engine/loader/BillboardSprite';

interface CropTileProps {
  tileState: TileState;
  position: [number, number, number];
  tileSize: number;
  tilledTex: Texture;
  wateredTex: Texture;
}

export function CropTile({ tileState, position, tileSize, tilledTex, wateredTex }: CropTileProps) {
  if (tileState.kind === 'empty') return null;

  let texture = tilledTex;
  let mature = false;
  let stageColor: string | null = null;
  let cropId: keyof typeof CROP_SPRITES | null = null;

  if (tileState.kind === 'tilled') {
    texture = tileState.watered ? wateredTex : tilledTex;
  } else if (tileState.kind === 'planted') {
    texture = wateredTex;
    const def = CROPS[tileState.crop];
    const stage = stageForDayCount(def, tileState.daysGrown);
    stageColor = stage.color;
    mature = tileState.daysGrown >= def.daysToMature;
    cropId = tileState.crop as keyof typeof CROP_SPRITES;
  }

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[tileSize * 0.98, tileSize * 0.98]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      {stageColor && !mature && (
        <mesh position={[0, 0.2, 0]} castShadow>
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
