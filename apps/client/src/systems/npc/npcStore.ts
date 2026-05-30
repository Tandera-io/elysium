import { create } from 'zustand';
import type { NpcDef } from '@elysium/shared';
import marinaJson from '../../content/npcs/marina.json';
import bentoJson from '../../content/npcs/bento.json';
import luciaJson from '../../content/npcs/lucia.json';
import dorinhaJson from '../../content/npcs/dorinha.json';
import ninaJson from '../../content/npcs/nina.json';
import { getChoreDialogue as _getChoreDialogue } from '../../dialogue/DialogueManager';
import type { ChoreState } from '../../dialogue/DialogueManager';

export type { ChoreState };

export interface NpcStateEntry {
  def: NpcDef;
  /** Live world-space position; may differ from def.position once schedules run (Phase 11). */
  worldPos: { x: number; z: number };
}

export interface NpcState {
  npcs: Record<string, NpcStateEntry>;
}

export interface NpcActions {
  setPosition: (id: string, pos: { x: number; z: number }) => void;
  /** Returns a random chore dialogue line for the NPC in the given state, or null if not available. */
  getChoreDialogue: (npcId: string, state: ChoreState) => string | null;
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
  getChoreDialogue: (npcId, state) => _getChoreDialogue(npcId, state),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
