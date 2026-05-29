import { create } from 'zustand';

export interface DialogueChoice {
  id: string;
  text: string;
  next: string | null;
}

export interface DialogueTreeNode {
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueTree {
  entry: string;
  nodes: Record<string, DialogueTreeNode>;
}

interface ChoiceDialogueState {
  npcId: string | null;
  tree: DialogueTree | null;
  currentNodeId: string | null;
  open: (npcId: string, tree: DialogueTree) => void;
  close: () => void;
  advance: (nextKey: string) => void;
}

export const useChoiceDialogueStore = create<ChoiceDialogueState>((set) => ({
  npcId: null,
  tree: null,
  currentNodeId: null,
  open: (npcId, tree) => set({ npcId, tree, currentNodeId: tree.entry }),
  close: () => set({ npcId: null, tree: null, currentNodeId: null }),
  advance: (nextKey) => set({ currentNodeId: nextKey }),
}));
