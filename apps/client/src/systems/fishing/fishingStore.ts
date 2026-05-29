import { create } from 'zustand';
import type { ItemId } from '../inventory/inventoryStore';

export type FishId = Extract<ItemId, 'bass' | 'pike' | 'perch'>;

export interface FishingState {
  isMinigameOpen: boolean;
  activeFish: FishId | null;
  biteChance: number;
  catchProgress: number;
  isSuccess: boolean;
}

export interface FishingActions {
  openMinigame: () => void;
  closeMinigame: () => void;
  updateProgress: (progress: number) => void;
  setCatchSuccess: (success: boolean) => void;
  reset: () => void;
}

const FISH_POOL: FishId[] = ['bass', 'pike', 'perch'];

function pickRandomFish(): FishId {
  const idx = Math.floor(Math.random() * FISH_POOL.length);
  return FISH_POOL[idx] ?? 'bass';
}

const initialState: FishingState = {
  isMinigameOpen: false,
  activeFish: null,
  biteChance: 0.7,
  catchProgress: 0,
  isSuccess: false,
};

export const useFishingStore = create<FishingState & FishingActions>((set) => ({
  ...initialState,
  openMinigame: () =>
    set({
      isMinigameOpen: true,
      activeFish: pickRandomFish(),
      catchProgress: 0,
      isSuccess: false,
    }),
  closeMinigame: () => set({ isMinigameOpen: false }),
  updateProgress: (progress) => set({ catchProgress: Math.min(100, Math.max(0, progress)) }),
  setCatchSuccess: (success) => set({ isSuccess: success }),
  reset: () => set(initialState),
}));
