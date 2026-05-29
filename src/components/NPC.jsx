/**
 * NPC.jsx — Stardew-style NPC billboard component.
 *
 * Renders an NPC as a 2-D pixel-art billboard in the R3F scene.
 * Currently exposes Dorinha (seed seller) as a ready-to-use preset.
 *
 * Usage:
 *   import { NPC, DorinhaSprite } from './NPC';
 *
 *   // Custom NPC
 *   <NPC spritePath="sprites/cache/b81d4a16ebc22bba.png" position={[6, 0, -8]} height={1.6} />
 *
 *   // Dorinha preset
 *   <DorinhaSprite />
 */

import { Suspense } from 'react';
import { Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Dorinha's cached sprite — generated 2026-05-29
export const DORINHA_SPRITE = 'sprites/cache/b81d4a16ebc22bba.png';

/** Capsule fallback shown while the texture loads or on error. */
function NpcCapsule({ color = '#d35a5a' }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

/** Renders a single pixel-art sprite as a billboarded plane. */
function NpcBillboard({ spritePath, height = 1.6 }) {
  const texture = useTexture(`/${spritePath}`);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = height * aspect;

  return (
    <Billboard follow lockX={false} lockY lockZ={false}>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

/**
 * NPC — generic billboard NPC component.
 *
 * @param {string}  spritePath  Path relative to public/ (e.g. "sprites/cache/xxx.png")
 * @param {[x,y,z]} position    World-space position (default [0,0,0])
 * @param {number}  height      Sprite height in world units (default 1.6)
 */
export function NPC({ spritePath, position = [0, 0, 0], height = 1.6 }) {
  return (
    <group position={position}>
      <Suspense fallback={<NpcCapsule />}>
        <NpcBillboard spritePath={spritePath} height={height} />
      </Suspense>
    </group>
  );
}

/**
 * DorinhaSprite — ready-to-use preset for Dorinha the seed seller.
 * Placed at her canonical world position (x:6, z:-8).
 */
export function DorinhaSprite({ position = [6, 0, -8], height = 1.6 }) {
  return <NPC spritePath={DORINHA_SPRITE} position={position} height={height} />;
}

export default NPC;
