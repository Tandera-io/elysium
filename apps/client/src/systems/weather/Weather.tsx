import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWeatherStore } from './weatherStore';
import { useTimeStore, SEASONS, SEASON_LABEL } from '../time/timeStore';

const SNOW_COUNT = 300;
const RAIN_COUNT = 400;
const SNOW_AREA = 30;
const SNOW_MAX_HEIGHT = 20;
const SNOW_FALL_SPEED = 2.5;
const RAIN_AREA = 30;
const RAIN_MAX_HEIGHT = 20;
const RAIN_FALL_SPEED = 12;
const RAIN_WIND_X = 1.5;

function buildPositions(count: number, area: number, maxHeight: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Use index-based seeding to avoid Math.random in a loop that could break determinism
    const idx = i * 3;
    pos[idx] = ((i * 17 + 3) % area) - area / 2;
    pos[idx + 1] = (i * 13) % maxHeight;
    pos[idx + 2] = ((i * 11 + 7) % area) - area / 2;
  }
  return pos;
}

function SnowParticles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => buildPositions(SNOW_COUNT, SNOW_AREA, SNOW_MAX_HEIGHT), []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.attributes['position'] as THREE.BufferAttribute;
    const pos = attr.array as Float32Array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const idx = i * 3;
      pos[idx + 1]! -= SNOW_FALL_SPEED * delta;
      if ((pos[idx + 1] ?? 0) < 0) {
        pos[idx + 1] = SNOW_MAX_HEIGHT;
        pos[idx] = (Math.sin(i + Date.now() * 0.0001) * SNOW_AREA) / 2;
        pos[idx + 2] = (Math.cos(i + Date.now() * 0.0001) * SNOW_AREA) / 2;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="white" size={0.15} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

function RainParticles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => buildPositions(RAIN_COUNT, RAIN_AREA, RAIN_MAX_HEIGHT), []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.attributes['position'] as THREE.BufferAttribute;
    const pos = attr.array as Float32Array;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const idx = i * 3;
      pos[idx]! += RAIN_WIND_X * delta;
      pos[idx + 1]! -= RAIN_FALL_SPEED * delta;
      if ((pos[idx + 1] ?? 0) < 0) {
        pos[idx + 1] = RAIN_MAX_HEIGHT;
        pos[idx] = (Math.sin(i * 7 + Date.now() * 0.0001) * RAIN_AREA) / 2;
        pos[idx + 2] = (Math.cos(i * 5 + Date.now() * 0.0001) * RAIN_AREA) / 2;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#aac4e0" size={0.06} sizeAttenuation transparent opacity={0.65} />
    </points>
  );
}

/** Renders season-appropriate weather particles inside the R3F Canvas. */
export function Weather() {
  const weather = useWeatherStore((s) => s.current);
  return (
    <>
      {weather === 'snowy' && <SnowParticles />}
      {weather === 'rainy' && <RainParticles />}
    </>
  );
}

/** HUD overlay (outside Canvas) showing season + weather. */
export function WeatherHUD() {
  const weather = useWeatherStore((s) => s.current);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const year = useTimeStore((s) => s.year);
  const season = SEASONS[seasonIndex] ?? 'spring';
  const label = SEASON_LABEL[season];
  const icons: Record<string, string> = { sunny: '☀️', cloudy: '☁️', rainy: '🌧', snowy: '❄️' };
  const icon = icons[weather] ?? '';
  return (
    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-200 mt-1">
      <span>{label}</span>
      <span className="text-slate-400">
        D{dayInSeason} A{year}
      </span>
      <span title={weather}>{icon}</span>
      {season === 'winter' && <span className="text-blue-300 text-[10px]">· congelado</span>}
    </div>
  );
}
