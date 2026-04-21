// Helpers finos para comandos Tauri que lidam com filesystem do projeto.
// Unificar evita duplicação em conceptPlanner, phase libs, etc.

import { invoke } from "@tauri-apps/api/core";

export async function readBinaryAssetBase64(
  projectId: string,
  relative: string
): Promise<string> {
  return invoke<string>("read_binary_asset", { projectId, relative });
}

export async function writeProjectFile(
  projectId: string,
  relative: string,
  content: string
): Promise<string> {
  return invoke<string>("write_project_file", {
    args: { project_id: projectId, relative, content },
  });
}

export async function readProjectFile(
  projectId: string,
  relative: string
): Promise<string> {
  return invoke<string>("read_project_file", { projectId, relative });
}

export async function createProjectDir(projectId: string): Promise<string> {
  return invoke<string>("create_project_dir", { projectId });
}
