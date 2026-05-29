import { create } from 'zustand';

export type FishingPhase = 'idle' | 'casting' | 'waiting' | 'reeling' | 'done';

interface FishingState {
  phase: FishingPhase;
}

interface FishingActions {
  startFishing: () => void;
  reset: () => void;
}

export const useFishingStore = create<FishingState & FishingActions>((set) => ({
  phase: 'idle',
  startFishing: () => set({ phase: 'casting' }),
  reset: () => set({ phase: 'idle' }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __fishing: typeof useFishingStore }).__fishing = useFishingStore;
}
