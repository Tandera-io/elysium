import { create } from 'zustand';
import { useFarmStore } from '../farming/farmStore';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_SEASON = 7;
export const HOURS_PER_DAY = 24;
export const SECONDS_PER_REAL_DAY_DEFAULT = 15 * 60; // 15 real minutes = 1 in-game day

export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Primavera',
  summer: 'Verão',
  autumn: 'Outono',
  winter: 'Inverno',
};

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'windy';

export interface WeatherState {
  type: WeatherType;
  /** 0..1 — how intense the current weather is (affects visuals and gameplay). */
  intensity: number;
}

export interface WeatherDef {
  /** Short Portuguese label shown in HUD. */
  label: string;
  /** Crop growth multiplier this weather applies each day. */
  cropGrowthMultiplier: number;
  /** Player movement speed multiplier while this weather is active. */
  playerSpeedMultiplier: number;
}

export const WEATHER_DEFS: Record<WeatherType, WeatherDef> = {
  sunny: { label: 'Ensolarado', cropGrowthMultiplier: 1.0, playerSpeedMultiplier: 1.0 },
  cloudy: { label: 'Nublado', cropGrowthMultiplier: 0.9, playerSpeedMultiplier: 1.0 },
  rainy: { label: 'Chuvoso', cropGrowthMultiplier: 1.25, playerSpeedMultiplier: 0.85 },
  stormy: { label: 'Tempestade', cropGrowthMultiplier: 0.75, playerSpeedMultiplier: 0.65 },
  snowy: { label: 'Nevando', cropGrowthMultiplier: 0.5, playerSpeedMultiplier: 0.7 },
  windy: { label: 'Ventoso', cropGrowthMultiplier: 0.85, playerSpeedMultiplier: 0.9 },
};

/**
 * Seasonal weather probability table.
 * Each entry is [WeatherType, relativeWeight].
 * Weights are normalised at runtime — they don't need to sum to 1.
 */
const SEASONAL_WEATHER: Record<Season, [WeatherType, number][]> = {
  spring: [
    ['sunny', 35],
    ['cloudy', 25],
    ['rainy', 30],
    ['windy', 10],
  ],
  summer: [
    ['sunny', 50],
    ['cloudy', 15],
    ['rainy', 15],
    ['stormy', 15],
    ['windy', 5],
  ],
  autumn: [
    ['sunny', 20],
    ['cloudy', 30],
    ['rainy', 25],
    ['stormy', 10],
    ['windy', 15],
  ],
  winter: [
    ['cloudy', 30],
    ['rainy', 20],
    ['snowy', 35],
    ['stormy', 10],
    ['windy', 5],
  ],
};

/** Seeded-ish RNG so the same day/season always produces the same weather. */
function seededRand(seed: number): number {
  // xorshift32 — fast, deterministic, good enough for gameplay
  let x = seed ^ (seed << 13);
  x ^= x >> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}

/** Pick a weather type from the weighted table for the given season. */
function rollWeather(season: Season, day: number, year: number): WeatherState {
  const table = SEASONAL_WEATHER[season];
  const totalWeight = table.reduce((sum, [, w]) => sum + w, 0);
  const seed = (year * 1000 + SEASONS.indexOf(season) * 100 + day) * 7919;
  const rand = seededRand(seed) * totalWeight;
  let acc = 0;
  for (const [type, weight] of table) {
    acc += weight;
    if (rand < acc) {
      // Intensity: second roll gives texture variation
      const intensity = 0.4 + seededRand(seed + 1) * 0.6;
      return { type, intensity };
    }
  }
  // Fallback — should never reach here
  return { type: 'sunny', intensity: 1.0 };
}

// ---------------------------------------------------------------------------

export interface TimeState {
  /** Continuous in-game hour (0..24). */
  hour: number;
  /** 1-based day index inside the current season (1..7). */
  dayInSeason: number;
  /** 0-based season index inside the current year. */
  seasonIndex: number;
  /** 1-based year. */
  year: number;
  /** Real seconds to elapse for one in-game day. */
  realSecondsPerDay: number;
  /** Paused flag — pauses time progression (does not pause world tick). */
  paused: boolean;
  /** Current weather — re-rolled at the start of every in-game day. */
  weather: WeatherState;
}

export interface TimeActions {
  /** Advance by `realDeltaSeconds` of real time. Rolls over days/seasons/year. */
  tick: (realDeltaSeconds: number) => void;
  setPaused: (paused: boolean) => void;
  setRealSecondsPerDay: (value: number) => void;
  reset: () => void;
}

function makeInitial(): TimeState {
  return {
    hour: 6,
    dayInSeason: 1,
    seasonIndex: 0,
    year: 1,
    realSecondsPerDay: SECONDS_PER_REAL_DAY_DEFAULT,
    paused: false,
    weather: rollWeather('spring', 1, 1),
  };
}

export const useTimeStore = create<TimeState & TimeActions>((set, get) => ({
  ...makeInitial(),
  tick: (realDeltaSeconds) => {
    if (get().paused || realDeltaSeconds <= 0) return;
    const hoursPerRealSecond = HOURS_PER_DAY / get().realSecondsPerDay;
    let { hour, dayInSeason, seasonIndex, year } = get();
    hour += realDeltaSeconds * hoursPerRealSecond;
    let dayRolled = false;
    while (hour >= HOURS_PER_DAY) {
      hour -= HOURS_PER_DAY;
      dayInSeason += 1;
      dayRolled = true;
      if (dayInSeason > DAYS_PER_SEASON) {
        dayInSeason = 1;
        seasonIndex += 1;
        if (seasonIndex >= SEASONS.length) {
          seasonIndex = 0;
          year += 1;
        }
      }
    }
    if (dayRolled) {
      const season = SEASONS[seasonIndex] ?? 'spring';
      const weather = rollWeather(season, dayInSeason, year);
      set({ hour, dayInSeason, seasonIndex, year, weather });
      const multiplier = WEATHER_DEFS[weather.type].cropGrowthMultiplier;
      useFarmStore.getState().advanceDay(multiplier);
    } else {
      set({ hour, dayInSeason, seasonIndex, year });
    }
  },
  setPaused: (paused) => set({ paused }),
  setRealSecondsPerDay: (value) => set({ realSecondsPerDay: Math.max(10, value) }),
  reset: () => set(makeInitial()),
}));

export function currentSeason(state: TimeState): Season {
  return SEASONS[state.seasonIndex] ?? 'spring';
}

export function formatClock(hour: number): string {
  const total = Math.floor(hour * 60);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

if (import.meta.env.DEV) {
  (window as unknown as { __time: typeof useTimeStore }).__time = useTimeStore;
}
