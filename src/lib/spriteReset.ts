// F1 sprite reset — limpa DB + disco + canon.spriteAssetIds para rerodar
// pipeline do zero. Irreversível.

import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { getDb } from "./db";
import { loadCanon } from "./canon";
import { isTauri } from "./utils";
import type { GeneratedAsset } from "@/types/domain";

async function db(): Promise<Database> {
  return getDb();
}

function toRelative(filePath: string, projectId: string): string | null {
  const marker = `projects\\${projectId}\\`;
  const markerUnix = `projects/${projectId}/`;
  const idx = filePath.lastIndexOf(marker);
  if (idx >= 0) return filePath.slice(idx + marker.length).replace(/\\/g, "/");
  const idxUnix = filePath.lastIndexOf(markerUnix);
  if (idxUnix >= 0) return filePath.slice(idxUnix + markerUnix.length);
  return null;
}

export interface SpriteResetResult {
  assetsDeleted: number;
  jobsReset: number;
  filesRemoved: number;
  framesDirsRemoved: number;
  canonEntriesCleaned: number;
}

/**
 * Zera F1: deleta PNGs do disco, limpa generated_assets (sprites), reseta
 * asset_jobs (domain=character_sprite) para pending, remove spriteAssetIds
 * de todas as canon entries.
 *
 * Idempotente: rodar 2x não causa erro.
 */
export async function resetCharacterSprites(
  projectId: string
): Promise<SpriteResetResult> {
  if (!isTauri()) {
    throw new Error("resetCharacterSprites requer ambiente Tauri");
  }

  const d = await db();

  // 1. Coleta sprites existentes
  const assets = (await d.select<GeneratedAsset[]>(
    "SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'sprite'",
    [projectId]
  )) ?? [];

  // 2. Remove arquivo por arquivo do disco (idempotente)
  let filesRemoved = 0;
  const framesDirsSeen = new Set<string>();
  for (const asset of assets) {
    const rel = toRelative(asset.file_path, projectId);
    if (!rel) continue;
    try {
      await invoke<void>("delete_project_file", { projectId, relative: rel });
      filesRemoved++;
      // Detecta subfolder de frames fatiados (sprite/<slug>_<action>_<dir>_frames/)
      const match = /^(assets\/sprite\/[^/]+_frames)\//.exec(rel);
      if (match) framesDirsSeen.add(match[1]);
    } catch (e) {
      console.warn(`[spriteReset] delete falhou ${rel}:`, e);
    }
  }

  // 3. Remove as subfolders de frames como último passo (após os arquivos)
  let framesDirsRemoved = 0;
  for (const dir of framesDirsSeen) {
    try {
      await invoke<void>("delete_project_file", { projectId, relative: dir });
      framesDirsRemoved++;
    } catch (e) {
      console.warn(`[spriteReset] remove dir falhou ${dir}:`, e);
    }
  }

  // 4. DELETE generated_assets (sprite)
  const delResult = (await d.execute(
    "DELETE FROM generated_assets WHERE project_id = ? AND asset_type = 'sprite'",
    [projectId]
  )) as { rowsAffected?: number };
  const assetsDeleted = delResult?.rowsAffected ?? assets.length;

  // 5. Reset asset_jobs (character_sprite): pending, attempts=0, sem erro
  const jobResult = (await d.execute(
    `UPDATE asset_jobs
     SET status = 'pending',
         asset_id = NULL,
         attempts = 0,
         last_error = NULL,
         heartbeat_at = NULL,
         updated_at = datetime('now')
     WHERE project_id = ? AND domain = 'character_sprite'`,
    [projectId]
  )) as { rowsAffected?: number };
  const jobsReset = jobResult?.rowsAffected ?? 0;

  // 6. Limpa canon spriteAssetIds de todas entries
  let canonEntriesCleaned = 0;
  try {
    const canon = await loadCanon(projectId);
    let changed = false;
    for (const entry of canon.entries) {
      if (entry.spriteAssetIds && entry.spriteAssetIds.length > 0) {
        entry.spriteAssetIds = [];
        canonEntriesCleaned++;
        changed = true;
      }
    }
    if (changed) {
      await invoke("write_project_file", {
        args: {
          project_id: projectId,
          relative: "canon.json",
          content: JSON.stringify(canon, null, 2),
        },
      });
      try {
        window.dispatchEvent(
          new CustomEvent("canon-updated", { detail: { projectId } })
        );
      } catch {
        /* noop */
      }
    }
  } catch (e) {
    console.warn(`[spriteReset] limpar canon spriteAssetIds falhou:`, e);
  }

  return {
    assetsDeleted,
    jobsReset,
    filesRemoved,
    framesDirsRemoved,
    canonEntriesCleaned,
  };
}
