import { create } from 'zustand';
import type { NpcDef } from '@elysium/shared';
import marinaJson from '../../content/npcs/marina.json';
import bentoJson from '../../content/npcs/bento.json';
import luciaJson from '../../content/npcs/lucia.json';
import dorinhaJson from '../../content/npcs/dorinha.json';
import ninaJson from '../../content/npcs/nina.json';

export interface NpcConversationState {
  /** Number of times the player has talked to this NPC. */
  interactionCount: number;
  /** Friendship level 0–10. */
  heartLevel: number;
}

export interface NpcStateEntry {
  def: NpcDef;
  /** Live world-space position; may differ from def.position once schedules run (Phase 11). */
  worldPos: { x: number; z: number };
  /** Conversation progression state for this NPC. */
  conversation: NpcConversationState;
}

export interface NpcState {
  npcs: Record<string, NpcStateEntry>;
}

export interface NpcActions {
  setPosition: (id: string, pos: { x: number; z: number }) => void;
  /** Increment interaction count when the player opens dialogue with an NPC. */
  recordInteraction: (id: string) => void;
  /** Add heart points to an NPC (capped at 10). */
  addHeartPoints: (id: string, points: number) => void;
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
    npcs[def.id] = {
      def,
      worldPos: { x: pos.x, z: pos.z },
      conversation: { interactionCount: 0, heartLevel: 0 },
    };
  }
  return { npcs };
}

export const useNpcStore = create<NpcState & NpcActions>((set) => ({
  ...loadBootstrap(),
  setPosition: (id, pos) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return { npcs: { ...s.npcs, [id]: { ...cur, worldPos: pos } } };
    }),
  recordInteraction: (id) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return {
        npcs: {
          ...s.npcs,
          [id]: {
            ...cur,
            conversation: {
              ...cur.conversation,
              interactionCount: cur.conversation.interactionCount + 1,
            },
          },
        },
      };
    }),
  addHeartPoints: (id, points) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return {
        npcs: {
          ...s.npcs,
          [id]: {
            ...cur,
            conversation: {
              ...cur.conversation,
              heartLevel: Math.min(10, cur.conversation.heartLevel + points),
            },
          },
        },
      };
    }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
