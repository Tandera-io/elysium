import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CenterTabKind =
  | "document"
  | "mechanics-map"
  | "lore-tree"
  | "quest-editor"
  | "asset-preview"
  | "audio-preview"
  | "kb-explorer"
  | "semantic-graph"
  | "settings"
  | "batch-producer"
  | "concept-pipeline"
  | "character-sprites-pipeline"
  | "sprite-gallery"
  | "tilesets-pipeline"
  | "ui-hud-pipeline"
  | "vfx-items-pipeline"
  | "audio-sfx-pipeline"
  | "audio-music-pipeline"
  | "scene-builder"
  | "canon"
  | "art-coverage"
  | "implementation";

export interface CenterTab {
  id: string;
  kind: CenterTabKind;
  title: string;
  payload?: Record<string, unknown>;
}

interface UiState {
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  centerSplit: boolean;
  tabs: CenterTab[];
  activeTabId: string | null;

  setLeftWidth: (v: number) => void;
  setRightWidth: (v: number) => void;
  setBottomHeight: (v: number) => void;
  toggleCenterSplit: () => void;

  openTab: (tab: Omit<CenterTab, "id"> & { id?: string }) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  clearTabs: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      leftWidth: 18,
      rightWidth: 30,
      bottomHeight: 14,
      centerSplit: false,
      tabs: [],
      activeTabId: null,

      setLeftWidth: (v) => set({ leftWidth: v }),
      setRightWidth: (v) => set({ rightWidth: v }),
      setBottomHeight: (v) => set({ bottomHeight: v }),
      toggleCenterSplit: () =>
        set((s) => ({ centerSplit: !s.centerSplit })),

      openTab: (tab) => {
        const id = tab.id ?? `${tab.kind}:${Date.now()}`;
        const existing = get().tabs.find(
          (t) => t.id === id || (tab.id && t.id === tab.id)
        );
        if (existing) {
          set({ activeTabId: existing.id });
          return existing.id;
        }
        const next: CenterTab = { id, kind: tab.kind, title: tab.title, payload: tab.payload };
        set((s) => ({
          tabs: [...s.tabs, next],
          activeTabId: id,
        }));
        return id;
      },
      closeTab: (id) =>
        set((s) => {
          const tabs = s.tabs.filter((t) => t.id !== id);
          return {
            tabs,
            activeTabId:
              s.activeTabId === id ? tabs[tabs.length - 1]?.id ?? null : s.activeTabId,
          };
        }),
      setActiveTab: (id) => set({ activeTabId: id }),
      clearTabs: () => set({ tabs: [], activeTabId: null }),
    }),
    {
      name: "elysium-ui-state",
      partialize: (s) => ({
        leftWidth: s.leftWidth,
        rightWidth: s.rightWidth,
        bottomHeight: s.bottomHeight,
        centerSplit: s.centerSplit,
      }),
    }
  )
);
