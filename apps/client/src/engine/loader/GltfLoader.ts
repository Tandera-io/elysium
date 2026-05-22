import { useGLTF } from '@react-three/drei';

/**
 * Re-export of drei's useGLTF with project-level types and conveniences.
 * Asset paths are relative to /public — e.g. 'assets/cache/abc123.glb'.
 */
export function useAsset(path: string) {
  return useGLTF(`/${path}`);
}

/** Preload an asset (call at top-level to avoid Suspense flashes). */
export function preloadAsset(path: string): void {
  useGLTF.preload(`/${path}`);
}
