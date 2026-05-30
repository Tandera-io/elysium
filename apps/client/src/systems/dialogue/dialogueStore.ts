import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion } from '@elysium/shared';
import { getRepeatVisitLine } from '../../dialogue/pipeline/index.js';

export interface DialogueTurn {
  who: 'player' | 'npc';
  text: string;
  emotion?: NpcEmotion;
  timestamp: number;
}

export interface DialogueState {
  /** If set, dialogue is open with this NPC. */
  npcId: string | null;
  history: DialogueTurn[];
  /** True while waiting for a reply. */
  pending: boolean;
  /** Error from last send, if any. */
  error: string | null;
  /** Tracks how many times the player has opened dialogue with each NPC. */
  interactionCounts: Record<string, number>;
}

export interface DialogueActions {
  open: (npcId: string) => void;
  close: () => void;
  send: (
    input: string,
    world: { hour: number; dayInSeason: number; season: string; year: number },
  ) => Promise<void>;
}

export const useDialogueStore = create<DialogueState & DialogueActions>((set, get) => ({
  npcId: null,
  history: [],
  pending: false,
  error: null,
  interactionCounts: {},
  open: (npcId) => {
    const counts = get().interactionCounts;
    const count = counts[npcId] ?? 0;
    const greeting = getRepeatVisitLine(npcId, { interactionCount: count });
    set({
      npcId,
      history: greeting ? [{ who: 'npc', text: greeting, timestamp: Date.now() }] : [],
      error: null,
      pending: false,
      interactionCounts: { ...counts, [npcId]: count + 1 },
    });
  },
  close: () => set({ npcId: null, history: [], pending: false, error: null }),
  send: async (input, world) => {
    const npcId = get().npcId;
    if (!npcId) return;
    const trimmed = input.trim();
    if (trimmed.length === 0) return;

    set((s) => ({
      history: [...s.history, { who: 'player', text: trimmed, timestamp: Date.now() }],
      pending: true,
      error: null,
    }));

    try {
      const res = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, playerInput: trimmed, worldContext: world }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as DialogueResponse;
      set((s) => ({
        history: [
          ...s.history,
          {
            who: 'npc',
            text: data.npcReply,
            emotion: data.emotion,
            timestamp: Date.now(),
          },
        ],
        pending: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ pending: false, error: message });
    }
  },
}));
