import { create } from 'zustand';
import type { NpcDef } from '@elysium/shared';
import marinaJson from '../../content/npcs/marina.json';
import bentoJson from '../../content/npcs/bento.json';
import luciaJson from '../../content/npcs/lucia.json';
import dorinhaJson from '../../content/npcs/dorinha.json';
import ninaJson from '../../content/npcs/nina.json';
import arnaldoJson from '../../content/npcs/arnaldo.json';
import padrePedroJson from '../../content/npcs/padre-pedro.json';
import sofiaJson from '../../content/npcs/sofia.json';

export interface NpcStateEntry {
  def: NpcDef;
  /** Live world-space position; may differ from def.position once schedules run (Phase 11). */
  worldPos: { x: number; z: number };
  /** How many times the player has opened a conversation with this NPC this session. */
  interactionCount: number;
}

export interface NpcState {
  npcs: Record<string, NpcStateEntry>;
}

export interface NpcActions {
  setPosition: (id: string, pos: { x: number; z: number }) => void;
  /**
   * Increments the session interaction counter for an NPC.
   * Call once per conversation open, before reading the count for greeting selection.
   * Returns the new (post-increment) count.
   */
  incrementInteraction: (id: string) => number;
}

function loadBootstrap(): NpcState {
  const npcs: Record<string, NpcStateEntry> = {};
  const defs = [
    marinaJson as NpcDef,
    bentoJson as NpcDef,
    luciaJson as NpcDef,
    dorinhaJson as NpcDef,
    ninaJson as NpcDef,
    arnaldoJson as NpcDef,
    padrePedroJson as NpcDef,
    sofiaJson as NpcDef,
  ];
  for (const def of defs) {
    const pos = def.position ?? { x: 0, z: 0 };
    npcs[def.id] = { def, worldPos: { x: pos.x, z: pos.z }, interactionCount: 0 };
  }
  return { npcs };
}

export const useNpcStore = create<NpcState & NpcActions>((set, get) => ({
  ...loadBootstrap(),
  setPosition: (id, pos) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return { npcs: { ...s.npcs, [id]: { ...cur, worldPos: pos } } };
    }),
  incrementInteraction: (id) => {
    const cur = get().npcs[id];
    const next = (cur?.interactionCount ?? 0) + 1;
    if (cur) {
      set((s) => ({
        npcs: { ...s.npcs, [id]: { ...s.npcs[id]!, interactionCount: next } },
      }));
    }
    return next;
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
