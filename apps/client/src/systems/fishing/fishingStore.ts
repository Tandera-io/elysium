import { create } from 'zustand';
import { FISH_IDS, FISH_DEFS, type FishId } from './fishDefs';
import { useInventoryStore } from '../inventory/inventoryStore';

export type FishingPhase = 'idle' | 'casting' | 'biting' | 'result';

export interface CatchResult {
  fishId: FishId;
  gold: number;
  caught: boolean;
}

export interface FishingState {
  phase: FishingPhase;
  biteDeadline: number;
  catchDeadline: number;
  lastResult: CatchResult | null;
}

export interface FishingActions {
  startFishing: () => void;
  onBite: () => void;
  catchFish: () => void;
  miss: () => void;
  reset: () => void;
}

const BITE_WINDOW_MS = 2000;

function pickFish(): FishId {
  return FISH_IDS[Math.floor(Math.random() * FISH_IDS.length)]!;
}

function biteDelayMs(): number {
  return 2000 + Math.floor(Math.random() * 2001);
}

export const useFishingStore = create<FishingState & FishingActions>((set) => ({
  phase: 'idle',
  biteDeadline: 0,
  catchDeadline: 0,
  lastResult: null,

  startFishing: () => {
    const delay = biteDelayMs();
    set({ phase: 'casting', biteDeadline: Date.now() + delay, catchDeadline: 0, lastResult: null });
  },

  onBite: () => {
    set({ phase: 'biting', catchDeadline: Date.now() + BITE_WINDOW_MS });
  },

  catchFish: () => {
    const fishId = pickFish();
    const def = FISH_DEFS[fishId];
    useInventoryStore.getState().add(fishId, 1);
    useInventoryStore.getState().addGold(def.goldValue);
    set({ phase: 'result', lastResult: { fishId, gold: def.goldValue, caught: true } });
  },

  miss: () => {
    set({ phase: 'result', lastResult: { fishId: 'cod', gold: 0, caught: false } });
  },

  reset: () => {
    set({ phase: 'idle', biteDeadline: 0, catchDeadline: 0, lastResult: null });
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __fishing: typeof useFishingStore }).__fishing = useFishingStore;
}
