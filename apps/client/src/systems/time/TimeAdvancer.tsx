import { useFrame } from '@react-three/fiber';
import { useTimeStore } from './timeStore';

/**
 * Empty R3F node that calls timeStore.tick() once per frame with the real
 * frame delta. Mounted inside <Canvas /> next to the rest of the scene.
 */
export function TimeAdvancer() {
  useFrame((_, delta) => {
    useTimeStore.getState().tick(delta);
  });
  return null;
}
