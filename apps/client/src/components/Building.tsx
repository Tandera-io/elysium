import type { ReactNode } from 'react';

/**
 * The farmhouse sits at the north-west corner of the farm, slightly offset from
 * the crop tiles so the player can walk around it.
 *
 * World position (-18, 0, 18) places it in the upper-left quadrant of the
 * 50×50 tile grid (tiles run −25 → +25 on each axis).
 *
 * The building is intentionally made of primitive R3F meshes so no external
 * asset is required. Visual structure:
 *   - Walls: a wide, low box (cream/tan)
 *   - Roof: a triangular prism (red-brown)
 *   - Door: a small dark rectangle on the south face
 *   - Windows: two small light-blue squares flanking the door
 *
 * Extend this component when sprite assets become available — swap the mesh
 * bodies for a BillboardSprite or a loaded .glb model.
 */

interface BuildingProps {
  /** World-space position of the building's centre at ground level. */
  x?: number;
  z?: number;
  children?: ReactNode;
}

/** Width, depth, and wall height of the main structure (in world units). */
const W = 4; // east-west
const D = 3; // north-south
const WH = 2; // wall height
const RH = 1.5; // roof ridge height above walls

export function Building({ x = -18, z = 18 }: BuildingProps) {
  return (
    <group position={[x, 0, z]} castShadow>
      {/* ── Walls ────────────────────────────────────────────── */}
      <mesh position={[0, WH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, WH, D]} />
        <meshStandardMaterial color="#e8d8b0" />
      </mesh>

      {/* ── Roof (triangular prism via a scaled box + rotation) ─ */}
      {/*
       * Three.js has no built-in prism, so we use a CylinderGeometry with
       * radialSegments=3 (triangle cross-section). We scale and rotate it so
       * the ridge runs east-west along the top of the walls.
       */}
      <mesh position={[0, WH + RH / 2, 0]} rotation={[0, Math.PI / 6, 0]} castShadow>
        <cylinderGeometry args={[0, W * 0.65, RH, 3, 1]} />
        <meshStandardMaterial color="#8b3a2a" />
      </mesh>

      {/* ── Door (south face, centred) ─────────────────────────── */}
      <mesh position={[0, 0.55, D / 2 + 0.01]} castShadow={false}>
        <boxGeometry args={[0.6, 1.1, 0.02]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>

      {/* ── Window left ─────────────────────────────────────────── */}
      <mesh position={[-1.1, 1.0, D / 2 + 0.01]}>
        <boxGeometry args={[0.55, 0.55, 0.02]} />
        <meshStandardMaterial color="#a8d8ea" transparent opacity={0.8} />
      </mesh>

      {/* ── Window right ────────────────────────────────────────── */}
      <mesh position={[1.1, 1.0, D / 2 + 0.01]}>
        <boxGeometry args={[0.55, 0.55, 0.02]} />
        <meshStandardMaterial color="#a8d8ea" transparent opacity={0.8} />
      </mesh>

      {/* ── Chimney ─────────────────────────────────────────────── */}
      <mesh position={[1.2, WH + RH * 0.75, -0.5]} castShadow>
        <boxGeometry args={[0.35, RH * 0.8, 0.35]} />
        <meshStandardMaterial color="#9e7b5f" />
      </mesh>
    </group>
  );
}
