import { useTime } from '../../hooks/useTime';
import seasonsData from '../../data/seasons.json';
import type { Season as SeasonId } from '../../systems/time/timeStore';

type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';

interface SeasonDef {
  label: string;
  daysPerSeason: number;
  description: string;
  ambientColor: string;
  weatherPatterns: Array<{ type: string; probability: number; label: string }>;
  cropEffects: {
    growthRateMultiplier: number;
    waterNeedMultiplier: number;
    rainWatersTiles: boolean;
    inSeasonCrops: string[];
  };
}

const WEATHER_ICON: Record<WeatherType, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  snowy: '❄️',
};

/** Picks today's weather from a season's probability table using the day as a seed. */
function pickWeather(
  patterns: SeasonDef['weatherPatterns'],
  day: number,
): { type: WeatherType; label: string } {
  // Deterministic pseudo-random based on day so weather is stable within a day
  const seed = ((day * 2654435761) >>> 0) / 4294967296;
  let cumulative = 0;
  for (const p of patterns) {
    cumulative += p.probability;
    if (seed < cumulative) {
      return { type: p.type as WeatherType, label: p.label };
    }
  }
  const last = patterns[patterns.length - 1];
  if (!last) return { type: 'sunny' as WeatherType, label: 'Ensolarado' };
  return { type: last.type as WeatherType, label: last.label };
}

/** HUD badge showing current season, day within season, and today's weather. */
export function Season() {
  const { season, dayInSeason, year } = useTime();
  const def = (seasonsData as Record<SeasonId, SeasonDef>)[season];
  if (!def) return null;

  const weather = pickWeather(def.weatherPatterns, dayInSeason + (year - 1) * 28);
  const weatherIcon = WEATHER_ICON[weather.type] ?? '🌤️';

  return (
    <div
      className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur text-xs font-mono text-slate-200"
      aria-label={`Estação: ${def.label}, dia ${dayInSeason}`}
      data-season={season}
      data-weather={weather.type}
    >
      <span className="text-sm" aria-hidden="true">
        {weatherIcon}
      </span>
      <span>{def.label}</span>
      <span className="text-slate-400">·</span>
      <span>Dia {dayInSeason}</span>
      <span className="text-slate-400">·</span>
      <span className="text-slate-300">{weather.label}</span>
    </div>
  );
}
