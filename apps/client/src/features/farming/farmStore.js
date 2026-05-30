/**
 * farmStore.js — Seasonal farm store for Elysium.
 *
 * This is the JavaScript companion to farmStore.ts.  It exports
 * `useSeasonalFarmStore` — a Zustand store that manages a list of plot objects
 * (rather than the tile-grid used by the TypeScript store) — along with the
 * crop catalogue and season/day helpers consumed by CropPlot and CropDisplay.
 *
 * Growth mechanics:
 *   - Weather effects: rainy = 1.5×, sunny = 1×, drought = 0.5×
 *   - Season penalty: off-season crops grow at 0.5× rate
 *   - Watering-can bonus: +0.2× per day when wateredToday is true
 *   - Crops wilt when grown off-season past 2× their daysToMature threshold
 */

import { create } from 'zustand';
import { computeGrowthIncrement, isReadyToHarvest } from './cropGrowth.js';

// ─── Season / day helpers ─────────────────────────────────────────────────────

export const DAYS_PER_SEASON = 28;
export const SEASONS = ['spring', 'summer', 'fall', 'winter'];

export const SEASON_LABEL = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

/**
 * Returns the season key for a given absolute day number (1-based).
 *
 * @param {number} day
 * @returns {'spring'|'summer'|'fall'|'winter'}
 */
