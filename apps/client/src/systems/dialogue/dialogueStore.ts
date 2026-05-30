import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion, WorldContext } from '@elysium/shared';
import { useNpcStore } from '../npc/npcStore';
import { useQuestStore } from '../quest/questStore';

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
}

export interface DialogueActions {
  open: (npcId: string) => void;
  close: () => void;
  send: (input: string, world: WorldContext) => Promise<void>;
}

export const useDialogueStore = create<DialogueState & DialogueActions>((set, get) => ({
  npcId: null,
  history: [],
  pending: false,
  error: null,
  open: (npcId) => set({ npcId, history: [], error: null }),
  close: () => set({ npcId: null, history: [], pending: false, error: null }),
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
      const relation = useNpcStore.getState().getRelation(npcId);
      const questState = useQuestStore.getState();
      const activeQuest = Object.values(questState.active).find((q) => q.giverNpcId === npcId);
      const enrichedWorld = {
        ...world,
        heartLevel: relation.heartLevel,
        interactionCount: relation.interactionCount,
        activeQuestItem: activeQuest?.item as string | undefined,
        completedQuestCount:
          questState.completed.filter((id) =>
            questState.active[id] ? questState.active[id]?.giverNpcId === npcId : false,
          ).length + relation.questsCompleted,
      };
      const res = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, playerInput: trimmed, worldContext: enrichedWorld }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as DialogueResponse;
      // Gain 1 heart per dialogue exchange (relationship building).
      useNpcStore.getState().gainHeart(npcId, 1);
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
