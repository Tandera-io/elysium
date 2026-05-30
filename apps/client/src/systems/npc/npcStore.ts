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

/** Tracks the player's relationship with a single NPC. */
export interface RelationshipEntry {
  /** 0–10 heart scale. Increases on interaction and gift giving. */
  heartLevel: number;
  /** Total number of conversations the player has had with this NPC. */
  interactionCount: number;
}

export interface NpcState {
  npcs: Record<string, NpcStateEntry>;
  /** Relationship state keyed by NPC id. */
  relationships: Record<string, RelationshipEntry>;
}

export interface NpcActions {
  setPosition: (id: string, pos: { x: number; z: number }) => void;
  /** Call when the player opens a dialogue with this NPC. */
  recordInteraction: (id: string) => void;
  /** Adjust heart level by delta (clamped 0–10). */
  addHearts: (id: string, delta: number) => void;
}

/**
 * NPCs that have dialogue configs but no JSON def file yet.
 * They exist in the dialogue pipeline and need a relationship entry.
 */
const HUB_ONLY_NPC_IDS = ['ferraz', 'padre_pedro', 'arnaldo', 'sofia', 'romeu'] as const;

function loadBootstrap(): Pick<NpcState, 'npcs' | 'relationships'> {
  const npcs: Record<string, NpcStateEntry> = {};
  const relationships: Record<string, RelationshipEntry> = {};
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
    relationships[def.id] = { heartLevel: 0, interactionCount: 0 };
  }
  // Seed relationship entries for hub-only NPCs (no world entity yet).
  for (const id of HUB_ONLY_NPC_IDS) {
    relationships[id] = { heartLevel: 0, interactionCount: 0 };
  }
  return { npcs, relationships };
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
      const rel = s.relationships[id] ?? { heartLevel: 0, interactionCount: 0 };
      const newCount = rel.interactionCount + 1;
      // First talk gives +1 heart; subsequent talks give fractional gain (every 5 talks = +1 heart)
      const heartGain = rel.interactionCount === 0 ? 1 : newCount % 5 === 0 ? 1 : 0;
      return {
        relationships: {
          ...s.relationships,
          [id]: {
            heartLevel: Math.min(10, rel.heartLevel + heartGain),
            interactionCount: newCount,
          },
        },
      };
    }),
  addHearts: (id, delta) =>
    set((s) => {
      const rel = s.relationships[id] ?? { heartLevel: 0, interactionCount: 0 };
      return {
        relationships: {
          ...s.relationships,
          [id]: { ...rel, heartLevel: Math.max(0, Math.min(10, rel.heartLevel + delta)) },
        },
      };
    }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
