import { useEffect, useState } from 'react';
import { useZoneStore } from '../systems/zone/zoneStore';
import { usePlayerStore } from '../store/playerStore';
import { useMiningStore } from '../systems/mining/miningStore';

/** World position of the mine entrance in the floresta zone. */
const MINE_POS = { x: 0, z: -12 };
const TRIGGER_RADIUS = 3;

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Shows a "Press M to enter mine" prompt when the player is near the mine
 * entrance portal in the floresta zone. Wires the M key to enterCave().
 */
export function MinePortalPrompt() {
  const zone = useZoneStore((s) => s.current);
  const [near, setNear] = useState(false);
  const enterCave = useMiningStore((s) => s.enterCave);
  const caveOpen = useMiningStore((s) => s.caveOpen);

  useEffect(() => {
    if (zone !== 'floresta') return;
    let raf = 0;
    const tick = () => {
      const pos = usePlayerStore.getState().position;
      setNear(dist(pos, MINE_POS) <= TRIGGER_RADIUS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [zone]);

  useEffect(() => {
    if (!near || caveOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') enterCave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [near, caveOpen, enterCave]);

  if (zone !== 'floresta' || !near || caveOpen) return null;

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">M</kbd> entrar na{' '}
        <span className="font-semibold text-amber-300">Mina</span>
      </div>
    </div>
  );
}
