import { useTimeStore } from '../systems/time/timeStore';

export type LightingOverlay = {
  color: string;
  opacity: number;
};

// Keyframes matching the 3D Daylight.tsx palette — dark at night, clear midday
const OVERLAY_KEYS: { hour: number; color: string; opacity: number }[] = [
  { hour: 0,  color: '#0b152e', opacity: 0.55 },
  { hour: 5,  color: '#7a3520', opacity: 0.28 },
  { hour: 7,  color: '#000000', opacity: 0.0  },
  { hour: 17, color: '#000000', opacity: 0.0  },
  { hour: 19, color: '#7a3520', opacity: 0.22 },
  { hour: 21, color: '#0b152e', opacity: 0.55 },
  { hour: 24, color: '#0b152e', opacity: 0.55 },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function getLightingOverlay(hour: number): LightingOverlay {
  for (let i = 0; i < OVERLAY_KEYS.length - 1; i++) {
    const a = OVERLAY_KEYS[i]!;
    const b = OVERLAY_KEYS[i + 1]!;
    if (hour >= a.hour && hour <= b.hour) {
      const t = (hour - a.hour) / Math.max(0.001, b.hour - a.hour);
      const [r1, g1, b1] = hexToRgb(a.color);
      const [r2, g2, b2] = hexToRgb(b.color);
      return {
        color: `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`,
        opacity: a.opacity + (b.opacity - a.opacity) * t,
      };
    }
  }
  return { color: '#0b152e', opacity: 0.55 };
}

export function useLightingOverlay(): LightingOverlay {
  const hour = useTimeStore((s) => s.hour);
  return getLightingOverlay(hour);
}
