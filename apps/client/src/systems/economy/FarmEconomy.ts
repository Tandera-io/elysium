/**
 * Centralised farm economy constants.
 *
 * Tuning rationale (net gold per day per plot):
 *   wheat      4d × 2y: ~20 g/day  — intro crop, low risk
 *   corn       6d × 3y: ~23 g/day  — dependable mid-tier
 *   tomato     5d × 3y: ~30 g/day  — reliable mid-game
 *   pumpkin    7d × 1y: ~17 g/day  — slow prestige crop
 *   strawberry 3d × 4y: ~34 g/day  — fast premium, high seed cost
 *
 * The spread gives players meaningful choices at each stage of progression.
 * All seed prices are in the 20-50 g range and crop sell prices in the 35-160 g
 * range, matching the economy-flow knowledge doc (seeds 10-30 g target was a
 * baseline; bumped here to keep profit ratios sustainable).
 */

/** Player buys these seeds from Dorinha or Nina. */
export const SEED_BUY_PRICE = {
  seed_wheat: 20,
  seed_tomato: 30,
  seed_corn: 25,
  seed_pumpkin: 40,
  seed_strawberry: 50,
} as const satisfies Record<string, number>;

/** Player sells harvested crops to Dorinha. */
export const CROP_SELL_PRICE = {
  wheat: 50,
  tomato: 60,
  corn: 55,
  pumpkin: 160,
  strawberry: 38,
} as const satisfies Record<string, number>;

/** Player buys tools and consumables from Nina. */
export const TOOL_PRICE = {
  watering_can: 200,
  hoe: 160,
  basket: 80,
  fertilizer: 30,
} as const satisfies Record<string, number>;
