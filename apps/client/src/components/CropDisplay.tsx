/**
 * CropDisplay — HUD panel showing all planted crop tiles with their growth
 * stage, water status, and harvest readiness.
 *
 * Reads directly from useFarmStore and renders a compact list of active tiles.
 * Toggle visibility with the parent component (e.g. via a hotkey).
 */
import { useFarmStore } from '../systems/farming/farmStore';
import { CROPS, isMature, stageForDayCount } from '../systems/farming/CropDefs';

/** Human-readable label for each stage index (0-based). */
const STAGE_NAMES = ['Semente', 'Broto', 'Crescendo', 'Maduro'] as const;

function stageName(index: number): string {
  return STAGE_NAMES[index] ?? 'Crescendo';
}

const CROP_EMOJI: Record<string, string> = {
  wheat: '🌾',
  tomato: '🍅',
  pumpkin: '🎃',
  corn: '🌽',
  strawberry: '🍓',
};

interface CropRowProps {
  tileKey: string;
  crop: string;
  daysGrown: number;
  daysToMature: number;
  stageIndex: number;
  watered: boolean;
  ready: boolean;
}

function CropRow({
  tileKey,
  crop,
  daysGrown,
  daysToMature,
  stageIndex,
  watered,
  ready,
}: CropRowProps) {
  const [xStr, zStr] = tileKey.split(',');
  const label = `(${xStr}, ${zStr})`;
  const emoji = CROP_EMOJI[crop] ?? '🌱';
  const progressPct = Math.min(100, Math.round((daysGrown / daysToMature) * 100));

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
        ready
          ? 'bg-amber-500/20 border border-amber-500/40'
          : 'bg-slate-800/60 border border-slate-700/40'
      }`}
      title={`Tile ${label} — ${daysGrown}/${daysToMature} dias`}
    >
      {/* Crop icon */}
      <span className="text-base leading-none" aria-hidden>
        {emoji}
      </span>

      {/* Name + tile coord */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-slate-200 truncate">
            {CROPS[crop as keyof typeof CROPS]?.name ?? crop}
          </span>
          <span className="text-slate-500 font-mono shrink-0">{label}</span>
        </div>

        {/* Progress bar */}
        <div className="mt-0.5 h-1 rounded-full bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${ready ? 'bg-amber-400' : 'bg-emerald-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stage badge */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span
          className={`text-[10px] font-mono px-1 rounded ${
            ready ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-slate-700 text-slate-300'
          }`}
        >
          {ready ? 'PRONTO' : stageName(stageIndex)}
        </span>
        <span
          className={`text-[10px] ${watered ? 'text-sky-400' : 'text-slate-600'}`}
          title={watered ? 'Regado hoje' : 'Precisa de água'}
        >
          {watered ? '💧' : '○'}
        </span>
      </div>
    </div>
  );
}

interface CropDisplayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Overlay panel listing all planted tiles sorted by harvestable-first,
 * then by days grown descending (oldest first).
 */
export function CropDisplay({ open, onClose }: CropDisplayProps) {
  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);

  if (!open) return null;

  // Collect only 'planted' tiles
  const plantedEntries = Object.entries(tiles).flatMap(([key, tile]) => {
    if (tile.kind !== 'planted') return [];
    const def = CROPS[tile.crop];
    const ready = isMature(def, tile.daysGrown);
    const stage = stageForDayCount(def, tile.daysGrown);
    const watered = tile.lastWateredOnDay >= day - 1;
    return [{ key, tile, def, ready, stageIndex: stage.index, watered }];
  });

  // Sort: ready first, then by most days grown
  plantedEntries.sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    return b.tile.daysGrown - a.tile.daysGrown;
  });

  return (
    <div
      role="dialog"
      aria-label="Estado das plantações"
      aria-modal="true"
      className="pointer-events-auto absolute bottom-24 right-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl shadow-xl px-3 py-3 w-64"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide">
          Plantações <span className="text-slate-500 font-normal">({plantedEntries.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">dia {day}</span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-xs px-1"
            aria-label="Fechar plantações"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Crop list */}
      {plantedEntries.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-3">
          Nenhuma planta no campo.
          <br />
          <span className="text-slate-700">Use a enxada e sementes para plantar.</span>
        </p>
      ) : (
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-0.5">
          {plantedEntries.map(({ key, tile, def, ready, stageIndex, watered }) => (
            <CropRow
              key={key}
              tileKey={key}
              crop={tile.crop}
              daysGrown={tile.daysGrown}
              daysToMature={def.daysToMature}
              stageIndex={stageIndex}
              watered={watered}
              ready={ready}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-600">
        <span>💧 regado · ○ seco</span>
        <span className="text-amber-500">■ pronto p/ colher</span>
      </div>
    </div>
  );
}
