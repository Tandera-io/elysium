// F8 — Gerador de recursos Godot (.tres) a partir dos atlases empacotados
// pelo asepritePacker. Lê os arquivos atlas.json produzidos pelo Aseprite
// e invoca os comandos Rust para serializar o texto .tres correto.
//
// Heurísticas:
//   - Characters: 1 SpriteFrames por personagem, 1 animação por prefixo
//     de nome de frame (ex: "idle_01.png", "walk_01.png") agrupado.
//   - Tilesets: 1 TileSet por bioma, grid baseado em frame_w/frame_h do json.
//   - UI: 1 AtlasTexture por ícone (com região exata do json).

import { invoke } from "@tauri-apps/api/core";
import { readProjectFile } from "./tauriFs";

interface AtlasFrame {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  duration?: number;
}

interface AtlasJson {
  frames: AtlasFrame[] | Record<string, AtlasFrame>;
  meta?: {
    image?: string;
    size?: { w: number; h: number };
  };
}

function normalizeFrames(json: AtlasJson): AtlasFrame[] {
  if (Array.isArray(json.frames)) return json.frames;
  return Object.entries(json.frames).map(([filename, f]) => ({ ...f, filename }));
}

function relativeToGame(abs: string): string {
  // Extrai "game/..." do absoluto.
  const idx = abs.toLowerCase().indexOf("\\game\\");
  if (idx >= 0) {
    return abs.slice(idx + "\\game\\".length).replace(/\\/g, "/");
  }
  const idxU = abs.toLowerCase().indexOf("/game/");
  if (idxU >= 0) {
    return abs.slice(idxU + "/game/".length);
  }
  return abs.replace(/\\/g, "/");
}

function actionFromFilename(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "");
  // remove sufixos numéricos tipo "_01" ou "-01"
  const m = base.match(/^(.+?)[_-]\d+$/);
  return m ? m[1] : base;
}

async function loadAtlas(
  projectId: string,
  jsonPath: string
): Promise<AtlasJson | null> {
  const rel = relativeToProject(projectId, jsonPath);
  if (!rel) return null;
  try {
    const raw = await readProjectFile(projectId, rel);
    return JSON.parse(raw) as AtlasJson;
  } catch {
    return null;
  }
}

function relativeToProject(projectId: string, abs: string): string | null {
  const marker = `projects\\${projectId}\\`;
  const markerU = `projects/${projectId}/`;
  const i = abs.toLowerCase().indexOf(marker.toLowerCase());
  if (i >= 0) return abs.slice(i + marker.length).replace(/\\/g, "/");
  const iU = abs.toLowerCase().indexOf(markerU.toLowerCase());
  if (iU >= 0) return abs.slice(iU + markerU.length);
  return null;
}

// ----------------------------------------------------------------------

export interface GodotResourceResult {
  name: string;
  tresPath: string;
  success: boolean;
  error?: string;
}

/**
 * Lê todos os `<character>_atlas.json` sob game/assets/generated/characters/
 * e gera 1 `.tres` SpriteFrames por personagem.
 */
export async function generateCharacterGodotResources(
  projectId: string
): Promise<GodotResourceResult[]> {
  return await generateFromPackedDir(
    projectId,
    "characters",
    async (atlasBase, atlasJson, atlasPngRel) => {
      const frames = normalizeFrames(atlasJson);
      if (frames.length === 0) return null;
      // Agrupa frames por "action" inferido do filename.
      const byAction: Record<string, number[]> = {};
      frames.forEach((f, idx) => {
        const action = actionFromFilename(f.filename);
        (byAction[action] ??= []).push(idx);
      });
      // Pixellab gera todos no mesmo tamanho; assume frame_w = width do 1º.
      const fw = frames[0].frame.w;
      const fh = frames[0].frame.h;
      const atlasW = atlasJson.meta?.size?.w ?? fw * frames.length;
      const columns = Math.max(1, Math.floor(atlasW / fw));
      const animations = Object.entries(byAction).map(([name, idxs]) => ({
        name,
        frames: idxs,
        fps: name.includes("idle") ? 4 : 10,
        loop: !name.includes("attack") && !name.includes("death"),
      }));

      const outTresRel = `assets/generated/characters/${atlasBase}_frames.tres`;
      await invoke<string>("generate_sprite_frames_tres", {
        args: {
          project_id: projectId,
          atlas_png_rel: atlasPngRel,
          out_tres_rel: outTresRel,
          frame_w: fw,
          frame_h: fh,
          animations,
          columns,
        },
      });
      return outTresRel;
    }
  );
}

