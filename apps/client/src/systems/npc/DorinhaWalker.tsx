import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState } from 'react';
import { Group, Vector3 } from 'three';
import { SpriteAnimator } from '../../engine/loader/SpriteAnimator';
import { WALK_CYCLES } from '../../content/assets';
import { usePlayerStore } from '../../store/playerStore';
import { useNpcStore } from './npcStore';

/** World-space patrol waypoints Dorinha paces between on the farm. */
const PATROL: ReadonlyArray<{ x: number; z: number }> = [
  { x: 6, z: 4 },
  { x: 8, z: 4 },
  { x: 8, z: 6 },
  { x: 6, z: 6 },
];

/** Dorinha stops patrolling and stands idle when the player is within this range. */
const PROXIMITY_STOP = 3.5;

const SPEED = 1.5; // world units per second

/** Capsule fallback while sprite textures load. */
function DorinhaFallback() {
  return (
    <>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color="#d35a5a" />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  );
}

/**
 * Renders Dorinha as an animated sprite that patrols her farm waypoints.
 * She pauses and stands idle whenever the player approaches within PROXIMITY_STOP units.
 *
 * Movement is driven inside useFrame (no React state per tick) and synced to
 * npcStore so other systems (e.g. interaction.ts) always see her real position.
 */
export function DorinhaWalker() {
  const groupRef = useRef<Group>(null);
  const setPosition = useNpcStore((s) => s.setPosition);

  // Mutable refs so useFrame never triggers a React re-render mid-flight.
  const waypointIndex = useRef(0);
  // PATROL is non-empty by construction; the non-null assertion is intentional.

  const pos = useMemo(() => new Vector3(PATROL[0]!.x, 0, PATROL[0]!.z), []);
  const tmp = useMemo(() => new Vector3(), []);

  // Single React state bit drives SpriteAnimator; updated only on transitions.
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);

  useFrame((_, deltaRaw) => {
    // Cap delta so a frozen frame doesn't teleport Dorinha across the map.
    const delta = Math.min(deltaRaw, 0.1);

    const player = usePlayerStore.getState().position;
    const playerDist = Math.hypot(player.x - pos.x, player.z - pos.z);
    const playerNear = playerDist < PROXIMITY_STOP;

    let isMovingNow = false;

    if (!playerNear) {
      const target = PATROL[waypointIndex.current % PATROL.length];
      if (target) {
        tmp.set(target.x, 0, target.z);
        const dir = tmp.clone().sub(pos);
        const dist = dir.length();
        const step = SPEED * delta;

        if (dist <= step) {
          // Snap to waypoint and advance to next.
          pos.set(target.x, 0, target.z);
          waypointIndex.current = (waypointIndex.current + 1) % PATROL.length;
        } else {
          dir.normalize().multiplyScalar(step);
          pos.add(dir);
          isMovingNow = true;
        }
      }
    }

    // Sync Three.js group position.
    if (groupRef.current) {
      groupRef.current.position.set(pos.x, 0, pos.z);
    }

    // Sync npcStore so interaction.ts sees her live position for G-key shop trigger.
    setPosition('dorinha', { x: pos.x, z: pos.z });

    // Only call setMoving on state transitions to avoid unnecessary re-renders.
    if (isMovingNow !== movingRef.current) {
      movingRef.current = isMovingNow;
      setMoving(isMovingNow);
    }
  });

  const frames = WALK_CYCLES.dorinha ?? [];

  return (
    <group ref={groupRef} position={[PATROL[0]!.x, 0, PATROL[0]!.z]}>
      <Suspense fallback={<DorinhaFallback />}>
        <SpriteAnimator frames={frames} fps={5} playing={moving} height={1.6} />
      </Suspense>
    </group>
  );
}
