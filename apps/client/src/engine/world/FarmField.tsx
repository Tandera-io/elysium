import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { NearestFilter, TextureLoader } from 'three';
import { useFarmStore } from '../../systems/farming/farmStore';
import { CROPS, isMature, stageForDayCount, type CropId } from '../../systems/farming/CropDefs';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { useToolStore } from '../../store/toolStore';
import { CROP_SPRITES, TILE_TEXTURES } from '../../content/assets';
import { BillboardSprite } from '../loader/BillboardSprite';
import { tileKey, type PathfindOptions } from './pathfinding';
import { tileToWorld, type GridConfig, DEFAULT_GRID, type TileCoord } from './WorldGrid';

export { tileKey as _tileKey };
// Suppress unused import warning for PathfindOptions used only via type
const _unused: PathfindOptions = {};
void _unused;

const TILE_HEIGHT = 0.01;

// Farm plot: 3×3 grid starting at tile (22, 22) — matches FarmPanel's FARM_ORIGIN.
const FARM_ORIGIN_X = 22;
const FARM_ORIGIN_Z = 22;
const FARM_SIZE = 3;

const SEED_TO_CROP: Record<string, CropId> = {
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
  seed_corn: 'corn',
  seed_pumpkin: 'pumpkin',
  seed_strawberry: 'strawberry',
};

const farmPlotCoords: TileCoord[] = [];
for (let row = 0; row < FARM_SIZE; row++) {
  for (let col = 0; col < FARM_SIZE; col++) {
    farmPlotCoords.push({ x: FARM_ORIGIN_X + col, z: FARM_ORIGIN_Z + row });
  }
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
 * Renders the 3×3 farm plot — every tile is clickable.
 * The active tool from toolStore determines the action:
 *   hoe        → till empty tile
 *   water      → water tilled or planted tile
 *   seed_*     → plant crop on tilled tile (consumes seed from inventory)
 *   harvest    → harvest mature planted tile (adds crop to inventory)
 *   move       → click-to-move (handled by Floor, no-op here)
 */
export function FarmField({ grid = DEFAULT_GRID }: FarmFieldProps) {
  const tiles = useFarmStore((s) => s.tiles);
  const till = useFarmStore((s) => s.till);
  const water = useFarmStore((s) => s.water);
  const plant = useFarmStore((s) => s.plant);
  const harvest = useFarmStore((s) => s.harvest);
  const day = useFarmStore((s) => s.day);

  const add = useInventoryStore((s) => s.add);
  const remove = useInventoryStore((s) => s.remove);
  const count = useInventoryStore((s) => s.count);

  const size = grid.tileSize;

  const tilledTex = useTileTexture(TILE_TEXTURES.tilled);
  const wateredTex = useTileTexture(TILE_TEXTURES.watered);
  const grassTex = useLoader(TextureLoader, `/${TILE_TEXTURES.grass}`);
  useMemo(() => {
    grassTex.magFilter = NearestFilter;
    grassTex.minFilter = NearestFilter;
    grassTex.needsUpdate = true;
  }, [grassTex]);

  const handleTileClick = (coord: TileCoord) => {
    const tool = useToolStore.getState().current;
    const key = tileKey(coord);
    const tile = tiles[key] ?? { kind: 'empty' as const };

    if (tool === 'hoe' && tile.kind === 'empty') {
      till(coord);
      return;
    }

    if (tool === 'water' && (tile.kind === 'tilled' || tile.kind === 'planted')) {
      water(coord);
      return;
    }

    if (tool.startsWith('seed_') && tile.kind === 'tilled') {
      const cropId = SEED_TO_CROP[tool];
      if (!cropId) return;
      const seedItemId = tool as Parameters<typeof remove>[0];
      if (count(seedItemId) <= 0) return;
      remove(seedItemId, 1);
      plant(coord, cropId);
      return;
    }

    if (tool === 'harvest' && tile.kind === 'planted') {
      const def = CROPS[tile.crop];
      if (!isMature(def, tile.daysGrown)) return;
      const result = harvest(coord);
      if (result) add(result.crop, result.quantity);
    }
  };

  return (
    <group>
      {farmPlotCoords.map((coord) => {
        const key = tileKey(coord);
        const tile = tiles[key] ?? { kind: 'empty' as const };
        const world = tileToWorld(coord, grid);

        let texture = grassTex;
        let mature = false;
        let stageColor: string | null = null;
        let cropId: keyof typeof CROP_SPRITES | null = null;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
        } else if (tile.kind === 'planted') {
          texture = wateredTex;
          const def = CROPS[tile.crop];
          const stage = stageForDayCount(def, tile.daysGrown);
          stageColor = stage.color;
          mature = isMature(def, tile.daysGrown);
          cropId = tile.crop as keyof typeof CROP_SPRITES;
        }

        // Highlight color for mature crops (ready to harvest)
        const showHarvestGlow = tile.kind === 'planted' && mature;
        // Show water-needed glow for planted tile not watered today
        const showWaterNeeded = tile.kind === 'planted' && !mature && tile.lastWateredOnDay !== day;

        return (
          <group
            key={key}
            position={[world.x, TILE_HEIGHT, world.z]}
            onClick={(e) => {
              e.stopPropagation();
              handleTileClick(coord);
            }}
          >
            {/* Soil / ground quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>

            {/* Water-needed indicator: subtle yellow tinge ring */}
            {showWaterNeeded && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
                <ringGeometry args={[0.38, 0.48, 8]} />
                <meshStandardMaterial color="#e6c44a" transparent opacity={0.6} />
              </mesh>
            )}

            {/* Harvest-ready indicator: green glow ring */}
            {showHarvestGlow && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
                <ringGeometry args={[0.38, 0.48, 8]} />
                <meshStandardMaterial color="#4ae69a" transparent opacity={0.8} />
              </mesh>
            )}

            {/* Growing-stage cone for non-mature plants */}
            {stageColor && !mature && (
              <mesh position={[0, 0.2, 0]} castShadow>
                <coneGeometry args={[0.15, 0.4, 6]} />
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
