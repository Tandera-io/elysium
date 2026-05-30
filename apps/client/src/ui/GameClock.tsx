import { SEASON_LABEL, currentSeason, formatClock, useTimeStore } from '../systems/time/timeStore';

/**
 * Stardew-style HUD clock: shows in-game time, season/day, and a day-progress bar.
 * Day progress runs from 6:00 (dawn) to 22:00 (late evening) — the playable window.
 */
export function GameClock() {
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  const season = currentSeason({ seasonIndex } as Parameters<typeof currentSeason>[0]);
  const DAWN = 6;
  const DUSK = 22;
  const dayProgress = Math.min(1, Math.max(0, (hour - DAWN) / (DUSK - DAWN)));

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-xl px-3 py-2 text-slate-200 text-sm font-mono flex flex-col items-end gap-1 min-w-[9rem]">
      <div className="text-amber-300 text-base font-bold">{formatClock(hour)}</div>
      <div
        className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden"
        title={`Dia ${Math.round(dayProgress * 100)}% completo`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${dayProgress * 100}%`,
            background: hour < 12 ? '#fbbf24' : hour < 18 ? '#f97316' : '#818cf8',
          }}
        />
      </div>
      <div className="text-xs text-slate-400">
        {SEASON_LABEL[season]} · Dia {dayInSeason} · Ano {year}
      </div>
    </div>
  );
}
