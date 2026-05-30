// /Users/ngs/Desktop/NGS 2.0/elysium/apps/client/src/stores/timeStore.js
//
// Lighting-aware time store with weather system.
//
// Re-exports everything from the canonical TypeScript timeStore and layers on
// three derived values that DOM/React overlay components need:
//
//   currentHour    — same as `hour` (0–24 continuous float)
//   timeOfDay      — 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night'
//   lightingOverlay — { color: string (hex), opacity: number (0–1) }
//
// Hour → lighting mapping (matches task spec):
//   0–5   night      #1a1a4e  0.60
//   5–7   dawn       #ff8c42  0.30
//   7–17  day        #ffffff  0.00  (transparent — no tint during daylight)
//   17–19 dusk       #ff6b35  0.25
//   19–24 night      #1a1a4e  0.60
//
// Smooth transitions are achieved by linearly interpolating opacity and RGB
// components across a ±0.5 h window around each hard boundary.
//
// Weather system:
//   weather — 'sunny' | 'cloudy' | 'rainy' | 'stormy'
//   Weather changes every WEATHER_CHANGE_INTERVAL_HOURS in-game hours.
//   Transitions are seeded deterministically from (day, seasonIndex, year, slot)
//   so the same game state always yields the same weather.

import { create } from 'zustand';
import { useTimeStore } from '../systems/time/timeStore';

// ---------------------------------------------------------------------------
// Weather system
// ---------------------------------------------------------------------------

/**
 * All possible weather types.
 * @typedef {'sunny'|'cloudy'|'rainy'|'stormy'} WeatherType
 */
export const WEATHER_TYPES = /** @type {const} */ (['sunny', 'cloudy', 'rainy', 'stormy']);

/** How many in-game hours before weather can change. */
const WEATHER_CHANGE_INTERVAL_HOURS = 6;

/**
 * Weather effects on gameplay.
 * cropGrowthMultiplier: multiplier applied to crop growth rate each tick.
 * playerSpeedMultiplier: multiplier applied to player move speed.
 */
export const WEATHER_EFFECTS = {
  sunny: { cropGrowthMultiplier: 1.0, playerSpeedMultiplier: 1.0 },
  cloudy: { cropGrowthMultiplier: 1.0, playerSpeedMultiplier: 1.0 },
  rainy: { cropGrowthMultiplier: 1.2, playerSpeedMultiplier: 0.9 },
  stormy: { cropGrowthMultiplier: 0.8, playerSpeedMultiplier: 0.8 },
};

/** Human-readable labels (Portuguese to match the game locale). */
export const WEATHER_LABEL = {
  sunny: 'Ensolarado',
  cloudy: 'Nublado',
  rainy: 'Chuvoso',
  stormy: 'Tempestuoso',
};

/** Emoji icons for each weather type. */
export const WEATHER_ICON = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
};

/**
 * Weighted probability table.  Weights sum to 100 to make it easy to read.
 * More sunny/cloudy than rainy/stormy.
 */
const WEATHER_WEIGHTS = [
  { type: 'sunny', weight: 40 },
  { type: 'cloudy', weight: 30 },
  { type: 'rainy', weight: 20 },
  { type: 'stormy', weight: 10 },
];

/**
 * Simple deterministic pseudo-random number generator (xorshift32).
 * Returns a float in [0, 1) seeded from the given integer.
 */
function prng(seed) {
  let x = seed | 0;
  // A non-zero seed is required; ensure we avoid zero.
  if (x === 0) x = 2463534242;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  // Unsigned right shift to interpret as positive integer.
  return (x >>> 0) / 0x100000000;
}

/**
 * Pick a weather type deterministically from a slot index + day context.
 * Using multiple PRNG steps reduces clustering.
 *
 * @param {number} slot          — which WEATHER_CHANGE_INTERVAL_HOURS block within the day
 * @param {number} dayInSeason   — 1-based day in the current season
 * @param {number} seasonIndex   — 0-based season index
 * @param {number} year          — 1-based year
 * @returns {WeatherType}
 */
export function computeWeather(slot, dayInSeason, seasonIndex, year) {
  // Mix the inputs into a single integer seed.
  const seed = year * 10000 + seasonIndex * 1000 + dayInSeason * 10 + slot;
  const rand = prng(seed) * 100;

  let cumulative = 0;
  for (const entry of WEATHER_WEIGHTS) {
    cumulative += entry.weight;
    if (rand < cumulative) return entry.type;
  }
  return 'sunny';
}

/**
 * Given current time store state, return the active weather type.
 *
 * @param {{ hour: number, dayInSeason: number, seasonIndex: number, year: number }} timeState
 * @returns {WeatherType}
 */
