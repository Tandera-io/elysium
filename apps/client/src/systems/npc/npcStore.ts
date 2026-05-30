import { create } from 'zustand';
import type { NpcDef } from '@elysium/shared';
import marinaJson from '../../content/npcs/marina.json';
import bentoJson from '../../content/npcs/bento.json';
import luciaJson from '../../content/npcs/lucia.json';
import dorinhaJson from '../../content/npcs/dorinha.json';
import ninaJson from '../../content/npcs/nina.json';
import { DORINHA_CHORE_DIALOGUE } from '../../features/npc/dialogue/dorinha';
import { NINA_CHORE_DIALOGUE } from '../../features/npc/dialogue/nina';
import { FERRAZ_CHORE_DIALOGUE } from '../../features/npc/dialogue/ferraz';
import { ARNALDO_CHORE_DIALOGUE } from '../../features/npc/dialogue/arnaldo';
import { SOFIA_CHORE_DIALOGUE } from '../../features/npc/dialogue/sofia';
import { ROMEU_CHORE_DIALOGUE } from '../../features/npc/dialogue/romeu';
import { PADRE_PEDRO_CHORE_DIALOGUE } from '../../features/npc/dialogue/padre_pedro';

export type ChoreState = 'assigned' | 'working' | 'completed';

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

const CHORE_DIALOGUE_MAP: Record<string, ChoreDialogueLines> = {
  dorinha: DORINHA_CHORE_DIALOGUE,
  nina: NINA_CHORE_DIALOGUE,
  ferraz: FERRAZ_CHORE_DIALOGUE,
  arnaldo: ARNALDO_CHORE_DIALOGUE,
  sofia: SOFIA_CHORE_DIALOGUE,
  romeu: ROMEU_CHORE_DIALOGUE,
  padre_pedro: PADRE_PEDRO_CHORE_DIALOGUE,
};

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
  getChoreDialogue: (npcId, state) => {
    const lines = CHORE_DIALOGUE_MAP[npcId];
    if (!lines) return null;
    const pool = lines[state];
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __npcs: typeof useNpcStore }).__npcs = useNpcStore;
}
