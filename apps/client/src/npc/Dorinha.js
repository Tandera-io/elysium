/**
 * Dorinha NPC — village greengrocer.
 *
 * This module exports the NPC identifier and schedule/location data. It is
 * plain JS (no React or TypeScript) so it can also be used server-side or in
 * test environments without a bundler.
 *
 * Sprite: public/assets/npcs/dorinha.png (idle)
 * Walk frames: sprites/cache/ (generated via pnpm sprite:generate)
 */

/** Unique identifier for the Dorinha NPC. */
export const DORINHA_ID = 'dorinha';

/**
 * Named world-space (x, z) positions Dorinha visits during the day.
 * Coordinates match the tile grid in WorldGrid.ts.
 */
export const DORINHA_LOCATIONS = {
  /** Her produce stall / shop counter */
  loja_sementes: { x: 6, z: 4 },
  /** Her home at the edge of the village */
  casa_dorinha: { x: 10, z: 8 },
  /** The village square for socialising */
  praca: { x: 0, z: 0 },
};

/**
 * Daily schedule — 6 time windows covering 06:00–22:00.
 * Each entry maps an hour range to a location key and an activity description.
 */
export const DORINHA_SCHEDULE = [
  { from: 6, to: 7, location: 'casa_dorinha', activity: 'acordando e tomando café' },
  { from: 7, to: 12, location: 'loja_sementes', activity: 'atendendo na quitanda' },
  { from: 12, to: 14, location: 'casa_dorinha', activity: 'almoçando' },
  { from: 14, to: 18, location: 'loja_sementes', activity: 'atendendo na quitanda' },
  { from: 18, to: 20, location: 'praca', activity: 'relaxando na praça' },
  { from: 20, to: 22, location: 'casa_dorinha', activity: 'descansando em casa' },
];

/**
 * Returns Dorinha's world-space target position for the given hour (0–23).
 * Outside scheduled windows defaults to her home.
 * @param {number} hour
 * @returns {{ x: number; z: number }}
 */
export function getDorinaTargetPosition(hour) {
  const entry = DORINHA_SCHEDULE.find((s) => hour >= s.from && hour < s.to);
  const locationKey = entry ? entry.location : 'casa_dorinha';
  return DORINHA_LOCATIONS[locationKey];
}

/**
 * Returns a human-readable activity string for the current in-game hour.
 * @param {number} hour
 * @returns {string}
 */
export function getDorinaCurrentActivity(hour) {
  const entry = DORINHA_SCHEDULE.find((s) => hour >= s.from && hour < s.to);
  return entry ? entry.activity : 'dormindo';
}

/**
 * Walk animation sprite frame paths (idle → walk → idle → walk).
 * Frame 0 is the idle sprite; frames 1–3 alternate the walk pose.
 * Must match the cache paths registered in content/assets.ts WALK_CYCLES.dorinha.
 */
export const DORINHA_WALK_FRAMES = [
  'assets/npcs/dorinha.png', // idle  (frame 0)
  'sprites/cache/c2daeecd8b188ac4.png', // walk  (frame 1)
  'assets/npcs/dorinha.png', // idle  (frame 2, sandwich)
  'sprites/cache/c2daeecd8b188ac4.png', // walk  (frame 3)
];

/** Animation playback rate for Dorinha's walk cycle (frames per second). */
export const DORINHA_WALK_FPS = 6;

/**
 * Greeting message shown when the player first approaches Dorinha.
 * Used by InteractPrompt to display above the HUD prompt.
 */
export const DORINHA_GREETING = 'Oi, oi! Bem-vindo à quitanda!';
