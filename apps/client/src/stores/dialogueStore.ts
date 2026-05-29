import { create } from 'zustand';

export interface DialogueChoice {
  id: string;
  text: string;
  next: string | null;
}

export interface DialogueNode {
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueTree {
  entry: string;
  nodes: Record<string, DialogueNode>;
}

interface ChoiceDialogueState {
  npcId: string | null;
  tree: DialogueTree | null;
  currentNodeId: string | null;
  open: (npcId: string, tree: DialogueTree) => void;
  advance: (choiceId: string) => void;
  close: () => void;
}

export const useChoiceDialogueStore = create<ChoiceDialogueState>((set, get) => ({
  npcId: null,
  tree: null,
  currentNodeId: null,

  open: (npcId, tree) => set({ npcId, tree, currentNodeId: tree.entry }),

  advance: (choiceId) => {
    const { tree, currentNodeId } = get();
    if (!tree || !currentNodeId) return;
    const node = tree.nodes[currentNodeId];
    if (!node) return;
    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    if (choice.next === null) {
      set({ npcId: null, tree: null, currentNodeId: null });
    } else {
      set({ currentNodeId: choice.next });
    }
  },

  close: () => set({ npcId: null, tree: null, currentNodeId: null }),
}));
