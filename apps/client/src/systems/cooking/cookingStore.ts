import { create } from 'zustand';

export interface CookingState {
  isOpen: boolean;
}

export interface CookingActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCookingStore = create<CookingState & CookingActions>((set, get) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __cooking: typeof useCookingStore }).__cooking = useCookingStore;
}
