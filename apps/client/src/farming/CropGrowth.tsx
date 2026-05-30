import { CROPS } from '../systems/farming/CropDefs';
import { SEASON_LABEL, useTimeStore } from '../systems/time/timeStore';
import { useCurrentSeason, useInSeasonCrops } from '../states/useTimeState';

const SEASON_EMOJI: Record<string, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

/**
 * HUD panel showing the current season and which crops can grow this season.
 * Mounts inside App as an overlay.
 */
export function CropGrowth() {
  const season = useCurrentSeason();
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const inSeason = useInSeasonCrops();
  const allCropIds = Object.keys(CROPS) as Array<keyof typeof CROPS>;

  return (
    <div className="pointer-events-none absolute left-4 bottom-24 bg-slate-900/80 backdrop-blur rounded-xl px-3 py-2 text-xs text-slate-200 font-mono flex flex-col gap-1">
      <div className="flex items-center gap-1 font-semibold text-amber-300">
        <span>{SEASON_EMOJI[season] ?? '🌿'}</span>
        <span>
          {SEASON_LABEL[season]} — dia {dayInSeason}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {allCropIds.map((id) => {
          const def = CROPS[id];
          const active = inSeason.includes(id);
          return (
            <span key={id} className={active ? 'text-emerald-400' : 'text-slate-500 line-through'}>
              {active ? '✓' : '✗'} {def.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
