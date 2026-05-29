import { Suspense } from 'react';
import { useZoneStore } from '../systems/zone/zoneStore';
import { BillboardSprite } from '../engine/loader/BillboardSprite';

const ROCK = 'sprites/cache/e2d147293d41cc07.png';

/**
 * Renders the mine entrance billboard in the floresta zone.
 * Positioned at x=0, z=-12 (north edge). Player proximity triggers
 * the MinePortalPrompt UI overlay which handles the M-key interaction.
 */
export function MineEntrance() {
  const zone = useZoneStore((s) => s.current);
  if (zone !== 'floresta') return null;

  return (
    <group position={[0, 0, -12]}>
      <Suspense fallback={null}>
        <BillboardSprite path={ROCK} height={2.2} />
      </Suspense>
      {/* Dark cave opening overlay using a flat box */}
      <mesh position={[0, 0.6, 0.05]}>
        <boxGeometry args={[1.4, 1.2, 0.05]} />
        <meshStandardMaterial color="#0a0604" />
      </mesh>
    </group>
  );
}
