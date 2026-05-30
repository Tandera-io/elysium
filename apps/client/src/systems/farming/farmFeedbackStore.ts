import { create } from 'zustand';

export type FeedbackKind = 'success' | 'warn' | 'error';

export interface FeedbackEntry {
  id: number;
  message: string;
  kind: FeedbackKind;
  /** timestamp when this entry was created (Date.now()) */
  at: number;
}

interface FarmFeedbackState {
  entries: FeedbackEntry[];
}

interface FarmFeedbackActions {
  push: (message: string, kind: FeedbackKind) => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

let _nextId = 0;

export const useFarmFeedbackStore = create<FarmFeedbackState & FarmFeedbackActions>((set) => ({
  entries: [],
  push: (message, kind) => {
    const id = _nextId++;
    set((s) => ({ entries: [...s.entries, { id, message, kind, at: Date.now() }] }));
    // Auto-dismiss after 2.5 s
    setTimeout(() => {
      set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    }, 2500);
  },
  dismiss: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
  clear: () => set({ entries: [] }),
}));
