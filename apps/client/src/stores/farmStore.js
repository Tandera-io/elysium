// apps/client/src/stores/farmStore.js
//
// Zustand store for farm plot UI state — tracks individual plot instances
// that a player owns, their current planting status, and provides actions
// to plant seeds and harvest crops.
//
// This store works alongside the canonical TypeScript farmStore.ts
// (apps/client/src/systems/farming/farmStore.ts), which handles the
// tile-grid simulation. This store manages named "plot" entities that
// map to UI cards shown in FarmPlot.jsx.
//
// Plot states:
//   'empty'    — tilled and ready to plant
//   'growing'  — seed planted, days elapsed < growTime
//   'ready'    — fully grown, ready to harvest

import { create } from 'zustand';
import CROPS_DATA from '../data/crops.json';

export const CROP_DEFS = Object.fromEntries(CROPS_DATA.crops.map((c) => [c.id, c]));

/**
 * @typedef {'empty' | 'growing' | 'ready'} PlotStatus
 *
 * @typedef {Object} FarmPlot
 * @property {string}      id          — unique plot id (e.g. 'plot_0')
 * @property {PlotStatus}  status      — current state of the plot
 * @property {string|null} cropId      — id of the planted crop, or null
 * @property {number}      daysGrown   — days elapsed since planting
 * @property {number}      plantedDay  — game day the crop was planted
 */

/**
 * @typedef {Object} FarmStoreState
 * @property {FarmPlot[]} plots
 * @property {number}     currentDay
 */

/**
 * @typedef {Object} FarmStoreActions
 * @property {(plotId: string, cropId: string, currentDay: number) => boolean} plant
 * @property {(plotId: string) => { cropId: string; quantity: number } | null} harvest
 * @property {(season?: string) => void} advanceDay
 * @property {(count: number) => void} initPlots
 * @property {() => void} reset
 */

const PLOT_COUNT = 6;

function makePlot(index) {
  return {
    id: `plot_${index}`,
    status: 'empty',
    cropId: null,
    daysGrown: 0,
    plantedDay: 0,
  };
}

function makePlots(count) {
  return Array.from({ length: count }, (_, i) => makePlot(i));
}

export const useFarmStore = create((set, get) => ({
  plots: makePlots(PLOT_COUNT),
  currentDay: 1,

  /**
   * Plant a crop in a plot. Returns true on success.
   * @param {string} plotId
   * @param {string} cropId
   * @param {number} currentDay
   */
  plant: (plotId, cropId, currentDay) => {
    const plot = get().plots.find((p) => p.id === plotId);
    if (!plot || plot.status !== 'empty') return false;
    if (!CROP_DEFS[cropId]) return false;

    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId
          ? {
              ...p,
              status: 'growing',
              cropId,
              daysGrown: 0,
              plantedDay: currentDay ?? s.currentDay,
            }
          : p,
      ),
    }));
    return true;
  },

  /**
   * Harvest a ready plot. Returns { cropId, quantity } or null.
   * @param {string} plotId
   */
  harvest: (plotId) => {
    const plot = get().plots.find((p) => p.id === plotId);
    if (!plot || plot.status !== 'ready') return null;

    const def = CROP_DEFS[plot.cropId];
    if (!def) return null;

    const result = { cropId: plot.cropId, quantity: def.sellPrice > 40 ? 1 : 2 };

    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId ? { ...makePlot(Number(p.id.replace('plot_', ''))) } : p,
      ),
    }));

    return result;
  },

  /**
   * Advance all growing plots by one day. Crops that reach growTime
   * transition to 'ready'. Out-of-season crops wilt (return to 'empty').
   * @param {string} [season]
   */
  advanceDay: (season) => {
    set((s) => {
      const nextDay = s.currentDay + 1;
      const plots = s.plots.map((p) => {
        if (p.status !== 'growing') return p;

        const def = CROP_DEFS[p.cropId];
        if (!def) return { ...p, status: 'empty', cropId: null, daysGrown: 0 };

        // Wilt if out of season
        if (season && !def.seasons.includes(season)) {
          return { ...p, status: 'empty', cropId: null, daysGrown: 0, plantedDay: 0 };
        }

        const nextDaysGrown = p.daysGrown + 1;
        const nextStatus = nextDaysGrown >= def.growTime ? 'ready' : 'growing';

        return { ...p, daysGrown: nextDaysGrown, status: nextStatus };
      });
      return { currentDay: nextDay, plots };
    });
  },

  /**
   * Initialise the store with `count` empty plots.
   * @param {number} count
   */
  initPlots: (count) => {
    set({ plots: makePlots(count) });
  },

  reset: () => set({ plots: makePlots(PLOT_COUNT), currentDay: 1 }),
}));

if (typeof globalThis !== 'undefined' && import.meta.env?.DEV) {
  /** @type {any} */ (globalThis).__farmStore = useFarmStore;
}
