import { useLoader } from '@react-three/fiber';
import { Suspense, useCallback, useMemo } from 'react';
import { NearestFilter, TextureLoader } from 'three';
import { useFarmStore } from '../../systems/farming/farmStore';
import { CROPS } from '../../systems/farming/CropDefs';
import type { CropId } from '../../systems/farming/CropDefs';
import { TILE_TEXTURES } from '../../content/assets';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { useToolStore } from '../../store/toolStore';
import { CropGrowthStageSprite } from '../loader/CropGrowthStageSprite';
import { tileKey } from './pathfinding';
import { DEFAULT_GRID, tileToWorld, worldToTile, type GridConfig } from './WorldGrid';
import { useFarmFeedbackStore } from '../../systems/farming/farmFeedbackStore';

const TILE_HEIGHT = 0.01;

/** Map from seed tool id to CropId. */
const SEED_TOOL_TO_CROP: Record<string, CropId> = {
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
  seed_corn: 'corn',
  seed_pumpkin: 'pumpkin',
  seed_strawberry: 'strawberry',
};

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
 * Invisible large ground plane used to raycast tile coordinates from pointer
 * clicks. Sits just above y=0 so it intercepts clicks before the grass plane.
 */
function TileClickReceiver({
  grid,
  onTileClick,
}: {
  grid: GridConfig;
  onTileClick: (x: number, z: number) => void;
}) {
  const width = grid.width * grid.tileSize;
  const height = grid.height * grid.tileSize;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        const pt = e.point;
        const tile = worldToTile({ x: pt.x, z: pt.z }, grid);
        onTileClick(tile.x, tile.z);
      }}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/**
 * Renders farming tiles: tilled/watered soil textures + crop sprites at the
 * correct growth stage using CropGrowthStageSprite. Handles pointer clicks to
 * apply the currently selected tool (hoe, water, seed_*, harvest).
 */
export function FarmField({ grid = DEFAULT_GRID }: FarmFieldProps) {
  const tiles = useFarmStore((s) => s.tiles);
  const farmActions = useFarmStore();
  const inventory = useInventoryStore();
  const currentTool = useToolStore((s) => s.current);
  const feedback = useFarmFeedbackStore((s) => s.push);
  const size = grid.tileSize;

  const tilledTex = useTileTexture(TILE_TEXTURES.tilled);
  const wateredTex = useTileTexture(TILE_TEXTURES.watered);

  const handleTileClick = useCallback(
    (tileX: number, tileZ: number) => {
      const t = { x: tileX, z: tileZ };
      const tile = farmActions.getTile(t);

      if (currentTool === 'hoe') {
        if (tile.kind === 'empty') {
          farmActions.till(t);
          feedback('Lavoura preparada!', 'success');
        } else {
          feedback('Precisa de terra vazia', 'warn');
        }
        return;
      }

      if (currentTool === 'water') {
        if (tile.kind === 'tilled' || tile.kind === 'planted') {
          farmActions.water(t);
          feedback('Regado!', 'success');
        } else {
          feedback('Nada para regar aqui', 'warn');
        }
        return;
      }

      if (currentTool === 'harvest') {
        if (tile.kind === 'planted') {
          const def = CROPS[tile.crop];
          if (tile.daysGrown >= def.daysToMature) {
            const result = farmActions.harvest(t);
            if (result) {
              inventory.add(result.crop, result.quantity);
              feedback(`+${result.quantity} ${def.name}`, 'success');
            }
          } else {
            feedback('Ainda crescendo…', 'warn');
          }
        } else {
          feedback('Nada para colher aqui', 'warn');
        }
        return;
      }

      const cropId = SEED_TOOL_TO_CROP[currentTool];
      if (cropId) {
        const seedItemId = currentTool as 'seed_wheat' | 'seed_tomato' | 'seed_corn';
        if (tile.kind !== 'tilled') {
          feedback('Precisa de lavoura preparada', 'warn');
          return;
        }
        const have = inventory.count(seedItemId);
        if (have < 1) {
          feedback('Sem sementes!', 'error');
          return;
        }
        const planted = farmActions.plant(t, cropId);
        if (planted) {
          inventory.remove(seedItemId, 1);
          feedback(`${CROPS[cropId].name} plantado!`, 'success');
        }
        return;
      }

      // 'move' tool — no farm action on tile click
    },
    [currentTool, farmActions, inventory, feedback],
  );

  const entries = Object.entries(tiles);

  return (
    <group>
      {/* Invisible ground plane catches all pointer clicks and converts to tile coords */}
      <TileClickReceiver grid={grid} onTileClick={handleTileClick} />

      {entries.map(([key, tile]) => {
        if (tile.kind === 'empty') return null;
        const [xStr, zStr] = key.split(',');
        const tileX = Number(xStr);
        const tileZ = Number(zStr);
        if (Number.isNaN(tileX) || Number.isNaN(tileZ)) return null;
        const world = tileToWorld({ x: tileX, z: tileZ }, grid);

        let texture = tilledTex;
        let cropId: CropId | null = null;
        let daysGrown = 0;

        if (tile.kind === 'tilled') {
          texture = tile.watered ? wateredTex : tilledTex;
        } else if (tile.kind === 'planted') {
          texture = wateredTex;
          cropId = tile.crop;
          daysGrown = tile.daysGrown;
        }

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[size * 0.98, size * 0.98]} />
              <meshStandardMaterial map={texture} />
            </mesh>
            {/* Crop growth sprite — all stages including mature */}
            {cropId && (
              <Suspense fallback={null}>
                <CropGrowthStageSprite
                  cropId={cropId}
                  daysGrown={daysGrown}
                  maxHeight={1.1}
                  billboard={true}
                />
              </Suspense>
            )}
          </group>
        );
      })}
    </group>
  );
}

// Keep the export to silence the "unused" linter while we resolve dependents.
export { tileKey as _tileKey };
