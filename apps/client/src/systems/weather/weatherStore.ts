import { create } from 'zustand';
import type { Season } from '../time/timeStore';

/**
 * All possible weather conditions in Elysium.
 * - sunny     : default fair weather
 * - cloudy    : overcast, no rain, mild growth penalty
 * - rainy     : waters all planted tiles at day start, bonus growth
 * - stormy    : heavy rain, small crop damage chance, NPCs stay indoors
 * - windy     : affects only visual particles (no gameplay penalty)
 * - snowy     : winter only; freezes unwatered tiles, no crop growth
 */
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'windy' | 'snowy';

/** Multiplier applied to crop daysGrown increment each day. */
export const WEATHER_GROWTH_MULTIPLIER: Record<WeatherType, number> = {
  sunny: 1.2,
  cloudy: 1.0,
  rainy: 1.5,
  stormy: 0.7,
  windy: 0.9,
  snowy: 0.3,
};

/**
 * Whether weather auto-waters all planted tiles at day start.
 * The farm's advanceDay call should check this before processing tiles.
 */
export const WEATHER_WATERS_CROPS: Record<WeatherType, boolean> = {
  sunny: false,
  cloudy: false,
  rainy: true,
  stormy: true,
  windy: false,
  snowy: false,
};

/** Per-season probability table. Weights must sum to 1.0. */
const SEASON_WEATHER_TABLE: Record<Season, { weather: WeatherType; weight: number }[]> = {
  spring: [
    { weather: 'sunny', weight: 0.4 },
    { weather: 'rainy', weight: 0.3 },
    { weather: 'cloudy', weight: 0.2 },
    { weather: 'windy', weight: 0.1 },
    { weather: 'stormy', weight: 0.0 },
    { weather: 'snowy', weight: 0.0 },
  ],
  summer: [
    { weather: 'sunny', weight: 0.5 },
    { weather: 'rainy', weight: 0.15 },
    { weather: 'cloudy', weight: 0.15 },
    { weather: 'stormy', weight: 0.1 },
    { weather: 'windy', weight: 0.1 },
    { weather: 'snowy', weight: 0.0 },
  ],
  autumn: [
    { weather: 'cloudy', weight: 0.3 },
    { weather: 'sunny', weight: 0.3 },
    { weather: 'rainy', weight: 0.2 },
    { weather: 'windy', weight: 0.1 },
    { weather: 'stormy', weight: 0.1 },
    { weather: 'snowy', weight: 0.0 },
  ],
  winter: [
    { weather: 'snowy', weight: 0.4 },
    { weather: 'cloudy', weight: 0.3 },
    { weather: 'windy', weight: 0.1 },
    { weather: 'sunny', weight: 0.1 },
    { weather: 'stormy', weight: 0.05 },
    { weather: 'rainy', weight: 0.05 },
  ],
};

/** Weighted random pick from the season table. */
export function pickWeather(season: Season, rng: () => number = Math.random): WeatherType {
  const table = SEASON_WEATHER_TABLE[season];
  let roll = rng();
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry.weather;
  }
  return table[0]!.weather;
}

export interface WeatherState {
  /** Today's weather condition. */
  today: WeatherType;
  /** Tomorrow's forecast (rolled at end of day, shown in UI). */
  forecast: WeatherType;
}

export interface WeatherActions {
  /**
   * Roll new weather for tomorrow and promote tomorrow -> today.
   * Call this once per day rollover, passing the *incoming* season.
   */
  advanceDay: (incomingSeason: Season) => void;
  /** Seed initial weather for the starting season (call once on game start). */
  initWeather: (season: Season) => void;
}

function makeInitial(): WeatherState {
  return {
    today: 'sunny',
    forecast: 'sunny',
  };
}

export const useWeatherStore = create<WeatherState & WeatherActions>((set) => ({
  ...makeInitial(),
  initWeather: (season) => {
    const today = pickWeather(season);
    const forecast = pickWeather(season);
    set({ today, forecast });
  },
  advanceDay: (incomingSeason) => {
    set((s) => ({
      today: s.forecast,
      forecast: pickWeather(incomingSeason),
    }));
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __weather: typeof useWeatherStore }).__weather = useWeatherStore;
}
