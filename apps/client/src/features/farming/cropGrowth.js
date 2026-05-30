/**
 * cropGrowth.js — Pure growth calculation helpers for the Elysium farming system.
 *
 * Computes how many days a planted tile actually grows per in-game day,
 * factoring in weather, season suitability, and watering-can bonus.
 *
 * All functions are side-effect-free and can be tested in isolation.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Growth-rate multipliers by weather condition.
 *
 *   rainy   — natural watering accelerates growth
 *   sunny   — baseline (no modifier)
 *   drought — crops struggle without extra water
 */
export const WEATHER_GROWTH_RATE = {
  rainy: 1.5,
  sunny: 1.0,
  drought: 0.5,
};

/**
 * Penalty applied when a crop is grown outside its preferred season.
 * 1.0 = no penalty (in-season), 0.5 = half growth (off-season).
 */
export const SEASON_PENALTY = 0.5;

/**
 * Bonus applied per day when the player has watered this plot today
 * using the watering can (tracked via `wateredToday` flag on a plot).
 */
export const WATERING_CAN_BONUS = 0.2;

// ─── Growth calculation ───────────────────────────────────────────────────────

/**
 * Returns the effective growth increment (in days) for a single plot
 * on one game-day tick.
 *
 * @param {object} params
 * @param {string[]} params.cropSeasons  — seasons the crop can grow in, e.g. ['spring','summer']
 * @param {string}   params.currentSeason — current game season, e.g. 'spring'
 * @param {string}   params.weather       — 'rainy' | 'sunny' | 'drought'
 * @param {boolean}  params.wateredToday  — true if player used the watering can today
 * @returns {number} growth increment to add to daysGrown (may be fractional)
 */
export function computeGrowthIncrement({ cropSeasons, currentSeason, weather, wateredToday }) {
  // Out-of-season crops grow at 50% of whatever the weather-adjusted rate is.
  const inSeason = cropSeasons.includes(currentSeason);
  const seasonMultiplier = inSeason ? 1.0 : SEASON_PENALTY;

  // Base rate from weather.
  const weatherRate = WEATHER_GROWTH_RATE[weather] ?? WEATHER_GROWTH_RATE.sunny;

  // Watering-can bonus stacks additively on top of the base rate.
  const waterBonus = wateredToday ? WATERING_CAN_BONUS : 0;

  return (weatherRate + waterBonus) * seasonMultiplier;
}

/**
 * Returns the visual growth stage index (0-based) for a crop given the
 * number of fractional days it has grown, clamped to the last stage.
 *
 * Stages are evenly distributed across daysToMature; callers may pass
 * a custom stagesCount to override.
 *
 * @param {number} daysGrown     — accumulated growth (may be fractional)
 * @param {number} daysToMature  — total days required to reach harvestable
 * @param {number} [stagesCount=5] — number of visual stages (seed…harvestable)
 * @returns {number} stage index, 0 = seed, stagesCount-1 = harvestable
 */
export function growthStageIndex(daysGrown, daysToMature, stagesCount = 5) {
  if (daysToMature <= 0) return stagesCount - 1;
  const clamped = Math.min(daysGrown, daysToMature);
  const raw = Math.floor((clamped / daysToMature) * stagesCount);
  return Math.min(raw, stagesCount - 1);
}

/**
 * Human-readable label for each growth stage index.
 *
 * Consumers can use this for tooltips or accessibility text.
 *
 * @param {number} stageIndex — value from growthStageIndex()
 * @returns {string}
 */
export function stageName(stageIndex) {
  const NAMES = ['seed', 'sprout', 'young', 'mature', 'harvestable'];
  return NAMES[stageIndex] ?? 'harvestable';
}

/**
 * Returns whether a crop is ready to harvest.
 *
 * @param {number} daysGrown    — accumulated growth
 * @param {number} daysToMature — total days required
 * @returns {boolean}
 */
export function isReadyToHarvest(daysGrown, daysToMature) {
  return daysGrown >= daysToMature;
}

/**
 * Applies one day's worth of growth to a plot object and returns a new
 * (immutable) plot.  Does NOT mutate the input.
 *
 * @param {object} plot — shape compatible with useSeasonalFarmStore plot entries
 * @param {object} context
 * @param {string} context.currentSeason
 * @param {string} context.weather
 * @returns {object} updated plot
 */
export function advancePlotGrowth(plot, { currentSeason, weather }) {
  if (!plot.cropType || plot.wilted) return plot;

  const cropDef = plot._cropDef; // caller must attach _cropDef or pass separately
  const cropSeasons = cropDef?.seasons ?? ['spring', 'summer', 'fall', 'winter'];

  const increment = computeGrowthIncrement({
    cropSeasons,
    currentSeason,
    weather,
    wateredToday: plot.wateredToday ?? false,
  });

  const nextDaysGrown = plot.daysGrown + increment;
  const daysToMature = cropDef?.daysToMature ?? 4;

  // Crops die (wilt) if grown out-of-season for too long.
  // Threshold: if in-season chance and the crop is off-season, it wilts when
  // it would have matured (i.e., total day count reaches daysToMature * 2).
  const inSeason = cropSeasons.includes(currentSeason);
  const wiltThreshold = daysToMature * 2;
  const wilted = !inSeason && plot.daysGrown >= wiltThreshold;

  return {
    ...plot,
    daysGrown: wilted ? plot.daysGrown : nextDaysGrown,
    readyToHarvest: !wilted && nextDaysGrown >= daysToMature,
    wilted,
    // Reset watering bonus — must be re-applied each day.
    wateredToday: false,
  };
}
