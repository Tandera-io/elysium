/**
 * localDialogueStore — manages pre-scripted, offline NPC dialogue.
 *
 * Unlike dialogueStore (which calls the AI API), this store cycles through
 * a fixed array of lines. Useful for NPCs like Ferraz that have scripted
 * greetings and should respond instantly without a network round-trip.
 */
import { create } from 'zustand';

export interface LocalDialogueLine {
  npcId: string;
  npcName: string;
  text: string;
  /** 0-based index of the current line in the lines array. */
  lineIndex: number;
  /** Total number of lines available for this NPC. */
  totalLines: number;
}

export interface LocalDialogueState {
  /** Active dialogue, or null when closed. */
  active: LocalDialogueLine | null;
  /** Internal: the full lines array for the active NPC. */
  _lines: string[];
}

export interface LocalDialogueActions {
  /** Open dialogue for the given NPC; re-opens from first line each time. */
  open: (npcId: string, npcName: string, lines: string[]) => void;
  /** Advance to the next line (wraps around). No-op if nothing is open. */
  advance: () => void;
  /** Close the dialogue. */
  close: () => void;
}

export const useLocalDialogueStore = create<LocalDialogueState & LocalDialogueActions>(
  (set, get) => ({
    active: null,
    _lines: [],

    open: (npcId, npcName, lines) => {
      if (!lines.length) return;
      const firstLine = lines[0];
      if (firstLine === undefined) return;
      set({
        active: {
          npcId,
          npcName,
          text: firstLine,
          lineIndex: 0,
          totalLines: lines.length,
        },
        _lines: lines,
      });
    },

    advance: () => {
      const { active, _lines } = get();
      if (!active || !_lines.length) return;
      const nextIndex = (active.lineIndex + 1) % _lines.length;
      const nextLine = _lines[nextIndex];
      if (nextLine === undefined) return;
      set({
        active: {
          ...active,
          text: nextLine,
          lineIndex: nextIndex,
        },
      });
    },

    close: () => set({ active: null, _lines: [] }),
  }),
);
