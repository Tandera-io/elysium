import { create } from 'zustand';

/**
 * Lightweight NPC social-state store used by components in apps/client/src/components/NPCs/.
 * Position data for rendering lives in systems/npc/npcStore.ts;
 * this store owns dialogue-adjacent state: heartLevel and daysTalked.
 */
export const useNpcSocialStore = create((set) => ({
  dorinha: { heartLevel: 0, daysTalked: 0 },

  incrementTalked: (npcId) =>
    set((s) => ({
      [npcId]: {
        ...s[npcId],
        daysTalked: (s[npcId]?.daysTalked ?? 0) + 1,
      },
    })),

  addHearts: (npcId, amount) =>
    set((s) => ({
      [npcId]: {
        ...s[npcId],
        heartLevel: Math.min(10, (s[npcId]?.heartLevel ?? 0) + amount),
      },
    })),
}));
