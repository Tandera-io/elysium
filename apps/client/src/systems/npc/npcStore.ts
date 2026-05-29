import { create } from 'zustand';
import type { NpcDef } from '@elysium/shared';
import marinaJson from '../../content/npcs/marina.json';
import bentoJson from '../../content/npcs/bento.json';
import luciaJson from '../../content/npcs/lucia.json';
import dorinhaJson from '../../content/npcs/dorinha.json';

export interface NpcStateEntry {
  def: NpcDef;
  /** Live world-space position; may differ from def.position once schedules run (Phase 11). */
  worldPos: { x: number; z: number };
}

export interface NpcState {
  npcs: Record<string, NpcStateEntry>;
  /** Set of NPC ids that are currently walking toward a target. */
  movingNpcs: Record<string, boolean>;
}

export interface NpcActions {
  setPosition: (id: string, pos: { x: number; z: number }) => void;
  setMoving: (id: string, moving: boolean) => void;
}

function loadBootstrap(): NpcState {
  const npcs: Record<string, NpcStateEntry> = {};
  const defs = [
    marinaJson as NpcDef,
    bentoJson as NpcDef,
    luciaJson as NpcDef,
    dorinhaJson as NpcDef,
  ];
  for (const def of defs) {
    const pos = def.position ?? { x: 0, z: 0 };
    npcs[def.id] = { def, worldPos: { x: pos.x, z: pos.z } };
  }
  return { npcs, movingNpcs: {} };
}

export const useNpcStore = create<NpcState & NpcActions>((set) => ({
  ...loadBootstrap(),
  setPosition: (id, pos) =>
    set((s) => {
      const cur = s.npcs[id];
      if (!cur) return s;
      return { npcs: { ...s.npcs, [id]: { ...cur, worldPos: pos } } };
    }),
  setMoving: (id, moving) =>
    set((s) => {
      if (s.movingNpcs[id] === moving) return s;
      return { movingNpcs: { ...s.movingNpcs, [id]: moving } };
    }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
