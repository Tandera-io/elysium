/**
 * Dorinha.tsx — interaction hook and UI hint for the Dorinha NPC.
 *
 * Responsibilities:
 *   1. Export `DORINHA_ID` and `DORINHA_INTERACT_RADIUS` constants.
 *   2. Export `openDorinhaDialogue()` — opens the choice-tree dialogue via
 *      the choice dialogue store when the player interacts with Dorinha.
 *   3. Export `useDorinhaInteraction()` — hook that wires the E key to open
 *      dialogue when the player is within range.
 *   4. Export `DorinhaInteractHint` — small hint shown when in range.
 *
 * Integration: mount `<DialoguePipeline />` from src/dialogue/pipeline.tsx
 * in the app root to activate the full interaction + dialogue UI.
 */
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

/**
 * Opens Dorinha's choice-tree dialogue.
 * Accepts the store's open function so this module has no direct store import.
 */
export function openDorinhaDialogue(openFn: (npcId: string) => void): void {
  openFn(DORINHA_ID);
}

/**
 * Wires the E key to open Dorinha's dialogue when the player is within range.
 *
 * @param playerPos    Current player world position.
 * @param dorinhaPos   Dorinha's world position.
 * @param openFn       Store action that opens the dialogue for the given NPC id.
 * @param isAnyOpen    True when any dialogue is already open (prevents double-open).
 */
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

/**
 * Small in-world hint rendered when the player is near Dorinha.
 */
export function DorinhaInteractHint() {
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">E</kbd> conversar com{' '}
        <span className="font-semibold">{DORINHA_NAME}</span>
      </div>
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">G</kbd>{' '}
        <span className="text-amber-300">abrir loja</span>
      </div>
    </div>
  );
}
