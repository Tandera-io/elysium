import { create } from 'zustand';
import type { NpcDef } from '@elysium/shared';
import marinaJson from '../../content/npcs/marina.json';
import bentoJson from '../../content/npcs/bento.json';
import luciaJson from '../../content/npcs/lucia.json';
import dorinhaJson from '../../content/npcs/dorinha.json';
import ninaJson from '../../content/npcs/nina.json';

export interface NpcStateEntry {
  def: NpcDef;
  /** Live world-space position; may differ from def.position once schedules run (Phase 11). */
  worldPos: { x: number; z: number };
}

/** Tracks the player–NPC relationship across interactions. */
export interface NpcRelation {
  /** Total number of conversations the player has had with this NPC. */
  interactionCount: number;
  /** Friendship level 0–10; increases through dialogue, gifts, and quest completion. */
  heartLevel: number;
  /** Number of quests completed for this NPC. */
  questsCompleted: number;
}

export interface NpcState {
  npcs: Record<string, NpcStateEntry>;
  relations: Record<string, NpcRelation>;
}

export interface NpcActions {
  setPosition: (id: string, pos: { x: number; z: number }) => void;
  /** Increment interaction count when player opens dialogue with this NPC. */
  bumpInteraction: (npcId: string) => void;
  /** Add heart points (capped at 10). */
  gainHeart: (npcId: string, amount: number) => void;
  /** Record a completed quest and award +3 hearts. */
  recordQuestComplete: (npcId: string) => void;
  getRelation: (npcId: string) => NpcRelation;
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
    npcs[def.id] = { def, worldPos: { x: pos.x, z: pos.z } };
  }
  return { npcs, relations: {} };
}

const DEFAULT_RELATION: NpcRelation = { interactionCount: 0, heartLevel: 0, questsCompleted: 0 };

export const useNpcStore = create<NpcState & NpcActions>((set, get) => ({
  ...loadBootstrap(),
  relations: {},
  setPosition: (id, pos) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return { npcs: { ...s.npcs, [id]: { ...cur, worldPos: pos } } };
    }),
  bumpInteraction: (npcId) =>
    set((s) => {
      const rel = s.relations[npcId] ?? { ...DEFAULT_RELATION };
      return {
        relations: {
          ...s.relations,
          [npcId]: { ...rel, interactionCount: rel.interactionCount + 1 },
        },
      };
    }),
  gainHeart: (npcId, amount) =>
    set((s) => {
      const rel = s.relations[npcId] ?? { ...DEFAULT_RELATION };
      return {
        relations: {
          ...s.relations,
          [npcId]: { ...rel, heartLevel: Math.min(10, rel.heartLevel + amount) },
        },
      };
    }),
  recordQuestComplete: (npcId) =>
    set((s) => {
      const rel = s.relations[npcId] ?? { ...DEFAULT_RELATION };
      return {
        relations: {
          ...s.relations,
          [npcId]: {
            ...rel,
            questsCompleted: rel.questsCompleted + 1,
            heartLevel: Math.min(10, rel.heartLevel + 3),
          },
        },
      };
    }),
  getRelation: (npcId) => get().relations[npcId] ?? { ...DEFAULT_RELATION },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
