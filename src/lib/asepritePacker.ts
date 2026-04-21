// F7 — Aseprite Packer. Agrupa os PNGs gerados em spritesheets prontos
// para Godot:
//
//   - packCharacterSheets: 1 sheet por personagem (todos os frames/anim
//     aprovados aquele personagem).
//   - packTilesets: 1 sheet por bioma.
//   - packUiAtlas: 1 sheet global de UI.
//
// Cada chamada invoca o comando Rust `aseprite_pack_sheet` que usa Aseprite
// CLI nativo (--sheet --data --format json-array), gerando `<nome>.png` +
// `<nome>.json` em `<APPDATA>/projects/<id>/game/assets/generated/`.

import { invoke } from "@tauri-apps/api/core";
import { assetsRepo } from "./db";
import type { GeneratedAsset } from "@/types/domain";

export interface PackResult {
  name: string;
  outPng: string;
  outJson: string;
  success: boolean;
  frameCount: number;
  stderr?: string;
  message: string;
}

async function projectRoot(projectId: string): Promise<string> {
  return invoke<string>("create_project_dir", { projectId });
}

async function packGroup(args: {
  projectId: string;
  name: string;
  assets: GeneratedAsset[];
  sheetType?: "packed" | "rows" | "columns" | "horizontal";
  outSubdir: string;
}): Promise<PackResult> {
  const { projectId, name, assets, sheetType, outSubdir } = args;
  const root = await projectRoot(projectId);
  // Output sob game/assets/generated/<outSubdir>/
  // (o Rust command cria recursivamente se faltar).
  const outDir = `${root}\\game\\assets\\generated\\${outSubdir}`;
  const outPng = `${outDir}\\${name}_atlas.png`;
  const outJson = `${outDir}\\${name}_atlas.json`;
  const inputFiles = assets.map((a) => a.file_path);

  const res = await invoke<{
    success: boolean;
    stdout: string;
    stderr: string;
    exit_code: number;
  }>("aseprite_pack_sheet", {
    args: {
      input_files: inputFiles,
      out_png: outPng,
      out_json: outJson,
      sheet_type: sheetType ?? "packed",
      exe: null,
    },
  });

  const frameCount = assets.length;
  if (!res.success) {
    const errTail = (res.stderr || res.stdout || "").trim().slice(-400);
    return {
      name,
      outPng,
      outJson,
      success: false,
      frameCount,
      stderr: res.stderr || res.stdout,
      message: `FALHOU (${frameCount} frames): ${errTail || "erro desconhecido no Aseprite CLI"}`,
    };
  }

  return {
    name,
    outPng,
    outJson,
    success: true,
    frameCount,
    stderr: res.stderr,
    message: `OK · ${frameCount} frames empacotados em ${outPng.split(/[\\/]/).pop()}`,
  };
}

function groupBy<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const it of arr) {
    const k = key(it);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(it);
  }
  return out;
}

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function metaField<T = string>(
  asset: GeneratedAsset,
  key: string
): T | undefined {
  try {
    if (!asset.generation_metadata) return undefined;
    const parsed = JSON.parse(asset.generation_metadata) as Record<
      string,
      unknown
    >;
    return parsed[key] as T | undefined;
  } catch {
    return undefined;
  }
}

/** Agrupa sprites aprovados por personagem (deriva do prompt/filename) e
 *  gera 1 spritesheet por personagem. */
export async function packCharacterSheets(
  projectId: string
): Promise<PackResult[]> {
  const assets = (await assetsRepo.listByProject(projectId)).filter(
    (a) => a.asset_type === "sprite" && a.status === "approved"
  );
  if (assets.length === 0) return [];
  const groups = groupBy(assets, (a) => {
    // 1) Preferência: metadata.character_name (salva pelo F1 runner).
    const name = metaField<string>(a, "character_name");
    if (name && typeof name === "string") return sanitize(name);
    const fn = a.file_name.toLowerCase();
    if (/^[0-9a-f]{16,}\.png$/.test(fn)) {
      return sanitize(a.prompt.split(/\s+/).slice(0, 3).join("_") || "character");
    }
    const base = fn.replace(/\.png$/, "");
    const parts = base.split("_");
    return sanitize(parts[0] || base);
  });

  const results: PackResult[] = [];
  for (const [name, group] of groups) {
    try {
      const r = await packGroup({
        projectId,
        name: sanitize(name) || "character",
        assets: group,
        outSubdir: "characters",
        sheetType: "packed",
      });
      results.push(r);
    } catch (e) {
      results.push({
        name,
        outPng: "",
        outJson: "",
        success: false,
        frameCount: group.length,
        stderr: String(e),
        message: `FALHOU (${group.length} frames): ${String(e)}`,
      });
    }
  }
  return results;
}

/** Agrupa tiles por bioma (metadata.biome) e gera 1 tileset por bioma. */
export async function packTilesets(projectId: string): Promise<PackResult[]> {
  const assets = (await assetsRepo.listByProject(projectId)).filter(
    (a) => a.asset_type === "tile" && a.status === "approved"
  );
  if (assets.length === 0) return [];
  const groups = groupBy(assets, (a) => {
    const biome = metaField<string>(a, "biome") ?? "overworld";
    return sanitize(biome);
  });
  const results: PackResult[] = [];
  for (const [biome, group] of groups) {
    try {
      const r = await packGroup({
        projectId,
        name: biome || "tileset",
        assets: group,
        outSubdir: "tilesets",
        sheetType: "rows",
      });
      results.push(r);
    } catch (e) {
      results.push({
        name: biome,
        outPng: "",
        outJson: "",
        success: false,
        frameCount: group.length,
        stderr: String(e),
        message: `FALHOU (${group.length} frames): ${String(e)}`,
      });
    }
  }
  return results;
}

/** Um atlas único para todos os ícones/HUD do projeto. */
export async function packUiAtlas(projectId: string): Promise<PackResult[]> {
  const assets = (await assetsRepo.listByProject(projectId)).filter(
    (a) =>
      a.asset_type === "sprite" &&
      a.status === "approved" &&
      metaField<string>(a, "group") !== undefined
  );
  if (assets.length === 0) return [];
  try {
    const r = await packGroup({
      projectId,
      name: "ui",
      assets,
      outSubdir: "ui",
      sheetType: "packed",
    });
    return [r];
  } catch (e) {
    return [
      {
        name: "ui",
        outPng: "",
        outJson: "",
        success: false,
        frameCount: assets.length,
        stderr: String(e),
        message: `FALHOU (${assets.length} frames): ${String(e)}`,
      },
    ];
  }
}
