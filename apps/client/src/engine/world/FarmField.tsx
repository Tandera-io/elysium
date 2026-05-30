import { useMemo } from 'react';
import { useFarmStore } from '../../systems/farming/farmStore';
import { FarmingPlotTile } from '../../tiles/FarmingPlotTile';
import { tileToWorld, type GridConfig, DEFAULT_GRID } from './WorldGrid';
import { tileKey } from './pathfinding';

interface FarmFieldProps {
  grid?: GridConfig;
  onInteract?: (key: string) => void;
}

/**
 * Renders all non-empty farming tiles from the farm store.
 * Each tile is delegated to FarmingPlotTile which handles texture selection,
 * hover highlighting, and click callbacks.
 */
export function FarmField({ grid = DEFAULT_GRID, onInteract }: FarmFieldProps) {
  const tiles = useFarmStore((s) => s.tiles);
  const size = grid.tileSize;
  const entries = useMemo(() => Object.entries(tiles), [tiles]);

  return (
    <group>
      {entries.map(([key, tile]) => {
        if (tile.kind === 'empty') return null;
        const [xStr, zStr] = key.split(',');
        const tileX = Number(xStr);
        const tileZ = Number(zStr);
        if (Number.isNaN(tileX) || Number.isNaN(tileZ)) return null;
        const world = tileToWorld({ x: tileX, z: tileZ }, grid);
        return (
          <FarmingPlotTile
            key={key}
            tileKey={key}
            tile={tile}
            worldX={world.x}
            worldZ={world.z}
            tileSize={size}
            onInteract={onInteract}
          />
        );
      })}
    </group>
  );
}

export { tileKey as _tileKey };
