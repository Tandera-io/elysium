import { create } from 'zustand';
import { ZONES } from '../../content/zones';
import type { ForageId } from './forageDefs';
import { useInventoryStore } from '../inventory/inventoryStore';

export interface ForageSpawn {
  id: string;
  itemId: ForageId;
  x: number;
  z: number;
  collected: boolean;
}

function buildInitialSpawns(): ForageSpawn[] {
  return (ZONES.floresta.forageSites ?? []).map((site, i) => ({
    id: `forage_${i}`,
    itemId: site.itemId,
    x: site.x,
    z: site.z,
    collected: false,
  }));
}

export interface ForageState {
  spawns: ForageSpawn[];
}

export interface ForageActions {
  collect: (spawnId: string) => boolean;
  reset: () => void;
}

export const useForageStore = create<ForageState & ForageActions>((set, get) => ({
  spawns: buildInitialSpawns(),

  collect: (spawnId) => {
    const spawn = get().spawns.find((s) => s.id === spawnId && !s.collected);
    if (!spawn) return false;
    const ok = useInventoryStore.getState().add(spawn.itemId, 1);
    if (!ok) return false;
    set((state) => ({
      spawns: state.spawns.map((s) => (s.id === spawnId ? { ...s, collected: true } : s)),
    }));
    return true;
  },

  reset: () => set({ spawns: buildInitialSpawns() }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __forage: typeof useForageStore }).__forage = useForageStore;
}
