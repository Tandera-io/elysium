/**
 * Dorinha NPC — village greengrocer (quitandeira).
 *
 * Plain JS module — no TypeScript or framework dependencies — usable
 * server-side, in tests, or by the client bundler without a TS toolchain.
 */

/** Unique identifier matching content/npcs/dorinha.json */
export const DORINHA_ID = 'dorinha';

/** Named world-space (x, z) positions Dorinha visits during the day. */
export const DORINHA_LOCATIONS = {
  loja_sementes: { x: 6, z: 4 },
  casa_dorinha: { x: 10, z: 8 },
  praca: { x: 0, z: 0 },
};

/** Daily schedule — hour ranges covering 06:00–22:00. */
export const DORINHA_SCHEDULE = [
  { from: 6, to: 7, location: 'casa_dorinha', activity: 'acordando e tomando café' },
  { from: 7, to: 12, location: 'loja_sementes', activity: 'atendendo na quitanda' },
  { from: 12, to: 14, location: 'casa_dorinha', activity: 'almoçando' },
  { from: 14, to: 18, location: 'loja_sementes', activity: 'atendendo na quitanda' },
  { from: 18, to: 20, location: 'praca', activity: 'relaxando na praça' },
  { from: 20, to: 22, location: 'casa_dorinha', activity: 'descansando em casa' },
];

/**
 * Returns Dorinha's world-space target position for the given in-game hour (0–23).
 * Defaults to her home outside scheduled windows.
 * @param {number} hour
 * @returns {{ x: number; z: number }}
 */
export function getDorinaTargetPosition(hour) {
  const entry = DORINHA_SCHEDULE.find((s) => hour >= s.from && hour < s.to);
  return DORINHA_LOCATIONS[entry ? entry.location : 'casa_dorinha'];
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

/** Walk animation sprite frame paths (idle → step → idle → step). */
export const DORINHA_WALK_FRAMES = [
  'sprites/cache/86c32aed8fdfe173.png',
  'sprites/cache/c2daeecd8b188ac4.png',
  'sprites/cache/86c32aed8fdfe173.png',
  'sprites/cache/7ca40c4410ad1460.png',
];

/** Walk animation playback rate in frames per second. */
export const DORINHA_WALK_FPS = 6;
