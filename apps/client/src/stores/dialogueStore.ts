/**
 * Choice-based dialogue store — used by Dorinha and any future NPCs with
 * branching dialogue trees instead of AI chat.
 */
import { create } from 'zustand';

export interface DialogueChoice {
  text: string;
  /** Node id to advance to, or null to close the dialogue. */
  next: string | null;
}

export interface DialogueNode {
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueTree {
  /** Starting node id. */
  start: string;
  nodes: Record<string, DialogueNode>;
}

export interface ChoiceDialogueState {
  npcId: string | null;
  npcName: string | null;
  tree: DialogueTree | null;
  currentNodeId: string | null;
}

export interface ChoiceDialogueActions {
  /** Open a choice dialogue for an NPC (called from DialogueBox). */
  open: (npcId: string, tree: DialogueTree) => void;
  /** Open a choice dialogue with an explicit NPC name (called from InteractPrompt). */
  openDialogue: (npcId: string, npcName: string, tree: DialogueTree) => void;
  advance: (nodeId: string) => void;
  close: () => void;
}

export const useChoiceDialogueStore = create<ChoiceDialogueState & ChoiceDialogueActions>(
  (set) => ({
    npcId: null,
    npcName: null,
    tree: null,
    currentNodeId: null,

    open: (npcId, tree) => set({ npcId, npcName: null, tree, currentNodeId: tree.start }),

    openDialogue: (npcId, npcName, tree) =>
      set({ npcId, npcName, tree, currentNodeId: tree.start }),

    advance: (nodeId) => set({ currentNodeId: nodeId }),

    close: () => set({ npcId: null, npcName: null, tree: null, currentNodeId: null }),
  }),
);
