/** Dorinha — quitandeira do vilarejo. Spawns at tile (6, 4) on the farm. */
export const DORINHA_ID = 'dorinha' as const;
export const DORINHA_SPAWN = { x: 6, z: 4 } as const;
export const DORINHA_SPRITE = 'sprites/cache/86c32aed8fdfe173.png' as const;

/** Walk animation frames for Dorinha (registered in WALK_CYCLES in assets.ts). */
export const DORINHA_WALK_CYCLE = [
  'sprites/cache/86c32aed8fdfe173.png', // idle (frame 0)
  'sprites/cache/7ca40c4410ad1460.png', // walk 1 (left leg forward)
  'sprites/cache/86c32aed8fdfe173.png', // idle (frame 2 = sandwich)
  'sprites/cache/c2daeecd8b188ac4.png', // walk 2 (right leg forward)
] as const;
