import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion } from '@elysium/shared';

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
  /** How many times dialogue has been opened with each NPC this session. */
  interactionCounts: Record<string, number>;
  /** Last player action sent to each NPC (e.g. 'buy', 'quest_accept'). */
  lastAction: Record<string, string>;
}

export interface DialogueActions {
  open: (npcId: string) => void;
  close: () => void;
  send: (
    input: string,
    world: { hour: number; dayInSeason: number; season: string; year: number },
  ) => Promise<void>;
  /** Returns prior interaction count for this NPC (0 = first meeting). */
  getInteractionCount: (npcId: string) => number;
  /** Records the last action taken with an NPC. */
  recordAction: (npcId: string, action: string) => void;
  /** Appends an NPC turn directly (used to inject opening greetings). */
  appendNpcTurn: (text: string, emotion?: NpcEmotion) => void;
}

export const useDialogueStore = create<DialogueState & DialogueActions>((set, get) => ({
  npcId: null,
  history: [],
  pending: false,
  error: null,
  interactionCounts: {},
  lastAction: {},
  open: (npcId) => {
    const counts = get().interactionCounts;
    set({
      npcId,
      history: [],
      error: null,
      interactionCounts: { ...counts, [npcId]: (counts[npcId] ?? 0) + 1 },
    });
  },
  close: () => set({ npcId: null, history: [], pending: false, error: null }),
  getInteractionCount: (npcId) => Math.max(0, (get().interactionCounts[npcId] ?? 0) - 1),
  recordAction: (npcId, action) =>
    set((s) => ({ lastAction: { ...s.lastAction, [npcId]: action } })),
  appendNpcTurn: (text, emotion) =>
    set((s) => ({
      history: [
        ...s.history,
        { who: 'npc' as const, text, emotion: emotion ?? 'neutral', timestamp: Date.now() },
      ],
    })),
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
