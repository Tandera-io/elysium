/**
 * Asset registry — named slots → cached GLB paths.
 * Paths are relative to /public so they can be passed directly to useGLTF('/...').
 *
 * Update entries here after running `pnpm asset:generate`. Phase 11 will
 * auto-populate this from the cache manifests.
 */
export const ASSETS = {
  player: 'assets/cache/edd51f8ab91d0ebf.glb',
} as const;

export type AssetSlot = keyof typeof ASSETS;
