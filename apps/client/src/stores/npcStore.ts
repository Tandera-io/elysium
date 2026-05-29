/**
 * stores/npcStore.ts — public-API re-export of the NPC Zustand store.
 *
 * This module is the canonical import point for NPC state outside of the
 * systems layer. Feature modules (features/npc/…) and UI components should
 * import from here rather than from the internal systems path so that the
 * implementation can be refactored without touching every consumer.
 *
 * Re-exported surface:
 *   useNpcStore        — Zustand hook (subscribe to npcs, call setPosition)
 *   NpcStateEntry      — shape of each NPC's live state
 *   NpcState           — full store state type
 *   NpcActions         — store action types
 *
 * Extended surface (added here, not in systems/npc/npcStore):
 *   useNpcDialogueStore — tracks per-NPC social state (heart level, last
 *                         talked day) used by the dialogue system.
 */

export {
  useNpcStore,
  type NpcStateEntry,
  type NpcState,
  type NpcActions,
} from '../systems/npc/npcStore';

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Per-NPC social state
// ---------------------------------------------------------------------------

export interface NpcSocialEntry {
  /** 0–10 friendship level. */
  heartLevel: number;
  /** In-game day number of the last conversation (null = never). */
  lastTalkedDay: number | null;
  /** Total conversations ever initiated with this NPC. */
  totalTalks: number;
}

export interface NpcDialogueState {
  social: Record<string, NpcSocialEntry>;
}

export interface NpcDialogueActions {
  /** Call when the player opens a conversation with an NPC. */
  recordTalk: (npcId: string, currentDay: number) => void;
  /** Increase heart level by delta (clamped to [0, 10]). */
  addHearts: (npcId: string, delta: number) => void;
  /** Read a single NPC's social entry, returning a default if not yet tracked. */
  getSocial: (npcId: string) => NpcSocialEntry;
}

const DEFAULT_SOCIAL: NpcSocialEntry = {
  heartLevel: 0,
  lastTalkedDay: null,
  totalTalks: 0,
};

export const useNpcDialogueStore = create<NpcDialogueState & NpcDialogueActions>((set, get) => ({
  social: {},

  recordTalk: (npcId, currentDay) =>
    set((s) => {
      const prev = s.social[npcId] ?? { ...DEFAULT_SOCIAL };
      // Award +1 heart on first talk each day (capped at 10).
      const sameDay = prev.lastTalkedDay === currentDay;
      const heartGain = sameDay ? 0 : 1;
      return {
        social: {
          ...s.social,
          [npcId]: {
            heartLevel: Math.min(10, prev.heartLevel + heartGain),
            lastTalkedDay: currentDay,
            totalTalks: prev.totalTalks + 1,
          },
        },
      };
    }),

  addHearts: (npcId, delta) =>
    set((s) => {
      const prev = s.social[npcId] ?? { ...DEFAULT_SOCIAL };
      return {
        social: {
          ...s.social,
          [npcId]: {
            ...prev,
            heartLevel: Math.min(10, Math.max(0, prev.heartLevel + delta)),
          },
        },
      };
    }),

  getSocial: (npcId) => get().social[npcId] ?? { ...DEFAULT_SOCIAL },
}));
