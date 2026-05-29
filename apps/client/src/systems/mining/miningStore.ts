import { create } from 'zustand';
import { VEINS_BY_DEPTH, ORE_DEFS, type OreId } from './oreDefs';

export interface MiningState {
  caveOpen: boolean;
  currentDepth: number;
  harvestedVeins: Set<string>;
}

export interface MiningActions {
  enterCave: () => void;
  exitCave: () => void;
  setDepth: (depth: number) => void;
  /** Returns the ore and quantity yielded, or null if already mined or invalid. */
  harvestVein: (veinId: string) => { oreId: OreId; quantity: number } | null;
  reset: () => void;
}

function yieldFor(veinId: string, depth: number): number {
  const veins = VEINS_BY_DEPTH[depth] ?? [];
  const vein = veins.find((v) => v.id === veinId);
  if (!vein) return 1;
  const def = ORE_DEFS[vein.oreId];
  // Deterministic yield derived from vein id to avoid Math.random in store
  const hash = veinId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return def.yieldMin + (hash % (def.yieldMax - def.yieldMin + 1));
}

export const useMiningStore = create<MiningState & MiningActions>((set, get) => ({
  caveOpen: false,
  currentDepth: 1,
  harvestedVeins: new Set(),

  enterCave: () => set({ caveOpen: true, currentDepth: 1, harvestedVeins: new Set() }),
  exitCave: () => set({ caveOpen: false }),

  setDepth: (depth) => set({ currentDepth: depth, harvestedVeins: new Set() }),

  harvestVein: (veinId) => {
    const { harvestedVeins, currentDepth } = get();
    if (harvestedVeins.has(veinId)) return null;
    const veins = VEINS_BY_DEPTH[currentDepth] ?? [];
    const vein = veins.find((v) => v.id === veinId);
    if (!vein) return null;
    const quantity = yieldFor(veinId, currentDepth);
    const next = new Set(harvestedVeins);
    next.add(veinId);
    set({ harvestedVeins: next });
    return { oreId: vein.oreId, quantity };
  },

  reset: () => set({ caveOpen: false, currentDepth: 1, harvestedVeins: new Set() }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __mining: typeof useMiningStore }).__mining = useMiningStore;
}
