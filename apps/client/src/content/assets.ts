/**
 * Asset registry — named slots → cached file paths.
 * 3D assets (.glb) go to `assets/cache/`; 2D sprites (.png) go to `sprites/cache/`.
 *
 * Update entries here after running `pnpm asset:generate` or `pnpm sprite:generate`.
 */

export const ASSETS = {
  player_glb: 'assets/cache/edd51f8ab91d0ebf.glb',
} as const;

/** Character sprites — used by PlayerController and NpcView. */
export const SPRITES = {
  player: 'sprites/cache/9374eeeb0b8fce10.png',
  marina: 'sprites/cache/8db8c640fad3595a.png',
  bento: 'sprites/cache/c8ceff3648e5624c.png',
  lucia: 'sprites/cache/a33beb04e212c1a9.png',
  dorinha: 'sprites/cache/7ca40c4410ad1460.png',
  nina: 'sprites/cache/e1f80277e6826d74.png',
} as const;

/** Walk animation frames — generated via /images/edits using the idle sprite
 *  as reference. Element 0 must be the idle sprite (same as SPRITES.<id>).
 *  Animator alternates through these while the character is in motion. */
export const WALK_CYCLES: Partial<Record<keyof typeof SPRITES, string[]>> = {
  player: [
    'sprites/cache/9374eeeb0b8fce10.png', // idle (frame 0)
    'sprites/cache/8d66aff919a59d28.png', // walk 1 (left leg forward)
    'sprites/cache/9374eeeb0b8fce10.png', // idle (frame 2 = sandwich)
    'sprites/cache/368ae9f815b40a8a.png', // walk 2 (right leg forward)
  ],
  dorinha: [
    'sprites/cache/7ca40c4410ad1460.png', // idle (frame 0)
    'sprites/cache/c2daeecd8b188ac4.png', // walk frame
  ],
  nina: [
    'sprites/cache/e1f80277e6826d74.png', // idle (frame 0)
    'sprites/cache/0c5784a31d4297dd.png', // walk frame
  ],
};

/**
 * Growth-stage sprites per crop — ordered from seed (index 0) to just-before-mature.
 * Each entry is a path relative to the public root.
 * Used by CropGrowthStageSprite to animate the crop growing in the 3D world.
 * Paths are populated once growth-stage art is generated; empty arrays are safe
 * (the component falls back to the seed placeholder).
 */
export const CROP_GROWTH_SPRITES: Record<string, string[]> = {
  wheat: [],
  tomato: [],
  pumpkin: [],
  corn: [],
  strawberry: [],
} as const;

/** Ripe crop sprites — used by FarmField when a planted tile reaches mature. */
export const CROP_SPRITES = {
  wheat: 'sprites/cache/8dcc7821fa994510.png',
  tomato: 'sprites/cache/66a40e7375e8ec02.png',
  pumpkin: 'sprites/cache/578af9e39f7a8032.png',
  corn: 'sprites/cache/a62ca1163dad688c.png',
  strawberry: 'sprites/cache/3b00a3aef9e1abcf.png',
} as const;

/** Ground tile textures — 1024×1024 tileable PNGs with opaque background. */
export const TILE_TEXTURES = {
  grass: 'sprites/cache/5da46cb2379b570d.png',
  tilled: 'sprites/cache/c9c0756782d6b583.png',
  watered: 'sprites/cache/2a6a2a13cf05aa32.png',
} as const;

/** Decorative props (overlays, not main characters). */
export const DECOR_SPRITES = {
  grass_tuft: 'sprites/cache/0bc489cf949e3dc3.png',
} as const;

export type AssetSlot = keyof typeof ASSETS;
export type SpriteSlot = keyof typeof SPRITES;
export type CropSpriteSlot = keyof typeof CROP_SPRITES;
export type TileTextureSlot = keyof typeof TILE_TEXTURES;
