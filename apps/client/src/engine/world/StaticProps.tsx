import { Suspense } from 'react';
import { BillboardSprite } from '../loader/BillboardSprite';
import { PROPS } from '../../content/props';

/**
 * Renders the static prop placements as sprite billboards. Each prop sits in
 * its own Suspense boundary so a missing PNG (registry pointing to a
 * placeholder) just shows nothing rather than crashing the scene.
 */
export function StaticProps() {
  return (
    <group>
      {PROPS.map((p) => {
        // Skip placeholder entries until the real sprite is generated
        if (p.sprite.includes('__')) return null;
        return (
          <group key={p.id} position={[p.x, 0, p.z]}>
            <Suspense fallback={null}>
              <BillboardSprite path={p.sprite} height={p.height} billboard={p.billboard ?? true} />
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}
