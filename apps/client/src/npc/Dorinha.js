/**
 * Dorinha — walk schedule and movement path data.
 *
 * This module exports the world-space waypoints that correspond to Dorinha's
 * daily schedule locations, and a helper that resolves her current target
 * position given the in-game hour. The TypeScript component (Dorinha.tsx)
 * handles rendering; this file handles the schedule-driven movement logic
 * so it can be imported without the React/Three.js build pipeline (e.g.
 * in server-side simulation or tests).
 *
 * Coordinate system: X/Z world-space, matching npcStore worldPos.
 * Locations are approximate tile centers derived from the world layout.
 */

/** Named locations in world-space (x, z). */
export const DORINHA_LOCATIONS = {
  casa_dorinha: { x: -10, z: -12 },
  loja_sementes: { x: -6, z: -8 }, // matches def.position
  praca: { x: 0, z: 0 },
};

/**
 * Dorinha's daily schedule: each entry maps a time window to a world location.
 * Times are in decimal hours (e.g. 7.5 = 07:30).
 */
export const DORINHA_SCHEDULE = [
  { from: 6, to: 7, location: 'casa_dorinha', activity: 'acordar' },
  { from: 7, to: 12, location: 'loja_sementes', activity: 'vender' },
  { from: 12, to: 14, location: 'praca', activity: 'almoco' },
  { from: 14, to: 18, location: 'loja_sementes', activity: 'atender' },
  { from: 18, to: 20, location: 'praca', activity: 'socializar' },
  { from: 20, to: 22, location: 'casa_dorinha', activity: 'descanso' },
];

/**
 * Returns the target world position for Dorinha at the given in-game hour.
 *
 * @param {number} hour - Decimal hour in [0, 24).
 * @returns {{ x: number, z: number }} World-space target position.
 */
export function getDorinaTargetPosition(hour) {
  const entry = DORINHA_SCHEDULE.find((e) => hour >= e.from && hour < e.to);
  const locationKey = entry ? entry.location : 'casa_dorinha';
  return DORINHA_LOCATIONS[locationKey] ?? DORINHA_LOCATIONS.casa_dorinha;
}

/**
 * Returns the name of Dorinha's current activity at the given hour.
 *
 * @param {number} hour - Decimal hour in [0, 24).
 * @returns {string} Activity name.
 */
export function getDorinaCurrentActivity(hour) {
  const entry = DORINHA_SCHEDULE.find((e) => hour >= e.from && hour < e.to);
  return entry ? entry.activity : 'descanso';
}

/**
 * Walk animation frame paths (relative to public/).
 * Matches WALK_CYCLES.dorinha in content/assets.ts — kept in sync manually.
 * Frame order: idle → left-leg-forward → idle → right-leg-forward.
 */
export const DORINHA_WALK_FRAMES = [
  'sprites/cache/86c32aed8fdfe173.png', // frame 0: idle
  'sprites/cache/c2daeecd8b188ac4.png', // frame 1: left leg forward
  'sprites/cache/86c32aed8fdfe173.png', // frame 2: idle (sandwich)
  'sprites/cache/7ca40c4410ad1460.png', // frame 3: right leg forward
];

/** Frames per second for the walk animation. */
export const DORINHA_WALK_FPS = 6;
