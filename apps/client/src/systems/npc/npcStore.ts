import { create } from 'zustand';
import type { NpcDef } from '@elysium/shared';
import marinaJson from '../../content/npcs/marina.json';
import bentoJson from '../../content/npcs/bento.json';
import luciaJson from '../../content/npcs/lucia.json';
import dorinhaJson from '../../content/npcs/dorinha.json';
import ninaJson from '../../content/npcs/nina.json';

// ---------------------------------------------------------------------------
// Friendship / social types
// ---------------------------------------------------------------------------

/** Friendship tier names, mirroring Stardew Valley's progression feel. */
export type FriendshipTier = 'stranger' | 'acquaintance' | 'friend' | 'close_friend';

/**
 * Returns the tier label for a 0-10 friendship level.
 *   0-1  → stranger
 *   2-4  → acquaintance
 *   5-7  → friend
 *   8-10 → close_friend
 */
export function friendshipTier(level: number): FriendshipTier {
  if (level >= 8) return 'close_friend';
  if (level >= 5) return 'friend';
  if (level >= 2) return 'acquaintance';
  return 'stranger';
}

/** A simple task object offered by an NPC. */
export interface NpcTask {
  id: string;
  description: string;
  /** In-game reward hint shown to the player. */
  reward: string;
  /** Day (game day counter) when this task was offered. */
  offeredOnDay: number;
  status: 'available' | 'accepted' | 'completed';
}

/** Per-NPC social / friendship data stored alongside the world-position entry. */
export interface NpcSocialData {
  /** 0–10 friendship level. */
  friendshipLevel: number;
  /** Total times the player has talked to this NPC across all days. */
  interactionCount: number;
  /** How many times the player has spoken to this NPC today (resets on new game day). */
  dailyInteractionsToday: number;
  /** Game-day index when last talked (used to reset daily counter). */
  lastInteractedDay: number;
  /**
   * Unix timestamp (ms) after which the NPC is willing to hold a new full
   * conversation.  Set to Date.now() + COOLDOWN_MS when a dialogue closes.
   */
  cooldownUntilMs: number;
  /** The current task offered by (or accepted from) this NPC, if any. */
  pendingTask: NpcTask | null;
}

/** How long the NPC is "busy" after a conversation ends (real-time ms). */
export const NPC_CONVERSATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 real minutes

// ---------------------------------------------------------------------------
// Core position entry (unchanged shape — remains backward-compatible)
// ---------------------------------------------------------------------------

export interface NpcStateEntry {
  def: NpcDef;
  /** Live world-space position; may differ from def.position once schedules run (Phase 11). */
  worldPos: { x: number; z: number };
  /** Friendship and social tracking data. */
  social: NpcSocialData;
}

// ---------------------------------------------------------------------------
// Store state + actions
// ---------------------------------------------------------------------------

export interface NpcState {
  npcs: Record<string, NpcStateEntry>;
}

export interface NpcActions {
  setPosition: (id: string, pos: { x: number; z: number }) => void;

  /**
   * Call when the player finishes a conversation with an NPC.
   * - Increments interaction counters.
   * - Resets the daily counter if it's a new game day.
   * - Awards friendship XP (capped at 1 meaningful talk per day).
   * - Starts the post-conversation cooldown.
   *
   * @param id          NPC id
   * @param currentDay  Current game-day index from the time store
   */
  recordInteraction: (id: string, currentDay: number) => void;

  /**
   * Directly set a friendship level (0-10) for an NPC.
   * Useful for gift-giving, quest rewards, etc.
   */
  advanceFriendship: (id: string, delta: number) => void;

  /**
   * Put a task in the NPC's pending slot.  Has no effect if there is already
   * an accepted or available task.
   */
  offerTask: (id: string, task: Omit<NpcTask, 'status'>) => void;

  /** Player accepts the pending task — changes status to 'accepted'. */
  acceptTask: (id: string) => void;

  /** Mark the pending task as completed and award friendship. */
  completeTask: (id: string) => void;

