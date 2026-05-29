import { Suspense } from 'react';
import { SpriteAnimator } from '../../engine/loader/SpriteAnimator';
import walkDef from '../../assets/animation/dorinha-walk.json';

function DorinhaFallback() {
  return (
    <mesh castShadow position={[0, 0.5, 0]}>
      <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
      <meshStandardMaterial color="#f4a261" />
    </mesh>
  );
}

/**
 * Renders Dorinha with her walk-cycle animation.
 * @param {boolean} moving - true while Dorinha is travelling between locations.
 */
export function Dorinha({ moving = true }) {
  return (
    <Suspense fallback={<DorinhaFallback />}>
      <SpriteAnimator frames={walkDef.frames} fps={walkDef.fps} playing={moving} height={1.6} />
    </Suspense>
  );
}
