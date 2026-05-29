import { useFrame } from '@react-three/fiber';
import { useNpcStore } from './npcStore';

/**
 * Wander config per NPC. Each NPC drifts in a smooth ellipse around its base
 * position using independent sine/cosine frequencies so the path looks organic.
 * rx/rz are the ellipse radii (world units); fx/fz are angular frequencies.
 */
const WANDER: Record<
  string,
  { bx: number; bz: number; rx: number; rz: number; fx: number; fz: number }
> = {
  dorinha: { bx: 6, bz: 4, rx: 1.5, rz: 1.2, fx: 0.4, fz: 0.3 },
};

/** Drives NPC wandering movement each frame so walk animations become visible. */
export function NpcMover() {
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const store = useNpcStore.getState();
    for (const [id, w] of Object.entries(WANDER)) {
      store.setPosition(id, {
        x: w.bx + Math.sin(t * w.fx) * w.rx,
        z: w.bz + Math.cos(t * w.fz) * w.rz,
      });
    }
  });
  return null;
}
