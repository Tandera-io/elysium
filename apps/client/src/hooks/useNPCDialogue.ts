// apps/client/src/hooks/useNPCDialogue.ts
//
// useNPCDialogue — React hook that wires the dialogue pipeline to the AI
// dialogue store, adding NPC-initiated greetings and offline fallbacks.
//
// On first open (interactionCount === 0), the NPC speaks first using a
// first-meeting line from the pipeline.  On repeat opens it uses a
// context-aware repeat-visit greeting.  If the server call fails, the
// pipeline's offline fallback is injected into history so the conversation
// never goes silent.
//
// Returns:
//   npcId    — currently open NPC id, or null
//   npc      — NpcStateEntry for the open NPC, or null
//   history  — DialogueTurn[] from dialogueStore
//   pending  — true while waiting for a server reply
//   error    — last error string, or null
//   open     — (npcId: string) => void; triggers greeting + opens dialogue
//   close    — () => void
//   send     — (text: string) => Promise<void>

import { useCallback, useEffect, useRef } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { useNpcDialogueStore } from '../stores/npcStore';
import { useTimeStore } from '../systems/time/timeStore';
import { getNpcGreeting } from '../stores/npcStore';

export function useNPCDialogue() {
  const npcId = useDialogueStore((s) => s.npcId);
  const history = useDialogueStore((s) => s.history);
  const pending = useDialogueStore((s) => s.pending);
  const error = useDialogueStore((s) => s.error);
  const storeOpen = useDialogueStore((s) => s.open);
  const storeClose = useDialogueStore((s) => s.close);
  const storeSend = useDialogueStore((s) => s.send);

  const npcs = useNpcStore((s) => s.npcs);
  const npc = npcId ? (npcs[npcId] ?? null) : null;

  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  // Track whether we have already sent the opening greeting for this session.
  const greetedRef = useRef<string | null>(null);

  // When the dialogue opens (npcId changes from null to an id), send the
  // NPC-initiated greeting as the first message.
  useEffect(() => {
    if (!npcId) {
      greetedRef.current = null;
      return;
    }
    // Guard: only greet once per open session.
    if (greetedRef.current === npcId) return;
    greetedRef.current = npcId;

    // Read the per-NPC dialogue state for context-aware greeting.
    const npcDialogueState = useNpcDialogueStore.getState().npcState[npcId];
    const context = {
      interactionCount: npcDialogueState?.interactionCount ?? 0,
      heartLevel: npcDialogueState?.heartLevel ?? 0,
    };

    const world = { hour, dayInSeason, season: resolveSeasonName(seasonIndex), year };

    // Determine a special greeting input that the server understands as
    // "NPC greets player first".
    const greetInput = '[iniciou conversa]';

    storeSend(greetInput, world).catch(() => {
      // If the server is unreachable, inject the offline fallback directly.
      const fallback = getNpcGreeting(npcId, context);
      useDialogueStore.setState((s) => ({
        history: [
          ...s.history.filter((t) => t.text !== greetInput),
          { who: 'npc' as const, text: fallback, timestamp: Date.now() },
        ],
        pending: false,
        error: null,
      }));
    });
  }, [npcId]);

  /**
   * Opens the dialogue with the given NPC.
   * Also increments interactionCount in useNpcDialogueStore so context is
   * tracked across sessions.
   */
  const open = useCallback(
    (id: string) => {
      // Update per-NPC dialogue state (hasGreeted, interactionCount).
      useNpcDialogueStore.getState().open(id);
      // Open the AI chat store (resets history, sets npcId).
      storeOpen(id);
    },
    [storeOpen],
  );

  const send = useCallback(
    async (text: string) => {
      const world = { hour, dayInSeason, season: resolveSeasonName(seasonIndex), year };
      await storeSend(text, world);
    },
    [storeSend, hour, dayInSeason, seasonIndex, year],
  );

  return {
    npcId,
    npc,
    history,
    pending,
    error,
    open,
    close: storeClose,
    send,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];

function resolveSeasonName(seasonIndex: number): string {
  return SEASON_NAMES[seasonIndex % SEASON_NAMES.length] ?? 'spring';
}
