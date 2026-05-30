import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion } from '@elysium/shared';
import dialogueData from '../../data/dialogue.json';

export interface DialogueTurn {
  who: 'player' | 'npc';
  text: string;
  emotion?: NpcEmotion;
  timestamp: number;
}

export interface DialogueNodeResponse {
  id: string;
  text: string;
  next: string | null;
}

export interface DialogueNode {
  npcText: string;
  responses: DialogueNodeResponse[];
}

type DialogueJsonEntry = {
  choices: Array<{ id: string; label: string; input: string }>;
  nodes?: Record<string, DialogueNode>;
};

const typedDialogueData = dialogueData as Record<string, DialogueJsonEntry>;

export interface DialogueState {
  /** If set, dialogue is open with this NPC. */
  npcId: string | null;
  history: DialogueTurn[];
  /** True while waiting for a reply. */
  pending: boolean;
  /** Error from last send, if any. */
  error: string | null;
  /**
   * Current node ID in the offline node-based dialogue tree.
   * null means the node system is not active (free-text mode or dialogue not open).
   */
  currentNodeId: string | null;
}

export interface DialogueActions {
  open: (npcId: string) => void;
  close: () => void;
  send: (
    input: string,
    world: { hour: number; dayInSeason: number; season: string; year: number },
  ) => Promise<void>;
  /**
   * Select a response in the offline node-based dialogue tree.
   * playerText: the response button label shown to the player.
   * nextNodeId: the next node ID, or null to end the conversation.
   */
  selectNode: (playerText: string, nextNodeId: string | null) => void;
  /** Returns the current dialogue node, or null if unavailable. */
  getCurrentNode: () => DialogueNode | null;
}

export const useDialogueStore = create<DialogueState & DialogueActions>((set, get) => ({
  npcId: null,
  history: [],
  pending: false,
  error: null,
  currentNodeId: null,

  open: (npcId) => {
    const entry = typedDialogueData[npcId];
    const hasNodes = entry?.nodes != null && Object.keys(entry.nodes).length > 0;
    const initialNodeId = hasNodes ? 'root' : null;
    // Seed history with the NPC's opening line if we have a node tree
    const rootNode = hasNodes ? entry!.nodes!['root'] : null;
    const initialHistory: DialogueTurn[] = rootNode
      ? [{ who: 'npc', text: rootNode.npcText, timestamp: Date.now() }]
      : [];
    set({ npcId, history: initialHistory, error: null, currentNodeId: initialNodeId });
  },

  close: () => set({ npcId: null, history: [], pending: false, error: null, currentNodeId: null }),

  selectNode: (playerText, nextNodeId) => {
    const { npcId } = get();
    if (!npcId) return;

    const playerTurn: DialogueTurn = { who: 'player', text: playerText, timestamp: Date.now() };

    if (nextNodeId === null) {
      // End of conversation branch — record player turn then close
      set((s) => ({
        history: [...s.history, playerTurn],
        currentNodeId: null,
      }));
      // Small delay so the player can see their choice before closing
      setTimeout(() => {
        get().close();
      }, 600);
      return;
    }

    const entry = typedDialogueData[npcId];
    const nextNode = entry?.nodes?.[nextNodeId];
    if (!nextNode) {
      // Node not found, fall back to free-text mode
      set((s) => ({ history: [...s.history, playerTurn], currentNodeId: null }));
      return;
    }

    const npcTurn: DialogueTurn = {
      who: 'npc',
      text: nextNode.npcText,
      timestamp: Date.now(),
    };
    set((s) => ({
      history: [...s.history, playerTurn, npcTurn],
      currentNodeId: nextNodeId,
    }));
  },

  getCurrentNode: () => {
    const { npcId, currentNodeId } = get();
    if (!npcId || !currentNodeId) return null;
    const entry = typedDialogueData[npcId];
    return entry?.nodes?.[currentNodeId] ?? null;
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
