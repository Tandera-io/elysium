/**
 * Dorinha.tsx
 *
 * Component and hook utilities for the Dorinha NPC.
 *
 * Responsibilities:
 *   1. Export `openDorinhaDialogue()` — call this when the player presses E
 *      near Dorinha. Opens the local choice-tree dialogue via
 *      `useLocalDialogueStore`.
 *   2. Export `DorinhaInteractHint` — a small UI hint shown when the player
 *      is in range ("Press E to talk / G for shop").
 *   3. Export `useDorinhaInteraction` — a hook that wires up the E key for
 *      Dorinha specifically, returning whether the hint should be visible.
 *
 * Usage in App.tsx (or InteractPrompt):
 *   import { useDorinhaInteraction, DorinhaInteractHint } from '../npc/Dorinha';
 *   // In component: const { inRange } = useDorinhaInteraction(playerPos, dorinhaPos);
 *   // In JSX: {inRange && <DorinhaInteractHint />}
 *
 * The actual 3-D NpcView sprite is handled by apps/client/src/systems/npc/NpcView.tsx.
 * This module owns only the interaction and dialogue wiring.
 */
import { useEffect, useCallback } from 'react';
import { useLocalDialogueStore } from '../stores/dialogueStore';
import { dorinhaDialogue } from '../dialogue/dorinhaDialog';

// ── Constants ─────────────────────────────────────────────────────────────────

/** World-space distance at which the player can interact with Dorinha. */
export const DORINHA_INTERACT_RADIUS = 3;

export const DORINHA_ID = 'dorinha';
export const DORINHA_NAME = 'Dorinha';

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Opens Dorinha's choice-tree dialogue.
 * Safe to call even if the dialogue is already open — it will reset to the
 * entry node in that case.
 */
export function openDorinhaDialogue(): void {
  useLocalDialogueStore.getState().openDialogue(DORINHA_ID, DORINHA_NAME, dorinhaDialogue);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

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
 * Wires the E key to open Dorinha's dialogue when the player is within
 * `DORINHA_INTERACT_RADIUS` world units.
 *
 * @param playerPos  Current player position (updated each frame via a ref/store).
 * @param dorinhaPos Dorinha's fixed world position.
 * @returns `{ inRange }` — true while the player is close enough to interact.
 */
export function useDorinhaInteraction(playerPos: Vec2, dorinhaPos: Vec2): { inRange: boolean } {
  const inRange = distance2D(playerPos, dorinhaPos) <= DORINHA_INTERACT_RADIUS;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!inRange) return;
      if (e.code !== 'KeyE') return;
      // Don't open a new dialogue if one is already open.
      if (useLocalDialogueStore.getState().npcId !== null) return;
      openDorinhaDialogue();
    },
    [inRange],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return { inRange };
}

// ── UI Hint ───────────────────────────────────────────────────────────────────

/**
 * Small in-world hint rendered when the player is in range of Dorinha.
 * Matches the visual style of apps/client/src/systems/npc/InteractPrompt.tsx.
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
