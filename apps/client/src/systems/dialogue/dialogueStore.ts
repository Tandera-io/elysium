import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion } from '@elysium/shared';
import { getGreeting } from './DialogueSystem';
import { useNpcStore } from '../npc/npcStore';
import { useTimeStore } from '../time/timeStore';

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
  open: (npcId) => {
    // Increment interaction count and select a greeting line from the static bank.
    const newCount = useNpcStore.getState().incrementInteraction(npcId);
    const hour = useTimeStore.getState().hour;
    const greeting = getGreeting(npcId, hour, newCount - 1);
    const greetingTurn: DialogueTurn = {
      who: 'npc',
      text: greeting.text,
      emotion: greeting.emotion,
      timestamp: Date.now(),
    };
    set({ npcId, history: [greetingTurn], error: null });
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
