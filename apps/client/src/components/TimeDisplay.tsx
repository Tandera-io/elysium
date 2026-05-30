import { useTimeStore, formatClock, SEASONS, SEASON_LABEL } from '../systems/time/timeStore';
import { getDayPhase, getTemperature, DAY_PHASE_LABEL, DAY_PHASE_ICON } from '../gameLogic/time';

export function TimeDisplay() {
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  const season = SEASONS[seasonIndex] ?? 'spring';
  const phase = getDayPhase(hour);
  const temp = getTemperature(hour, season);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span>{DAY_PHASE_ICON[phase]}</span>
        <span className="font-mono font-bold">{formatClock(hour)}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-300">{DAY_PHASE_LABEL[phase]}</span>
      </div>
      <div className="text-slate-400 text-[10px]">
        Dia {dayInSeason} · {SEASON_LABEL[season]} · Ano {year}
      </div>
      <div className="text-amber-200 text-[10px] font-mono">{temp}°C</div>
    </div>
  );
}
