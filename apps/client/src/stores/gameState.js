/**
 * gameState.js — Global game-state store for Elysium.
 *
 * Tracks world-level state that is shared across systems:
 *   - Current season and day
 *   - Weather condition (affects crop growth)
 *   - Any other ambient world flags
 *
 * Consumers of the farming system read `season` and `weather` from here
 * rather than from local component state, keeping growth logic consistent.
 */

import { create } from 'zustand';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SEASONS = ['spring', 'summer', 'fall', 'winter'];

/** Days per season. Matches DAYS_PER_SEASON used in the farming store. */
export const DAYS_PER_SEASON = 28;

/**
 * Possible weather conditions.
 * Maps directly to WEATHER_GROWTH_RATE keys in cropGrowth.js.
 */
export const WEATHER_CONDITIONS = ['sunny', 'rainy', 'drought'];

/** Display labels for each season. */
export const SEASON_LABEL = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

// ─── Weather probability table ────────────────────────────────────────────────

/**
 * Rough probability weights for each weather type per season.
 * Used by rollNextDayWeather() to simulate natural weather patterns.
 *
 * Shape: Record<season, Record<weather, weight>>
 */
const WEATHER_WEIGHTS = {
  spring: { sunny: 5, rainy: 4, drought: 1 },
  summer: { sunny: 6, rainy: 2, drought: 2 },
  fall: { sunny: 4, rainy: 5, drought: 1 },
  winter: { sunny: 3, rainy: 6, drought: 1 },
};

/**
 * Weighted random selection from an object of { key: weight } pairs.
 *
 * @param {Record<string, number>} weights
 * @returns {string}
 */
function weightedRandom(weights) {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) return key;
  }
  // Fallback to first key (floating-point safety).
  return Object.keys(weights)[0];
}

// ─── Store ────────────────────────────────────────────────────────────────────

// ─── NPC relationship constants ───────────────────────────────────────────────

/** Max heart level for any NPC. */
export const MAX_HEART_LEVEL = 10;

/** Heart gain amounts for different interaction types. */
export const HEART_GAIN = {
  talk: 1,
  giftLiked: 5,
  giftDisliked: -2,
  questComplete: 3,
};

// ─── Default NPC relationship state ──────────────────────────────────────────

/**
 * Default relationship entry for a single NPC.
 * heartLevel 0–10, daysTalked counts unique talk days.
 */
function makeNpcRelEntry() {
  return { heartLevel: 0, daysTalked: 0, lastTalkedDay: 0 };
}

const DEFAULT_STATE = {
  /** Absolute game day, starting at 1. */
  day: 1,
  /** Current season derived from day. */
  season: 'spring',
  /** Day number within the current season (1-based). */
  dayInSeason: 1,
  /** Year number (1-based). */
  year: 1,
  /** Current weather condition. */
  weather: 'sunny',
  /** Whether the game clock is paused (e.g., on title screen). */
  paused: false,
  /**
   * Per-NPC relationship state. Tracks heart level and talk history.
   * Heart level gates special dialogue lines in ferraz.ts and other dialogue files.
   */
  npcRelationships: {
    ferraz: makeNpcRelEntry(),
    marina: makeNpcRelEntry(),
    bento: makeNpcRelEntry(),
    lucia: makeNpcRelEntry(),
    dorinha: makeNpcRelEntry(),
    nina: makeNpcRelEntry(),
    arnaldo: makeNpcRelEntry(),
  },
};

export const useGameStateStore = create((set, get) => ({
  ...DEFAULT_STATE,

  /**
   * Advances the world by one game day.
   * Updates season/dayInSeason/year derived values and rolls new weather.
   */
  advanceDay() {
    const nextDay = get().day + 1;
    const nextSeason = SEASONS[Math.floor((nextDay - 1) / DAYS_PER_SEASON) % SEASONS.length];
    const nextDayInSeason = ((nextDay - 1) % DAYS_PER_SEASON) + 1;
    const nextYear = Math.floor((nextDay - 1) / (DAYS_PER_SEASON * SEASONS.length)) + 1;
    const nextWeather = weightedRandom(WEATHER_WEIGHTS[nextSeason] ?? WEATHER_WEIGHTS.spring);

    set({
      day: nextDay,
      season: nextSeason,
      dayInSeason: nextDayInSeason,
      year: nextYear,
      weather: nextWeather,
    });
  },

  /**
   * Forces weather to a specific condition (for testing or story events).
   *
   * @param {'sunny'|'rainy'|'drought'} weather
   */
  setWeather(weather) {
    if (!WEATHER_CONDITIONS.includes(weather)) return;
    set({ weather });
  },

  /** Pauses or resumes the game clock. */
  setPaused(paused) {
    set({ paused });
  },

  /**
   * Records a talk interaction with an NPC.
   * Grants +1 heart once per day. Updates daysTalked count.
   *
   * @param {string} npcId
   */
  talkToNpc(npcId) {
    const rels = get().npcRelationships;
    const entry = rels[npcId];
    if (!entry) return;
    const currentDay = get().day;
    const alreadyTalkedToday = entry.lastTalkedDay === currentDay;
    set({
      npcRelationships: {
        ...rels,
        [npcId]: {
          heartLevel: alreadyTalkedToday
            ? entry.heartLevel
            : Math.min(MAX_HEART_LEVEL, entry.heartLevel + HEART_GAIN.talk),
          daysTalked: alreadyTalkedToday ? entry.daysTalked : entry.daysTalked + 1,
          lastTalkedDay: currentDay,
        },
      },
    });
  },

  /**
   * Applies heart gain/loss from gifting an NPC.
   *
   * @param {string} npcId
   * @param {'liked'|'disliked'} giftType
   */
  giftNpc(npcId, giftType) {
    const rels = get().npcRelationships;
    const entry = rels[npcId];
    if (!entry) return;
    const delta = giftType === 'liked' ? HEART_GAIN.giftLiked : HEART_GAIN.giftDisliked;
    set({
      npcRelationships: {
        ...rels,
        [npcId]: {
          ...entry,
          heartLevel: Math.max(0, Math.min(MAX_HEART_LEVEL, entry.heartLevel + delta)),
        },
      },
    });
  },

  /**
   * Returns the current heart level for an NPC (0–10).
   *
   * @param {string} npcId
   * @returns {number}
   */
  getNpcHeartLevel(npcId) {
    return get().npcRelationships[npcId]?.heartLevel ?? 0;
  },

  /** Resets world state to new-game defaults. */
  reset() {
    set({ ...DEFAULT_STATE });
  },
}));

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__gameState = useGameStateStore;
}
