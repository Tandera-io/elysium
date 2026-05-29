import { useEffect, useState } from 'react';
import { useForageStore } from './forageStore';
import { FORAGE_DEFS } from './forageDefs';
import { usePlayerStore } from '../../store/playerStore';
import { useZoneStore } from '../zone/zoneStore';

const COLLECT_RADIUS = 2.5;

function distSq(ax: number, az: number, bx: number, bz: number) {
  return (ax - bx) ** 2 + (az - bz) ** 2;
}

/**
 * Shows "Press F to collect [item]" when the player is within range of a
 * forage item in the Floresta zone. F key collects the nearest item.
 */
export function ForageInteract() {
  const zone = useZoneStore((s) => s.current);
  const [nearestId, setNearestId] = useState<string | null>(null);
  const [nearestLabel, setNearestLabel] = useState<string>('');

  useEffect(() => {
    if (zone !== 'floresta') {
      setNearestId(null);
      return;
    }

    let raf = 0;
    const loop = () => {
      const pos = usePlayerStore.getState().position;
      const spawns = useForageStore.getState().spawns;
      let bestId: string | null = null;
      let bestDist = COLLECT_RADIUS * COLLECT_RADIUS;

      for (const s of spawns) {
        if (s.collected) continue;
        const d = distSq(pos.x, pos.z, s.x, s.z);
        if (d < bestDist) {
          bestDist = d;
          bestId = s.id;
        }
      }

      setNearestId((prev) => {
        if (prev !== bestId) {
          if (bestId) {
            const spawn = spawns.find((s) => s.id === bestId);
            if (spawn) setNearestLabel(FORAGE_DEFS[spawn.itemId].label);
          }
          return bestId;
        }
        return prev;
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [zone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF') return;
      const id = nearestId;
      if (!id) return;
      useForageStore.getState().collect(id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearestId]);

  if (!nearestId) return null;

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">F</kbd> coletar{' '}
        <span className="font-semibold text-green-300">{nearestLabel}</span>
      </div>
    </div>
  );
}
