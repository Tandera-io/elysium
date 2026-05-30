import { useFarmStore } from '../systems/farming/farmStore';
import { usePlayerStore } from '../store/playerStore';
import { worldToTile } from '../engine/world/WorldGrid';
import { CROPS, stageForDayCount, isMature } from '../systems/farming/CropDefs';
import { tileKey } from '../engine/world/pathfinding';

export function CropTile() {
  const position = usePlayerStore((s) => s.position);
  const coord = worldToTile({ x: position.x, z: position.z });
  const tile = useFarmStore((s) => s.tiles[tileKey(coord)] ?? null);

  if (!tile || tile.kind === 'empty') return null;

  if (tile.kind === 'tilled') {
    return (
      <div className="pointer-events-none absolute bottom-[84px] left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur rounded-xl px-4 py-2 text-slate-100 text-sm font-mono flex items-center gap-2">
        <span>Solo preparado</span>
        <span className={tile.watered ? 'text-blue-400' : 'text-amber-400'}>
          {tile.watered ? '💧 regado' : '☀️ seco'}
        </span>
        <span className="text-slate-400 text-xs">selecione uma semente</span>
      </div>
    );
  }

  const def = CROPS[tile.crop];
  const stage = stageForDayCount(def, tile.daysGrown);
  const mature = isMature(def, tile.daysGrown);
  const progress = Math.min(1, tile.daysGrown / def.daysToMature);

  return (
    <div className="pointer-events-none absolute bottom-[84px] left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur rounded-xl px-4 py-2 text-slate-100 text-sm font-mono flex flex-col items-center gap-1 min-w-[220px]">
      <div className="flex items-center gap-2 w-full justify-between">
        <span className="font-semibold">{def.name}</span>
        {mature ? (
          <span className="text-amber-400 text-xs animate-pulse">✂️ pronto!</span>
        ) : (
          <span className="text-slate-400 text-xs">
            estágio {stage.index + 1}/{def.stages.length} · dia {tile.daysGrown}/{def.daysToMature}
          </span>
        )}
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${mature ? 'bg-amber-400' : 'bg-green-500'}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {mature && <span className="text-xs text-slate-400">selecione ✂️ [6] e clique no tile</span>}
    </div>
  );
}
