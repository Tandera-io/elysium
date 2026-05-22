import { useFarmStore } from '../../systems/farming/farmStore';
import { CROPS, stageForDayCount } from '../../systems/farming/CropDefs';
import { tileKey } from './pathfinding';
import { tileToWorld, type GridConfig, DEFAULT_GRID } from './WorldGrid';

const TILE_HEIGHT = 0.02;

const SOIL_TILLED = '#6f4d2a';
const SOIL_WATERED = '#3e2917';

interface FarmFieldProps {
  grid?: GridConfig;
}

/**
 * Renders all farming tiles (tilled / planted / mature) as flat colored quads
 * slightly above the ground. Read-only render; interaction happens in Floor.
 *
 * Subscribes to the store so visuals update on state changes.
 */
export function FarmField({ grid = DEFAULT_GRID }: FarmFieldProps) {
  const tiles = useFarmStore((s) => s.tiles);
  const size = grid.tileSize;

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

        let color = SOIL_TILLED;
        let plantStage: { color: string } | null = null;

        if (tile.kind === 'tilled') {
          color = tile.watered ? SOIL_WATERED : SOIL_TILLED;
        } else if (tile.kind === 'planted') {
          color = SOIL_WATERED; // planted always shows dark soil
          const def = CROPS[tile.crop];
          plantStage = stageForDayCount(def, tile.daysGrown);
        }

        return (
          <group key={key} position={[world.x, TILE_HEIGHT, world.z]}>
            {/* Soil quad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[size * 0.96, size * 0.96]} />
              <meshStandardMaterial color={color} />
            </mesh>
            {/* Crop placeholder column */}
            {plantStage && (
              <mesh position={[0, 0.2, 0]} castShadow>
                <coneGeometry args={[0.15, 0.4, 6]} />
                <meshStandardMaterial color={plantStage.color} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// Avoid lint warning for unused tileKey when bundled
export { tileKey as _tileKey };
