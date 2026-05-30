/**
 * WeatherEffect — R3F instanced-particle overlay for rain, snow, and wind.
 *
 * Renders up to MAX_PARTICLES instanced billboard quads that drift downward
 * (rain/snow) or diagonally (stormy/windy). The particle count and fall speed
 * scale with `weather.intensity`.
 *
 * Only active weather types produce visible particles; sunny/cloudy return null.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, MeshBasicMaterial, PlaneGeometry, Color } from 'three';
import { useTimeStore } from '../../systems/time/timeStore';

const MAX_PARTICLES = 600;
const dummy = new Object3D();

interface ParticleConfig {
  count: number;
  fallSpeed: number;
  driftX: number;
  size: number;
  color: string;
  opacity: number;
  spread: number;
  height: number;
}

function getConfig(type: string, intensity: number): ParticleConfig | null {
  const base = intensity;
  switch (type) {
    case 'rainy':
      return {
        count: Math.floor(250 * base),
        fallSpeed: 14 + 4 * base,
        driftX: -0.5 * base,
        size: 0.04,
        color: '#aaccff',
        opacity: 0.55,
        spread: 30,
        height: 20,
      };
    case 'stormy':
      return {
        count: Math.floor(400 * base),
        fallSpeed: 20 + 8 * base,
        driftX: -2.5 * base,
        size: 0.05,
        color: '#7799cc',
        opacity: 0.65,
        spread: 35,
        height: 25,
      };
    case 'snowy':
      return {
        count: Math.floor(300 * base),
        fallSpeed: 3 + 1 * base,
        driftX: 0.3 * base,
        size: 0.12,
        color: '#eef4ff',
        opacity: 0.75,
        spread: 30,
        height: 18,
      };
    case 'windy':
      return {
        count: Math.floor(150 * base),
        fallSpeed: 5 + 2 * base,
        driftX: 4.0 * base,
        size: 0.08,
        color: '#e8dfc0',
        opacity: 0.35,
        spread: 32,
        height: 16,
      };
    default:
      return null;
  }
}

export function WeatherEffect() {
  const weather = useTimeStore((s) => s.weather);
  const cfg = getConfig(weather.type, weather.intensity);

  const meshRef = useRef<InstancedMesh>(null);

  // Per-particle Y position (staggered start so they don't all appear at once)
  const positions = useMemo(() => {
    const arr: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 25,
        z: (Math.random() - 0.5) * 40,
      });
    }
    return arr;
  }, []);

  // Reset particle positions when weather type changes
  useEffect(() => {
    if (!cfg) return;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const pos = positions[i]!;
      pos.x = (Math.random() - 0.5) * cfg.spread * 2;
      pos.y = Math.random() * cfg.height;
      pos.z = (Math.random() - 0.5) * cfg.spread * 2;
    }
  }, [weather.type]); // positions array mutated in place; no need to list it

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !cfg) return;

    const count = Math.min(cfg.count, MAX_PARTICLES);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const pos = positions[i]!;
      pos.y -= cfg.fallSpeed * delta;
      pos.x += cfg.driftX * delta;

      // Wrap when a particle exits the bottom
      if (pos.y < -2) {
        pos.y = cfg.height + Math.random() * 4;
        pos.x = (Math.random() - 0.5) * cfg.spread * 2;
        pos.z = (Math.random() - 0.5) * cfg.spread * 2;
      }

      dummy.position.set(pos.x, pos.y, pos.z);
      // Always face the camera (billboard) — lean slightly in drift direction
      dummy.rotation.z = Math.atan2(cfg.driftX, cfg.fallSpeed) * 0.5;
      dummy.scale.setScalar(cfg.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!cfg) return null;

  const geometry = useMemo(() => new PlaneGeometry(1, 6), []);
  const material = useMemo(() => {
    const mat = new MeshBasicMaterial({
      color: new Color(cfg.color),
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
    });
    return mat;
  }, [cfg.color, cfg.opacity, weather.type, weather.intensity]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_PARTICLES]} frustumCulled={false} />
  );
}
