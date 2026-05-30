import { useState, useCallback } from 'react';

export interface DialogueLine {
  npcName: string;
  text: string;
}

export interface NPCDialogueState {
  /** The currently active dialogue, or null when closed. */
  activeDialogue: DialogueLine | null;
  /** Whether the dialogue box is open. */
  isOpen: boolean;
  /** Open dialogue for an NPC with the given lines. Cycles through them on repeated calls. */
  openDialogue: (npcName: string, lines: string[]) => void;
  /** Close the dialogue and reset state. */
  closeDialogue: () => void;
}

interface NPCLineState {
  npcName: string;
  lines: string[];
  index: number;
}

/**
 * useNPCDialogues — manages pre-scripted NPC dialogue cycling.
 *
 * Call openDialogue(npcName, lines) to open a dialogue with a given NPC.
 * Each subsequent call to openDialogue with the same NPC advances to the next
 * line. Calling openDialogue with a different NPC resets to the first line.
 * closeDialogue() dismisses the box.
 */
export function useNPCDialogues(): NPCDialogueState {
  const [lineState, setLineState] = useState<NPCLineState | null>(null);

  const openDialogue = useCallback((npcName: string, lines: string[]) => {
    if (!lines.length) return;

    setLineState((prev) => {
      if (prev && prev.npcName === npcName) {
        // Cycle to next line for the same NPC
        const nextIndex = (prev.index + 1) % prev.lines.length;
        return { npcName, lines: prev.lines, index: nextIndex };
      }
      // New NPC or first open — start from first line
      return { npcName, lines, index: 0 };
    });
  }, []);

  const closeDialogue = useCallback(() => {
    setLineState(null);
  }, []);

  const activeDialogue: DialogueLine | null =
    lineState !== null && lineState.lines[lineState.index] !== undefined
      ? { npcName: lineState.npcName, text: lineState.lines[lineState.index] as string }
      : null;

  return {
    activeDialogue,
    isOpen: activeDialogue !== null,
    openDialogue,
    closeDialogue,
  };
}
