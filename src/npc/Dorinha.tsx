import { useEffect, useCallback } from 'react';

export const DORINHA_INTERACT_RADIUS = 3;
export const DORINHA_ID = 'dorinha';
export const DORINHA_NAME = 'Dorinha';

export interface Vec2 {
  x: number;
  z: number;
}

function distance2D(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function openDorinhaDialogue(openFn: (npcId: string) => void): void {
  openFn(DORINHA_ID);
}

export function useDorinhaInteraction(
  playerPos: Vec2,
  dorinhaPos: Vec2,
  openFn: (npcId: string) => void,
  isAnyOpen: boolean,
): { inRange: boolean } {
  const inRange = distance2D(playerPos, dorinhaPos) <= DORINHA_INTERACT_RADIUS;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!inRange) return;
      if (e.code !== 'KeyE') return;
      if (isAnyOpen) return;
      openFn(DORINHA_ID);
    },
    [inRange, openFn, isAnyOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return { inRange };
}

export function DorinhaInteractHint() {
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">E</kbd>{' '}
        conversar com <span className="font-semibold">{DORINHA_NAME}</span>
      </div>
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">G</kbd>{' '}
        <span className="text-amber-300">abrir loja</span>
      </div>
    </div>
  );
}
