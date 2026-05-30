// apps/client/src/components/WeatherIndicator.jsx
//
// HUD widget that displays the current in-game weather condition, its icon,
// and a brief description of gameplay effects.
//
// Usage:
//   <WeatherIndicator />
//
// The component is purely presentational — all data comes from useWeather()
// which in turn reads from useLightingStore (synced to useTimeStore).

import { useWeather } from '../hooks/useWeather';

/** Background tint classes per weather type — subtle so it doesn't dominate. */
const WEATHER_BG = {
  sunny: 'bg-amber-500/20 border-amber-400/30',
  cloudy: 'bg-slate-500/20 border-slate-400/30',
  rainy: 'bg-blue-500/20  border-blue-400/30',
  stormy: 'bg-violet-700/20 border-violet-500/30',
};

const WEATHER_TEXT = {
  sunny: 'text-amber-200',
  cloudy: 'text-slate-200',
  rainy: 'text-blue-200',
  stormy: 'text-violet-200',
};

export function WeatherIndicator() {
  const { weather, weatherLabel, weatherIcon, description } = useWeather();

  const bgClass = WEATHER_BG[weather] ?? WEATHER_BG.sunny;
  const textClass = WEATHER_TEXT[weather] ?? WEATHER_TEXT.sunny;

  return (
    <div
      className={`
        pointer-events-none
        flex items-center gap-2
        rounded-xl border px-3 py-2
        bg-slate-900/80 backdrop-blur
        ${bgClass}
        select-none
      `}
      aria-label={`Clima: ${weatherLabel}`}
      data-testid="weather-indicator"
    >
      <span className="text-xl leading-none" role="img" aria-label={weatherLabel}>
        {weatherIcon}
      </span>
      <div className="flex flex-col">
        <span className={`text-sm font-semibold leading-tight ${textClass}`}>{weatherLabel}</span>
        <span className="text-[10px] text-slate-400 leading-tight">{description}</span>
      </div>
    </div>
  );
}