export function seasonFromDay(day) {
  const idx = Math.floor((day - 1) / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[idx];
}

/**
 * Returns the 1-based day within the current season.
 *
 * @param {number} day
 * @returns {number}
 */
export function dayInSeason(day) {
  return ((day - 1) % DAYS_PER_SEASON) + 1;
}

/**
 * Returns the 1-based year number.
 *
 * @param {number} day
 * @returns {number}
 */
export function yearFromDay(day) {
  return Math.floor((day - 1) / (DAYS_PER_SEASON * SEASONS.length)) + 1;
}

// ─── Crop catalogue ───────────────────────────────────────────────────────────

/**
 * All plantable crops.
 *
 * Shape per entry:
 *   id           — unique crop identifier
 *   name         — display name (Portuguese, matching existing NPC dialogue)
 *   emoji        — single emoji for visual representation
 *   seasons      — seasons in which this crop grows at full rate
 *   daysToMature — total growth-days to reach harvestable stage
 *   yieldQuantity — base harvest quantity (before tool bonuses)
 */
export const CROP_CATALOGUE = {
  wheat: {
    id: 'wheat',
    name: 'Trigo',
    emoji: '🌾',
    seasons: ['spring', 'summer'],
    daysToMature: 4,
    yieldQuantity: 2,
  },
  tomato: {
    id: 'tomato',
    name: 'Tomate',
    emoji: '🍅',
    seasons: ['summer'],
    daysToMature: 5,
    yieldQuantity: 3,
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Abóbora',
    emoji: '🎃',
    seasons: ['fall'],
    daysToMature: 7,
    yieldQuantity: 1,
  },
  corn: {
    id: 'corn',
    name: 'Milho',
    emoji: '🌽',
    seasons: ['summer', 'fall'],
    daysToMature: 6,
    yieldQuantity: 3,
  },
  strawberry: {
    id: 'strawberry',
    name: 'Morango',
    emoji: '🍓',
    seasons: ['spring'],
    daysToMature: 3,
    yieldQuantity: 4,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextPlotId = 1;

/** Creates a fresh, empty plot object. */
function makePlot() {
  return {
    id: nextPlotId++,
    cropType: null,
    plantedSeason: null,
    daysGrown: 0,
    readyToHarvest: false,
    wilted: false,
    wateredToday: false,
  };
}

/** Advances a single plot by one game day given world context. */
function tickPlot(plot, { season, weather }) {
  if (!plot.cropType || plot.wilted) return plot;

  const def = CROP_CATALOGUE[plot.cropType];
  if (!def) return plot;

  const increment = computeGrowthIncrement({
    cropSeasons: def.seasons,
    currentSeason: season,
    weather,
    wateredToday: plot.wateredToday ?? false,
  });

  const nextDaysGrown = plot.daysGrown + increment;
  const daysToMature = def.daysToMature;
  const inSeason = def.seasons.includes(season);

  // Wilt if the crop has been sitting off-season for too long.
  const wiltThreshold = daysToMature * 2;
  const wilted = !inSeason && plot.daysGrown >= wiltThreshold;

  return {
    ...plot,
    daysGrown: wilted ? plot.daysGrown : nextDaysGrown,
    readyToHarvest: !wilted && isReadyToHarvest(nextDaysGrown, daysToMature),
    wilted,
    wateredToday: false,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

const INITIAL_PLOTS = [makePlot(), makePlot(), makePlot()];

export const useSeasonalFarmStore = create((set, get) => ({
  /** Absolute game day (1-based). */
  day: 1,

  /** Current weather: 'sunny' | 'rainy' | 'drought' */
  weather: 'sunny',

  /** Array of plot objects. */
  plots: INITIAL_PLOTS,

  // ── Selectors (non-reactive helpers) ───────────────────────────────────────

  getPlot(id) {
    return get().plots.find((p) => p.id === id) ?? null;
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Plants a crop on an empty plot.
   *
   * @param {number} plotId
   * @param {string} cropType — key in CROP_CATALOGUE
   * @returns {boolean} true on success
   */
  plantCrop(plotId, cropType) {
    if (!CROP_CATALOGUE[cropType]) return false;
    const { day } = get();
    const season = seasonFromDay(day);

    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId && !p.cropType
          ? {
              ...p,
              cropType,
              plantedSeason: season,
              daysGrown: 0,
              readyToHarvest: false,
              wilted: false,
              wateredToday: false,
            }
          : p,
      ),
    }));
    return true;
  },

  /**
   * Waters a specific plot with the watering can.
   * Sets `wateredToday = true`, granting a growth bonus for the next advanceDay.
   *
   * @param {number} plotId
   * @returns {boolean} true on success
   */
  waterPlot(plotId) {
    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId && p.cropType && !p.wilted ? { ...p, wateredToday: true } : p,
      ),
    }));
    return true;
  },

  /**
   * Waters all plots at once (rain event or convenience).
   */
  waterAll() {
    set((s) => ({
      plots: s.plots.map((p) => (p.cropType && !p.wilted ? { ...p, wateredToday: true } : p)),
    }));
  },

  /**
   * Harvests a plot that is ready.
   *
   * @param {number} plotId
   * @returns {{ cropType: string, quantity: number }|null} null if not ready
   */
  harvestCrop(plotId) {
    const plot = get().plots.find((p) => p.id === plotId);
    if (!plot || !plot.readyToHarvest) return null;

    const def = CROP_CATALOGUE[plot.cropType];
    const quantity = def?.yieldQuantity ?? 1;

    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId
          ? {
              ...p,
              cropType: null,
              plantedSeason: null,
              daysGrown: 0,
              readyToHarvest: false,
              wilted: false,
              wateredToday: false,
            }
          : p,
      ),
    }));

    return { cropType: plot.cropType, quantity };
  },

  /**
   * Clears a wilted (or any) plot, making it empty again.
   *
   * @param {number} plotId
   */
  clearPlot(plotId) {
    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId
          ? {
              ...p,
              cropType: null,
              plantedSeason: null,
              daysGrown: 0,
              readyToHarvest: false,
              wilted: false,
              wateredToday: false,
            }
          : p,
      ),
    }));
  },

  /**
   * Adds a new empty plot to the farm.
   */
  addPlot() {
    set((s) => ({ plots: [...s.plots, makePlot()] }));
  },

  /**
   * Advances the world by one day and applies growth to every planted plot.
   * Also auto-waters all plots when weather is 'rainy'.
   *
   * @param {object} [opts]
   * @param {string} [opts.weather] — override weather for this tick; defaults to stored value
   */
  advanceDay(opts) {
    const nextDay = get().day + 1;
    const season = seasonFromDay(nextDay);

    // Allow callers (or tests) to force weather; otherwise roll a simple random.
    const weather = opts?.weather ?? get().weather;

    // Apply rain auto-watering before tick.
    const preTick =
      weather === 'rainy'
        ? get().plots.map((p) => (p.cropType && !p.wilted ? { ...p, wateredToday: true } : p))
        : get().plots;

    const nextPlots = preTick.map((p) => tickPlot(p, { season, weather }));

    // Roll next day's weather with simple seasonal weights.
    const WEIGHTS = {
      spring: { sunny: 5, rainy: 4, drought: 1 },
      summer: { sunny: 6, rainy: 2, drought: 2 },
      fall: { sunny: 4, rainy: 5, drought: 1 },
      winter: { sunny: 3, rainy: 6, drought: 1 },
    };
    const w = WEIGHTS[season] ?? WEIGHTS.spring;
    const total = Object.values(w).reduce((s, v) => s + v, 0);
    let rand = Math.random() * total;
    let nextWeather = 'sunny';
    for (const [k, v] of Object.entries(w)) {
      rand -= v;
      if (rand <= 0) {
        nextWeather = k;
        break;
      }
    }

    set({ day: nextDay, weather: nextWeather, plots: nextPlots });
  },

  /**
   * Forces a specific weather condition (for testing or story events).
   *
   * @param {'sunny'|'rainy'|'drought'} weather
   */
  setWeather(weather) {
    set({ weather });
  },

  /** Resets the farm to a fresh new-game state. */
  reset() {
    nextPlotId = 1;
    set({ day: 1, weather: 'sunny', plots: [makePlot(), makePlot(), makePlot()] });
  },
}));

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__seasonalFarm = useSeasonalFarmStore;
}
