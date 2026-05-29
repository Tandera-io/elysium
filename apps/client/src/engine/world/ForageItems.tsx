import { Suspense } from 'react';
import { useForageStore } from '../../systems/foraging/forageStore';
import { FORAGE_DEFS } from '../../systems/foraging/forageDefs';
import { useZoneStore } from '../../systems/zone/zoneStore';
import { BillboardSprite } from '../loader/BillboardSprite';

function ForageItemMesh({
  spawnId,
  sprite,
  height,
}: {
  spawnId: string;
  sprite: string;
  height: number;
}) {
  const collect = useForageStore((s) => s.collect);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        collect(spawnId);
      }}
    >
      <Suspense fallback={null}>
        <BillboardSprite path={sprite} height={height} billboard />
      </Suspense>
      {/* Invisible click-capture plane at ground level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Renders collectible forage items (stick/stone/herb/berry) as billboards
 * in the Floresta zone. Items disappear once collected.
 */
export function ForageItems() {
  const zone = useZoneStore((s) => s.current);
  const spawns = useForageStore((s) => s.spawns);

  if (zone !== 'floresta') return null;

  return (
    <group>
      {spawns
        .filter((s) => !s.collected)
        .map((s) => {
          const def = FORAGE_DEFS[s.itemId];
          return (
            <group key={s.id} position={[s.x, 0, s.z]}>
              <ForageItemMesh spawnId={s.id} sprite={def.sprite} height={def.height} />
            </group>
          );
        })}
    </group>
  );
}
