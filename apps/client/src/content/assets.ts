/**
 * Asset registry — named slots → cached file paths.
 * 3D assets (.glb) go to `assets/cache/`; 2D sprites (.png) go to `sprites/cache/`.
 *
 * Update entries here after running `pnpm asset:generate` or `pnpm sprite:generate`.
 * Phase 11 will auto-populate this from the cache manifests.
 */
export const ASSETS = {
  player_glb: 'assets/cache/edd51f8ab91d0ebf.glb',
} as const;

export const SPRITES = {
  player: 'sprites/cache/9374eeeb0b8fce10.png',
  marina: 'sprites/cache/8db8c640fad3595a.png',
  bento: 'sprites/cache/c8ceff3648e5624c.png',
  lucia: 'sprites/cache/a33beb04e212c1a9.png',
} as const;

export const DECOR_SPRITES = {
  grass_tuft: 'sprites/cache/0bc489cf949e3dc3.png',
} as const;

export type AssetSlot = keyof typeof ASSETS;
export type SpriteSlot = keyof typeof SPRITES;
