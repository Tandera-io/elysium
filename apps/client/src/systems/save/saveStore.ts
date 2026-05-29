import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { readSave } from './saveDb';
import { applySnapshot } from './snapshot';

interface SaveMeta {
  lastSavedSlot: number | null;
}

interface SaveMetaActions {
  setLastSavedSlot: (slot: number | null) => void;
  tryAutoLoad: () => Promise<boolean>;
}

export const useSaveStore = create<SaveMeta & SaveMetaActions>()(
  persist(
    (set, get) => ({
      lastSavedSlot: null,
      setLastSavedSlot: (slot) => set({ lastSavedSlot: slot }),
      tryAutoLoad: async () => {
        const slot = get().lastSavedSlot;
        if (slot === null) return false;
        const row = await readSave(slot);
        if (!row) return false;
        applySnapshot(row.snapshot);
        return true;
      },
    }),
    { name: 'elysium-save-meta' },
  ),
);
