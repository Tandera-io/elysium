import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion } from '@elysium/shared';
import npcDialogues from '../../data/npcDialogues.json';

export interface DialogueChoice {
  id: string;
  text: string;
}

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
  /** Opening greeting text shown when dialogue opens, or null if none. */
  greeting: string | null;
  /** Quick-reply choices available to the player. */
  choices: DialogueChoice[];
}

export interface DialogueActions {
  open: (npcId: string) => void;
  close: () => void;
  greet: (npcId: string) => void;
  clearChoices: () => void;
  send: (
    input: string,
    world: { hour: number; dayInSeason: number; season: string; year: number },
  ) => Promise<void>;
}

type NpcDialogueEntry = {
  greetings: string[];
  choices: DialogueChoice[];
};

type NpcDialogues = Record<string, NpcDialogueEntry>;

const dialogues = npcDialogues as NpcDialogues;

export const useDialogueStore = create<DialogueState & DialogueActions>((set, get) => ({
  npcId: null,
  history: [],
  pending: false,
  error: null,
  greeting: null,
  choices: [],
  open: (npcId) => {
    set({ npcId, history: [], error: null, greeting: null, choices: [] });
    get().greet(npcId);
  },
  close: () =>
    set({ npcId: null, history: [], pending: false, error: null, greeting: null, choices: [] }),
  greet: (npcId) => {
    const entry = dialogues[npcId];
    if (!entry) return;
    const greetingText = entry.greetings[0] ?? null;
    if (!greetingText) return;
    set((s) => ({
      greeting: greetingText,
      choices: entry.choices,
      history: [...s.history, { who: 'npc', text: greetingText, timestamp: Date.now() }],
    }));
  },
  clearChoices: () => set({ choices: [] }),
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
