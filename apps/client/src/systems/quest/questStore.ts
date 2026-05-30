import { create } from 'zustand';
import type { Quest } from './questDefs';

export interface QuestState {
  /** Active quests by id. */
  active: Record<string, Quest>;
  /** Completed quest ids — kept for history/repeatability prevention. */
  completed: string[];
  /** Quest ids the player explicitly declined this session. */
  declined: string[];
  /** Reputation per NPC id; integer, positive = friendly. */
  reputation: Record<string, number>;
  /** Player money pool — earned by completing quests + selling. */
  cash: number;
}

export interface QuestActions {
  accept: (quest: Quest) => void;
  /** Decline an offered quest so it won't be re-offered this session. */
  decline: (questId: string) => void;
  hasActiveFromNpc: (npcId: string) => Quest | null;
  /** Mark the quest as ready to turn in (player gathered enough). */
  markReady: (questId: string) => void;
  /** Finalize: pay reward, bump reputation, move to completed. */
  turnIn: (questId: string) => Quest | null;
  reset: () => void;
}

export const useQuestStore = create<QuestState & QuestActions>((set, get) => ({
  active: {},
  completed: [],
  declined: [],
  reputation: {},
  cash: 50,
  accept: (q) => set((s) => ({ active: { ...s.active, [q.id]: { ...q, status: 'active' } } })),
  decline: (questId) => set((s) => ({ declined: [...s.declined, questId] })),
  hasActiveFromNpc: (npcId) => {
    const found = Object.values(get().active).find((q) => q.giverNpcId === npcId);
    return found ?? null;
  },
  markReady: (questId) =>
    set((s) => {
      const q = s.active[questId];
      if (!q) return s;
      return {
        active: { ...s.active, [questId]: { ...q, status: 'ready_to_turn_in' } },
      };
    }),
  turnIn: (questId) => {
    const q = get().active[questId];
    if (!q) return null;
    set((s) => {
      const next: QuestState = { ...s, active: { ...s.active } };
      delete next.active[questId];
      next.completed = [...s.completed, questId];
      next.reputation = {
        ...s.reputation,
        [q.giverNpcId]: (s.reputation[q.giverNpcId] ?? 0) + q.rewardReputation,
      };
      next.cash = s.cash + q.rewardCash;
      return next;
    });
    return q;
  },
  reset: () => set({ active: {}, completed: [], declined: [], reputation: {}, cash: 50 }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __quests: typeof useQuestStore }).__quests = useQuestStore;
}
