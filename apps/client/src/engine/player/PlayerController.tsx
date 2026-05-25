import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { Vector3 } from 'three';
import { useInputRef } from '../input/useInput';
import { usePlayerStore } from '../../store/playerStore';
import { tileToWorld } from '../world/WorldGrid';
import { BillboardSprite } from '../loader/BillboardSprite';
import { SpriteAnimator } from '../loader/SpriteAnimator';
import { SPRITES, WALK_CYCLES } from '../../content/assets';

const Y_GROUND = 0;

/** Plain capsule shown while the sprite textures stream in. */
function PlayerCapsuleFallback() {
  return (
    <>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color="#e9c46a" />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  );
}

function PlayerSprite({ moving }: { moving: boolean }) {
  const cycle = WALK_CYCLES.player;
  if (cycle && cycle.length > 1) {
    return <SpriteAnimator frames={cycle} fps={6} playing={moving} height={1.6} />;
  }
  return <BillboardSprite path={SPRITES.player} height={1.6} />;
}

export function PlayerController() {
  const inputRef = useInputRef();
  const groupRef = useRef<Group>(null);
  const tmp = useMemo(() => new Vector3(), []);
  const cur = useMemo(() => new Vector3(), []);
  // Track whether the player is currently moving so we can toggle the walk
  // animation. React state is updated only on transitions, never every frame.
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);

  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.1);
    const input = inputRef.current;
    const state = usePlayerStore.getState();
    const { position, path, speed } = state;

    let dx = 0;
    let dz = 0;
    if (input.w) dz -= 1;
    if (input.s) dz += 1;
    if (input.a) dx -= 1;
    if (input.d) dx += 1;

    const wasdActive = dx !== 0 || dz !== 0;
    let next = position;

    if (wasdActive) {
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      const rdx = dx * cos45 - dz * sin45;
      const rdz = dx * sin45 + dz * cos45;
      const len = Math.hypot(rdx, rdz);
      const nx = rdx / len;
      const nz = rdz / len;
      const step = speed * delta;
      next = {
        x: position.x + nx * step,
        y: position.y,
        z: position.z + nz * step,
      };
      if (path.length > 0) state.clearPath();
    } else if (path.length > 0) {
      const waypoint = path[0];
      if (waypoint) {
        const w = tileToWorld(waypoint);
        cur.set(position.x, 0, position.z);
        tmp.set(w.x, 0, w.z);
        const dir = tmp.clone().sub(cur);
        const dist = dir.length();
        const step = speed * delta;
        if (dist <= step) {
          next = { x: w.x, y: position.y, z: w.z };
          state.consumeWaypoint();
        } else {
          dir.normalize().multiplyScalar(step);
          next = {
            x: position.x + dir.x,
            y: position.y,
            z: position.z + dir.z,
          };
        }
      }
    }

    const isMovingNow = next !== position;
    if (isMovingNow !== movingRef.current) {
      movingRef.current = isMovingNow;
      setMoving(isMovingNow);
    }

    if (isMovingNow) state.setPosition(next);
    if (groupRef.current) {
      groupRef.current.position.set(next.x, Y_GROUND, next.z);
    }
  });

  return (
    <group ref={groupRef} position={[0, Y_GROUND, 0]}>
      <Suspense fallback={<PlayerCapsuleFallback />}>
        <PlayerSprite moving={moving} />
      </Suspense>
    </group>
  );
}
