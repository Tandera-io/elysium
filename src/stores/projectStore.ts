import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { GameProject, PhaseDocument } from "@/types/domain";
import { documentsRepo, projectsRepo } from "@/lib/db";
import { isTauri } from "@/lib/utils";

interface ProjectState {
  projects: GameProject[];
  currentProject: GameProject | null;
  documents: PhaseDocument[];
  activePhase: number;

  refreshProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<GameProject>;
  archiveProject: (id: string) => Promise<void>;
  setActivePhase: (n: number) => void;
  updateCurrentPhaseInDb: (n: number) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  currentProject: null,
  documents: [],
  activePhase: 1,

  refreshProjects: async () => {
    const list = await projectsRepo.list();
    set({ projects: list });
  },

  loadProject: async (id: string) => {
    const proj = await projectsRepo.get(id);
    if (!proj) throw new Error("Projeto não encontrado");
    if (isTauri()) {
      await invoke("create_project_dir", { projectId: id }).catch(() => {});
    }
    set({ currentProject: proj, activePhase: proj.current_phase });
    await get().refreshDocuments();
  },

  refreshDocuments: async () => {
    const p = get().currentProject;
    if (!p) return;
    const docs = await documentsRepo.listByProject(p.id);
    set({ documents: docs });
  },

  createProject: async (name, description) => {
    const p = await projectsRepo.create(name, description);
    if (isTauri()) {
      await invoke("create_project_dir", { projectId: p.id }).catch(() => {});
    }
    await get().refreshProjects();
    return p;
  },

  archiveProject: async (id) => {
    await projectsRepo.archive(id);
    await get().refreshProjects();
  },

  setActivePhase: (n) => set({ activePhase: n }),

  updateCurrentPhaseInDb: async (n) => {
    const p = get().currentProject;
    if (!p) return;
    await projectsRepo.update(p.id, { current_phase: n });
    const updated = await projectsRepo.get(p.id);
    if (updated) set({ currentProject: updated, activePhase: n });
  },
}));
