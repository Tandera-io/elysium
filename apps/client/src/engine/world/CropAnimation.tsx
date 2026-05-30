import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface GrowingCropProps {
  stageColor: string;
  /** 0..1 fraction of total maturity */
  progress: number;
}

/** Animated growing-stage crop: bobs gently and scales up as it matures. */
export function GrowingCrop({ stageColor, progress }: GrowingCropProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    // Bob up and down at 1 Hz, amplitude ±0.05
    meshRef.current.position.y = 0.2 + Math.sin(t * 2.0) * 0.05;
    // Grow from half-size to full as progress goes 0 → 1
    const scale = 0.5 + progress * 0.5;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={[0, 0.2, 0]} castShadow>
      <coneGeometry args={[0.15, 0.4, 6]} />
      <meshStandardMaterial color={stageColor} />
    </mesh>
  );
}

/** Golden pulsing indicator shown above harvest-ready crops. */
export function HarvestReadyPulse() {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    // Pulse between 0.8× and 1.2× at 1.5 Hz
    const pulse = 1.0 + Math.sin(t * 1.5 * Math.PI * 2) * 0.2;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={meshRef} position={[0, 1.4, 0]}>
      <sphereGeometry args={[0.08, 6, 6]} />
      <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.6} />
    </mesh>
  );
}
