/**
 * Marina's crop task system.
 *
 * Unlike the economy quest system (which deals with EconomyItemId items like
 * 'trigo'), Marina's crop tasks operate directly on CropId items harvested
 * from the player's farm. This bridges the gap between the farm system and
 * NPC interaction.
 *
 * A task asks the player to harvest a specific number of a given crop and
 * deliver them to Marina. On success Marina pays gold and reputation rises.
 */
import { create } from 'zustand';
import type { CropId } from './CropDefs';

export type CropTaskStatus = 'offered' | 'accepted' | 'declined' | 'completed';

export interface CropTask {
  id: string;
  giverNpcId: 'marina';
  crop: CropId;
  quantity: number;
  rewardGold: number;
  status: CropTaskStatus;
  createdOnDay: number;
}

/** Reward table: gold per unit delivered to Marina. */
const REWARD_PER_UNIT: Record<CropId, number> = {
  wheat: 12,
  tomato: 10,
  pumpkin: 20,
  corn: 14,
  strawberry: 18,
};

/** Human-readable Portuguese names for crops. */
export const CROP_PT_NAMES: Record<CropId, string> = {
  wheat: 'Trigo',
  tomato: 'Tomate',
  pumpkin: 'Abóbora',
  corn: 'Milho',
  strawberry: 'Morango',
};

/**
 * Generate a Marina crop task for a given day. Cycles through crops so Marina
 * asks for something different as the days progress.
 */
export function generateMarinaCropTask(day: number): CropTask {
  const crops: CropId[] = ['wheat', 'tomato', 'corn', 'pumpkin', 'strawberry'];
  const crop = crops[day % crops.length] as CropId;
  // Quantity scales slightly with day (2–5 units).
  const quantity = 2 + (day % 4);
  const reward = REWARD_PER_UNIT[crop] * quantity;
  return {
    id: `marina-${crop}-d${day}`,
    giverNpcId: 'marina',
    crop,
    quantity,
    rewardGold: reward,
    status: 'offered',
    createdOnDay: day,
  };
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

export interface MarinaCropTaskState {
  /** Currently offered / accepted task, if any. */
  current: CropTask | null;
  /** How many times the player has completed a task for Marina. */
  completedCount: number;
}

export interface MarinaCropTaskActions {
  /** Propose a new task (replaces any previous offered/declined task). */
  offer: (day: number) => void;
  /** Player accepted the offered task. */
  accept: () => void;
  /** Player declined the offered task. */
  decline: () => void;
  /** Turn in the task — removes items from inventory externally, call this after removal. */
  complete: () => void;
  reset: () => void;
}

export const useMarinaCropTaskStore = create<MarinaCropTaskState & MarinaCropTaskActions>(
  (set, get) => ({
    current: null,
    completedCount: 0,

    offer: (day) => {
      const cur = get().current;
      // Don't overwrite an active/accepted task.
      if (cur && cur.status === 'accepted') return;
      set({ current: generateMarinaCropTask(day) });
    },

    accept: () => {
      set((s) => {
        if (!s.current || s.current.status !== 'offered') return s;
        return { current: { ...s.current, status: 'accepted' } };
      });
    },

    decline: () => {
      set((s) => {
        if (!s.current || s.current.status !== 'offered') return s;
        return { current: { ...s.current, status: 'declined' } };
      });
    },

    complete: () => {
      set((s) => {
        if (!s.current || s.current.status !== 'accepted') return s;
        return {
          current: { ...s.current, status: 'completed' },
          completedCount: s.completedCount + 1,
        };
      });
    },

    reset: () => set({ current: null, completedCount: 0 }),
  }),
);

if (import.meta.env.DEV) {
  (window as unknown as { __marinaCropTask: typeof useMarinaCropTaskStore }).__marinaCropTask =
    useMarinaCropTaskStore;
}