export function getWeatherForTime({ hour, dayInSeason, seasonIndex, year }) {
  const slot = Math.floor((((hour % 24) + 24) % 24) / WEATHER_CHANGE_INTERVAL_HOURS);
  return computeWeather(slot, dayInSeason, seasonIndex, year);
}

// ---------------------------------------------------------------------------
// Keyframe table
// Each entry defines the *start* of a phase.  Values are interpolated between
// consecutive entries so transitions are smooth rather than hard cuts.
// ---------------------------------------------------------------------------
const KEYFRAMES = [
  { hour: 0, color: '#1a1a4e', opacity: 0.6 }, // deep night
  { hour: 5, color: '#ff8c42', opacity: 0.3 }, // dawn
  { hour: 7, color: '#ffffff', opacity: 0.0 }, // morning – no overlay
  { hour: 17, color: '#ffffff', opacity: 0.0 }, // afternoon – no overlay
  { hour: 19, color: '#ff6b35', opacity: 0.25 }, // dusk
  { hour: 20, color: '#1a1a4e', opacity: 0.6 }, // night
  { hour: 24, color: '#1a1a4e', opacity: 0.6 }, // sentinel (= hour 0)
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/**
 * Given a continuous game hour (0–24), return { color, opacity } by linearly
 * interpolating between the two surrounding KEYFRAMES entries.
 */
function computeOverlay(hour) {
  // Normalise to [0, 24)
  const h = ((hour % 24) + 24) % 24;

  let a = KEYFRAMES[0];
  let b = KEYFRAMES[KEYFRAMES.length - 1];

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (h >= KEYFRAMES[i].hour && h < KEYFRAMES[i + 1].hour) {
      a = KEYFRAMES[i];
      b = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = b.hour - a.hour;
  const t = span === 0 ? 0 : (h - a.hour) / span;

  const [ar, ag, ab] = hexToRgb(a.color);
  const [br, bg, bb] = hexToRgb(b.color);

  const color = rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
  const opacity = a.opacity + (b.opacity - a.opacity) * t;

  return { color, opacity };
}

/**
 * Map a continuous hour to the coarse timeOfDay label required by the task.
 * Uses the same boundaries as the overlay keyframes.
 */
function computeTimeOfDay(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 0 && h < 5) return 'night';
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 17) return h < 12 ? 'morning' : 'afternoon';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

/**
 * useLightingStore — subscribe to lighting-derived state and weather.
 *
 * State shape:
 *   currentHour     : number          — mirrors useTimeStore `hour`
 *   timeOfDay       : string          — 'dawn'|'morning'|'afternoon'|'dusk'|'night'
 *   lightingOverlay : { color, opacity }
 *   weather         : WeatherType     — 'sunny'|'cloudy'|'rainy'|'stormy'
 *   weatherEffects  : { cropGrowthMultiplier, playerSpeedMultiplier }
 *
 * The store syncs itself with useTimeStore via a subscription so it is always
 * current without requiring manual updates.
 */
export const useLightingStore = create((set) => {
  // Derive initial values from the current time store state.
  const initialState = useTimeStore.getState();
  const initialHour = initialState.hour;
  const initialWeather = getWeatherForTime(initialState);

  // Subscribe to the canonical time store and propagate changes here.
  useTimeStore.subscribe((timeState) => {
    const hour = timeState.hour;
    const weather = getWeatherForTime(timeState);
    set({
      currentHour: hour,
      timeOfDay: computeTimeOfDay(hour),
      lightingOverlay: computeOverlay(hour),
      weather,
      weatherEffects: WEATHER_EFFECTS[weather],
    });
  });

  return {
    currentHour: initialHour,
    timeOfDay: computeTimeOfDay(initialHour),
    lightingOverlay: computeOverlay(initialHour),
    weather: initialWeather,
    weatherEffects: WEATHER_EFFECTS[initialWeather],
  };
});

// Convenience selector hooks ------------------------------------------------

/** Returns just the lighting overlay object { color, opacity }. */
export function useLightingOverlay() {
  return useLightingStore((s) => s.lightingOverlay);
}

/** Returns the coarse time-of-day label string. */
export function useTimeOfDay() {
  return useLightingStore((s) => s.timeOfDay);
}

/** Returns the continuous game hour (0–24). */
export function useCurrentHour() {
  return useLightingStore((s) => s.currentHour);
}

/** Returns the current weather type string. */
export function useWeatherType() {
  return useLightingStore((s) => s.weather);
}

/** Returns the weather effects object { cropGrowthMultiplier, playerSpeedMultiplier }. */
export function useWeatherEffects() {
  return useLightingStore((s) => s.weatherEffects);
}

// Re-export everything from the canonical TS store so callers can use a single
// import path if they prefer.
export { useTimeStore } from '../systems/time/timeStore';