export async function generateTilesetGodotResources(
  projectId: string
): Promise<GodotResourceResult[]> {
  return await generateFromPackedDir(
    projectId,
    "tilesets",
    async (atlasBase, atlasJson, atlasPngRel) => {
      const frames = normalizeFrames(atlasJson);
      if (frames.length === 0) return null;
      const tw = frames[0].frame.w;
      const th = frames[0].frame.h;
      const atlasW = atlasJson.meta?.size?.w ?? tw * frames.length;
      const atlasH = atlasJson.meta?.size?.h ?? th;
      const columns = Math.max(1, Math.floor(atlasW / tw));
      const rows = Math.max(1, Math.ceil(frames.length / columns));
      const outTresRel = `assets/generated/tilesets/${atlasBase}_tileset.tres`;
      await invoke<string>("generate_tileset_resource_tres", {
        args: {
          project_id: projectId,
          tileset_png_rel: atlasPngRel,
          out_tres_rel: outTresRel,
          tile_w: tw,
          tile_h: th,
          columns,
          rows: Math.min(rows, Math.ceil(atlasH / th)),
        },
      });
      return outTresRel;
    }
  );
}

export async function generateUiGodotResources(
  projectId: string
): Promise<GodotResourceResult[]> {
  const results: GodotResourceResult[] = [];
  const atlases = await listPackedAtlases(projectId, "ui");
  for (const a of atlases) {
    const json = await loadAtlas(projectId, a.jsonPath);
    if (!json) continue;
    const frames = normalizeFrames(json);
    const atlasPngRel = relativeToGame(a.pngPath);
    for (const f of frames) {
      const safe = f.filename
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9_-]+/gi, "_");
      const outTresRel = `assets/generated/ui/${safe}.tres`;
      try {
        await invoke<string>("generate_atlas_texture_tres", {
          args: {
            project_id: projectId,
            atlas_png_rel: atlasPngRel,
            out_tres_rel: outTresRel,
            region_x: f.frame.x,
            region_y: f.frame.y,
            region_w: f.frame.w,
            region_h: f.frame.h,
          },
        });
        results.push({ name: safe, tresPath: outTresRel, success: true });
      } catch (e) {
        results.push({
          name: safe,
          tresPath: outTresRel,
          success: false,
          error: String(e),
        });
      }
    }
  }
  return results;
}

// ---------------- Shared machinery ----------------

interface PackedAtlas {
  name: string;
  pngPath: string;
  jsonPath: string;
}

async function listPackedAtlases(
  projectId: string,
  subdir: string
): Promise<PackedAtlas[]> {
  const rel = `game/assets/generated/${subdir}`;
  try {
    const files = await invoke<
      { name: string; path: string; is_dir: boolean }[]
    >("list_project_files", {
      projectId,
      relative: rel,
    });
    const atlases: PackedAtlas[] = [];
    for (const f of files) {
      if (!f.is_dir && f.name.endsWith("_atlas.png")) {
        const jsonName = f.name.replace(/\.png$/, ".json");
        const jsonFile = files.find((ff) => ff.name === jsonName);
        if (jsonFile) {
          atlases.push({
            name: f.name.replace(/_atlas\.png$/, ""),
            pngPath: f.path,
            jsonPath: jsonFile.path,
          });
        }
      }
    }
    return atlases;
  } catch {
    return [];
  }
}

async function generateFromPackedDir(
  projectId: string,
  subdir: string,
  handle: (
    atlasBase: string,
    json: AtlasJson,
    atlasPngRel: string
  ) => Promise<string | null>
): Promise<GodotResourceResult[]> {
  const atlases = await listPackedAtlases(projectId, subdir);
  const results: GodotResourceResult[] = [];
  for (const a of atlases) {
    const json = await loadAtlas(projectId, a.jsonPath);
    if (!json) {
      results.push({
        name: a.name,
        tresPath: "",
        success: false,
        error: "atlas.json inválido",
      });
      continue;
    }
    const atlasPngRel = relativeToGame(a.pngPath);
    try {
      const tresPath = await handle(a.name, json, atlasPngRel);
      results.push({
        name: a.name,
        tresPath: tresPath ?? "",
        success: !!tresPath,
      });
    } catch (e) {
      results.push({
        name: a.name,
        tresPath: "",
        success: false,
        error: String(e),
      });
    }
  }
  return results;
}
