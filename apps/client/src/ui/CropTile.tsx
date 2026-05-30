import { useFarmStore } from '../systems/farming/farmStore';
import { usePlayerStore } from '../store/playerStore';
import { worldToTile } from '../engine/world/WorldGrid';
import { CROPS, isMature } from '../systems/farming/CropDefs';
import { tileKey } from '../engine/world/pathfinding';
import { Growth } from '../components/Crop/Growth';

/**
 * HUD overlay showing information about the tile the player is currently
 * standing on. Displays watered/dry state for tilled tiles and crop name,
 * growth stage, day progress bar, and a "pronto!" pulse when mature for
 * planted tiles. Returns null for empty tiles.
 */
export function CropTile() {
  const position = usePlayerStore((s) => s.position);
  const tiles = useFarmStore((s) => s.tiles);

  const coord = worldToTile({ x: position.x, z: position.z });
  const key = tileKey(coord);
  const tile = tiles[key];

  if (!tile || tile.kind === 'empty') return null;

  if (tile.kind === 'tilled') {
    return (
      <div className="pointer-events-none absolute bottom-36 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 flex items-center gap-2">
        <span className="text-slate-400">Solo revolvido</span>
        {tile.watered ? (
          <span className="text-sky-400 font-medium">regado</span>
        ) : (
          <span className="text-amber-500 font-medium">seco</span>
        )}
      </div>
    );
  }

  // tile.kind === 'planted'
  const def = CROPS[tile.crop];
  const mature = isMature(def, tile.daysGrown);

  return (
    <div className="pointer-events-none absolute bottom-36 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-200 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{def.name}</span>
        {mature && <span className="text-emerald-400 font-bold animate-pulse">pronto!</span>}
      </div>
      <Growth cropId={tile.crop} daysGrown={tile.daysGrown} variant="hud" />
    </div>
  );
}
