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
  currentNode: () => DialogueTreeNode | null;
}

export const useChoiceDialogueStore = create<ChoiceDialogueState>((set, get) => ({
  npcId: null,
  tree: null,
  currentNodeId: null,
  open: (npcId, tree) => set({ npcId, tree, currentNodeId: tree.entry }),
  close: () => set({ npcId: null, tree: null, currentNodeId: null }),
  advance: (nextKey) => set({ currentNodeId: nextKey }),
  currentNode: () => {
    const { tree, currentNodeId } = get();
    if (!tree || !currentNodeId) return null;
    return tree.nodes[currentNodeId] ?? null;
  },
}));
