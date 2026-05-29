import { create } from 'zustand';

export interface DialogueChoice {
  id: string;
  text: string;
  next?: string;
  action?: 'close';
}

export interface DialogueNode {
  id: string;
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueData {
  version: number;
  npc_id: string;
  entry: string;
  dialogues: DialogueNode[];
}

export interface ChoiceDialogueState {
  npcId: string | null;
  npcName: string | null;
  currentNodeId: string | null;
  dialogueData: DialogueData | null;
}

export interface ChoiceDialogueActions {
  openDialogue: (npcId: string, npcName: string, data: DialogueData) => void;
  selectChoice: (choice: DialogueChoice) => void;
  close: () => void;
  currentNode: () => DialogueNode | null;
}

const RESET: ChoiceDialogueState = {
  npcId: null,
  npcName: null,
  currentNodeId: null,
  dialogueData: null,
};

export const useChoiceDialogueStore = create<ChoiceDialogueState & ChoiceDialogueActions>(
  (set, get) => ({
    ...RESET,

    openDialogue: (npcId, npcName, data) =>
      set({ npcId, npcName, dialogueData: data, currentNodeId: data.entry }),

    selectChoice: (choice) => {
      if (choice.action === 'close') {
        get().close();
        return;
      }
      if (choice.next) {
        set({ currentNodeId: choice.next });
      }
    },

    close: () => set({ ...RESET }),

    currentNode: () => {
      const { dialogueData, currentNodeId } = get();
      if (!dialogueData || !currentNodeId) return null;
      return dialogueData.dialogues.find((n) => n.id === currentNodeId) ?? null;
    },
  }),
);
