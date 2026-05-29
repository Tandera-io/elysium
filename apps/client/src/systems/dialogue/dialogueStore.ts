import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion } from '@elysium/shared';
import { DORINHA_DIALOGUE, DORINHA_DIALOGUE_ENTRY } from '../../dialogue/dorinhaDialogue';

export interface DialogueTurn {
  who: 'player' | 'npc';
  text: string;
  emotion?: NpcEmotion;
  timestamp: number;
}

export interface DialogueChoice {
  id: string;
  text: string;
  /** Next node key, or null to close dialogue. */
  next: string | null;
}

interface DialogueNode {
  text: string;
  choices: DialogueChoice[];
}

/** Map of NPC IDs that use static choice-based dialogue trees. */
const CHOICE_TREES: Record<string, Record<string, DialogueNode>> = {
  dorinha: DORINHA_DIALOGUE,
};
const CHOICE_ENTRIES: Record<string, string> = {
  dorinha: DORINHA_DIALOGUE_ENTRY,
};

export interface DialogueState {
  /** If set, dialogue is open with this NPC. */
  npcId: string | null;
  history: DialogueTurn[];
  /** True while waiting for a server reply. */
  pending: boolean;
  /** Error from last send, if any. */
  error: string | null;
  /** Current list of dialogue choices (empty = none / tree finished). */
  choices: DialogueChoice[];
  /** Active node key within the current choice tree, or null. */
  currentNodeId: string | null;
  /** Active dialogue tree for NPCs with static choices, or null. */
  dialogueTree: Record<string, DialogueNode> | null;
}

export interface DialogueActions {
  open: (npcId: string) => void;
  close: () => void;
  /** Select a choice in the active dialogue tree. */
  selectChoice: (choiceId: string) => void;
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
  choices: [],
  currentNodeId: null,
  dialogueTree: null,

  open: (npcId) => {
    const tree = CHOICE_TREES[npcId] ?? null;
    const entryId = tree ? (CHOICE_ENTRIES[npcId] ?? 'greeting') : null;
    const node = tree && entryId ? tree[entryId] : null;
    const initialHistory: DialogueTurn[] = node
      ? [{ who: 'npc', text: node.text, timestamp: Date.now() }]
      : [];
    set({
      npcId,
      history: initialHistory,
      error: null,
      pending: false,
      choices: node?.choices ?? [],
      currentNodeId: entryId,
      dialogueTree: tree,
    });
  },

  close: () =>
    set({
      npcId: null,
      history: [],
      pending: false,
      error: null,
      choices: [],
      currentNodeId: null,
      dialogueTree: null,
    }),

  selectChoice: (choiceId) => {
    const { dialogueTree, currentNodeId } = get();
    if (!dialogueTree || !currentNodeId) return;
    const node = dialogueTree[currentNodeId];
    if (!node) return;
    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const playerTurn: DialogueTurn = {
      who: 'player',
      text: choice.text,
      timestamp: Date.now(),
    };

    if (choice.next === null) {
      set((s) => ({
        history: [...s.history, playerTurn],
        choices: [],
        currentNodeId: null,
        npcId: null,
        dialogueTree: null,
      }));
      return;
    }

    const nextNode = dialogueTree[choice.next];
    if (!nextNode) return;
    const npcTurn: DialogueTurn = {
      who: 'npc',
      text: nextNode.text,
      timestamp: Date.now(),
    };
    set((s) => ({
      history: [...s.history, playerTurn, npcTurn],
      choices: nextNode.choices,
      currentNodeId: choice.next,
    }));
  },

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
