import { useWeatherStore, WEATHER_META } from '../systems/weather/weatherStore';
import { useTimeStore, SEASON_LABEL, SEASONS } from '../systems/time/timeStore';

export function WeatherHUD() {
  const today = useWeatherStore((s) => s.today);
  const tomorrow = useWeatherStore((s) => s.tomorrow);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const season = SEASONS[seasonIndex] ?? 'spring';

  const todayMeta = WEATHER_META[today];
  const tomorrowMeta = WEATHER_META[tomorrow];

  return (
    <div
      data-testid="weather-hud"
      className="absolute bottom-4 left-4 bg-slate-900/70 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
    >
      <div className="font-semibold">
        {todayMeta.emoji} {todayMeta.label}
      </div>
      <div className="text-slate-400">
        Amanhã: {tomorrowMeta.emoji} {tomorrowMeta.label}
      </div>
      <div className="text-slate-400 mt-0.5">
        {SEASON_LABEL[season]} · Dia {dayInSeason}
      </div>
      {today === 'rainy' && <div className="text-blue-300 mt-0.5">💧 Auto-regado</div>}
      {today === 'stormy' && <div className="text-amber-300 mt-0.5">⚡ Crescimento lento</div>}
    </div>
  );
}
