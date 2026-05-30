/**
 * WeatherOverlay — DOM HUD chip that shows today's weather icon + label and
 * its gameplay effects (crop growth multiplier, player speed multiplier).
 *
 * Mounted in App.tsx alongside the other HUD panels.
 */

import { useTimeStore, WEATHER_DEFS, type WeatherType } from '../systems/time/timeStore';

const WEATHER_ICON: Record<WeatherType, string> = {
  sunny: 'Ensolarado',
  cloudy: 'Nublado',
  rainy: 'Chuvoso',
  stormy: 'Tempestade',
  snowy: 'Nevando',
  windy: 'Ventoso',
};

// Simple SVG-free text icons — avoids any asset dependency
const WEATHER_GLYPH: Record<WeatherType, string> = {
  sunny: '☀',
  cloudy: '☁',
  rainy: '🌧',
  stormy: '⛈',
  snowy: '❄',
  windy: '💨',
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function WeatherOverlay() {
  const weather = useTimeStore((s) => s.weather);
  const def = WEATHER_DEFS[weather.type];
  const label = WEATHER_ICON[weather.type];
  const glyph = WEATHER_GLYPH[weather.type];

  const growthDelta = def.cropGrowthMultiplier - 1;
  const speedDelta = def.playerSpeedMultiplier - 1;

  const growthColor =
    growthDelta > 0 ? 'text-emerald-400' : growthDelta < 0 ? 'text-rose-400' : 'text-slate-400';

  const speedColor =
    speedDelta > 0 ? 'text-emerald-400' : speedDelta < 0 ? 'text-rose-400' : 'text-slate-400';

  return (
    <div
      className="absolute bottom-20 right-4 bg-slate-900/75 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 font-mono select-none"
      data-testid="weather-overlay"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base leading-none">{glyph}</span>
        <span className="font-semibold tracking-wide">{label}</span>
      </div>
      <div className="flex flex-col gap-0.5 text-[10px]">
        <span>
          Cultivo:{' '}
          <span className={growthColor}>
            {growthDelta >= 0 ? '+' : ''}
            {pct(growthDelta)}
          </span>
        </span>
        <span>
          Velocidade:{' '}
          <span className={speedColor}>
            {speedDelta >= 0 ? '+' : ''}
            {pct(speedDelta)}
          </span>
        </span>
      </div>
    </div>
  );
}