  /** Manually clear the post-conversation cooldown (e.g. for testing). */
  clearCooldown: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Bootstrap helpers
// ---------------------------------------------------------------------------

function defaultSocial(): NpcSocialData {
  return {
    friendshipLevel: 0,
    interactionCount: 0,
    dailyInteractionsToday: 0,
    lastInteractedDay: -1,
    cooldownUntilMs: 0,
    pendingTask: null,
  };
}

function loadBootstrap(): NpcState {
  const npcs: Record<string, NpcStateEntry> = {};
  const defs = [
    marinaJson as NpcDef,
    bentoJson as NpcDef,
    luciaJson as NpcDef,
    dorinhaJson as NpcDef,
    ninaJson as NpcDef,
  ];
  for (const def of defs) {
    const pos = def.position ?? { x: 0, z: 0 };
    npcs[def.id] = { def, worldPos: { x: pos.x, z: pos.z }, social: defaultSocial() };
  }
  return { npcs };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNpcStore = create<NpcState & NpcActions>((set) => ({
  ...loadBootstrap(),

  setPosition: (id, pos) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return { npcs: { ...s.npcs, [id]: { ...cur, worldPos: pos } } };
    }),

  recordInteraction: (id, currentDay) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      const social = cur.social;

      // Reset daily counter when the game day has advanced.
      const isNewDay = social.lastInteractedDay !== currentDay;
      const dailyCount = isNewDay ? 0 : social.dailyInteractionsToday;

      // Friendship XP: +1 per day (first meaningful talk), +0 for repeated chats same day.
      const friendshipDelta = dailyCount === 0 ? 1 : 0;
      const newFriendship = Math.min(10, social.friendshipLevel + friendshipDelta);

      const updated: NpcSocialData = {
        ...social,
        friendshipLevel: newFriendship,
        interactionCount: social.interactionCount + 1,
        dailyInteractionsToday: dailyCount + 1,
        lastInteractedDay: currentDay,
        cooldownUntilMs: Date.now() + NPC_CONVERSATION_COOLDOWN_MS,
      };

      return { npcs: { ...s.npcs, [id]: { ...cur, social: updated } } };
    }),

  advanceFriendship: (id, delta) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      const newLevel = Math.max(0, Math.min(10, cur.social.friendshipLevel + delta));
      return {
        npcs: {
          ...s.npcs,
          [id]: { ...cur, social: { ...cur.social, friendshipLevel: newLevel } },
        },
      };
    }),

  offerTask: (id, task) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      // Don't overwrite an already-active task.
      if (cur.social.pendingTask && cur.social.pendingTask.status !== 'completed') return s;
      const newTask: NpcTask = { ...task, status: 'available' };
      return {
        npcs: {
          ...s.npcs,
          [id]: { ...cur, social: { ...cur.social, pendingTask: newTask } },
        },
      };
    }),

  acceptTask: (id) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur || !cur.social.pendingTask) return s;
      if (cur.social.pendingTask.status !== 'available') return s;
      const task: NpcTask = { ...cur.social.pendingTask, status: 'accepted' };
      return {
        npcs: {
          ...s.npcs,
          [id]: { ...cur, social: { ...cur.social, pendingTask: task } },
        },
      };
    }),

  completeTask: (id) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur || !cur.social.pendingTask) return s;
      if (cur.social.pendingTask.status !== 'accepted') return s;
      const task: NpcTask = { ...cur.social.pendingTask, status: 'completed' };
      // Quest completion gives +3 friendship.
      const newFriendship = Math.min(10, cur.social.friendshipLevel + 3);
      return {
        npcs: {
          ...s.npcs,
          [id]: {
            ...cur,
            social: { ...cur.social, pendingTask: task, friendshipLevel: newFriendship },
          },
        },
      };
    }),

  clearCooldown: (id) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return {
        npcs: {
          ...s.npcs,
          [id]: { ...cur, social: { ...cur.social, cooldownUntilMs: 0 } },
        },
      };
    }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
