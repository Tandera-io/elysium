import { create } from 'zustand';

export type FishingPhase =
  | 'idle'
  | 'casting'
  | 'waiting'
  | 'bite'
  | 'reeling'
  | 'caught'
  | 'missed';

export interface FishingState {
  isFishing: boolean;
  phase: FishingPhase;
  /** ms timestamp when bite will occur (set during 'waiting' phase) */
  biteTime: number;
  /** 0-100, position of the reel indicator */
  reelPos: number;
  /** Number of fish caught this session */
  fishCaught: number;
}

export interface FishingActions {
  startFishing: () => void;
  cancelFishing: () => void;
  triggerBite: () => void;
  catchFish: () => void;
  missFish: () => void;
}

function makeInitial(): FishingState {
  return {
    isFishing: false,
    phase: 'idle',
    biteTime: 0,
    reelPos: 50,
    fishCaught: 0,
  };
}

export const useFishingStore = create<FishingState & FishingActions>((set, get) => ({
  ...makeInitial(),

  startFishing: () => {
    if (get().isFishing) return;
    const delay = 2000 + Math.random() * 2000;
    const biteTime = Date.now() + delay;
    set({
      isFishing: true,
      phase: 'casting',
      biteTime,
      reelPos: 50,
    });
    setTimeout(() => {
      if (get().phase === 'casting') {
        set({ phase: 'waiting' });
      }
    }, 600);
    setTimeout(() => {
      if (get().phase === 'waiting') {
        get().triggerBite();
      }
    }, delay);
  },

  cancelFishing: () => {
    set(makeInitial());
  },

  triggerBite: () => {
    if (!get().isFishing) return;
    set({ phase: 'bite' });
    setTimeout(() => {
      if (get().phase === 'bite') {
        get().missFish();
      }
    }, 1500);
  },

  catchFish: () => {
    if (get().phase !== 'bite') return;
    set((s) => ({ phase: 'caught', fishCaught: s.fishCaught + 1 }));
    setTimeout(() => {
      if (get().phase === 'caught') {
        set({ isFishing: false, phase: 'idle' });
      }
    }, 1200);
  },

  missFish: () => {
    if (!get().isFishing) return;
    set({ phase: 'missed' });
    setTimeout(() => {
      if (get().phase === 'missed') {
        set({ isFishing: false, phase: 'idle' });
      }
    }, 1200);
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __fishing: typeof useFishingStore }).__fishing = useFishingStore;
}
