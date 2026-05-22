import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Color, DirectionalLight, AmbientLight, Fog } from 'three';
import { useTimeStore } from '../../systems/time/timeStore';

type RGB = [number, number, number];

const KEYS: { hour: number; sun: RGB; ambient: RGB; sky: RGB; sunIntensity: number }[] = [
  {
    hour: 0,
    sun: [0.18, 0.22, 0.45],
    ambient: [0.16, 0.18, 0.3],
    sky: [0.05, 0.08, 0.16],
    sunIntensity: 0.15,
  },
  {
    hour: 5,
    sun: [0.55, 0.4, 0.4],
    ambient: [0.3, 0.28, 0.35],
    sky: [0.55, 0.45, 0.5],
    sunIntensity: 0.5,
  },
  {
    hour: 7,
    sun: [1.0, 0.85, 0.7],
    ambient: [0.55, 0.55, 0.55],
    sky: [0.7, 0.85, 0.95],
    sunIntensity: 1.1,
  },
  {
    hour: 12,
    sun: [1.0, 0.98, 0.92],
    ambient: [0.65, 0.65, 0.65],
    sky: [0.5, 0.75, 0.95],
    sunIntensity: 1.3,
  },
  {
    hour: 17,
    sun: [1.0, 0.78, 0.5],
    ambient: [0.55, 0.5, 0.45],
    sky: [0.9, 0.6, 0.4],
    sunIntensity: 1.0,
  },
  {
    hour: 20,
    sun: [0.45, 0.35, 0.5],
    ambient: [0.25, 0.25, 0.35],
    sky: [0.18, 0.15, 0.3],
    sunIntensity: 0.3,
  },
  {
    hour: 24,
    sun: [0.18, 0.22, 0.45],
    ambient: [0.16, 0.18, 0.3],
    sky: [0.05, 0.08, 0.16],
    sunIntensity: 0.15,
  },
];

function interp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function interpRGB(a: RGB, b: RGB, t: number): RGB {
  return [interp(a[0], b[0], t), interp(a[1], b[1], t), interp(a[2], b[2], t)];
}

function sampleAt(hour: number): { sun: RGB; ambient: RGB; sky: RGB; sunIntensity: number } {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i]!;
    const b = KEYS[i + 1]!;
    if (hour >= a.hour && hour <= b.hour) {
      const t = (hour - a.hour) / Math.max(0.001, b.hour - a.hour);
      return {
        sun: interpRGB(a.sun, b.sun, t),
        ambient: interpRGB(a.ambient, b.ambient, t),
        sky: interpRGB(a.sky, b.sky, t),
        sunIntensity: interp(a.sunIntensity, b.sunIntensity, t),
      };
    }
  }
  const fallback = KEYS[0]!;
  return {
    sun: fallback.sun,
    ambient: fallback.ambient,
    sky: fallback.sky,
    sunIntensity: fallback.sunIntensity,
  };
}

/** Animates the sun, ambient, and sky background based on the in-game hour. */
export function Daylight() {
  const sunRef = useRef<DirectionalLight>(null);
  const ambRef = useRef<AmbientLight>(null);

  useFrame(({ scene }) => {
    const hour = useTimeStore.getState().hour;
    const s = sampleAt(hour);

    if (sunRef.current) {
      (sunRef.current.color as Color).setRGB(s.sun[0], s.sun[1], s.sun[2]);
      sunRef.current.intensity = s.sunIntensity;
      // Move sun angle with hour: sweeps across sky
      const sunAngle = ((hour - 6) / 12) * Math.PI; // 6h → 0, 18h → π
      const dist = 40;
      sunRef.current.position.set(
        Math.cos(sunAngle) * dist,
        Math.max(2, Math.sin(sunAngle) * dist),
        10,
      );
    }
    if (ambRef.current) {
      (ambRef.current.color as Color).setRGB(s.ambient[0], s.ambient[1], s.ambient[2]);
    }
    const bg = scene.background;
    if (bg && 'isColor' in bg) {
      (bg as Color).setRGB(s.sky[0], s.sky[1], s.sky[2]);
    }
    const fog = scene.fog as Fog | null;
    if (fog && 'color' in fog) {
      (fog.color as Color).setRGB(s.sky[0], s.sky[1], s.sky[2]);
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.6} />
      <directionalLight
        ref={sunRef}
        position={[20, 40, 10]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
    </>
  );
}
