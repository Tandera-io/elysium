// F2 — Tilesets por bioma. Gera tiles individuais via Pixellab que
// posteriormente serão empacotados em atlas por bioma (F7) e convertidos em
// TileSet .tres do Godot (F8).

import { generatePixellab } from "../apis/pixellab";
import { createAssetPhase, type BasePlanItem } from "../assetPhase";
import { TILESET_TILE_PROMPT } from "@/prompts/tileset_tile";

export interface TilesetItem extends BasePlanItem {
  biome: string;
  tileKind: "floor" | "wall" | "ceiling" | "transition" | "decoration" | "prop";
  size: 32 | 48 | 64;
  variant?: string;
  prompt: string;
}

export const tilesetPhase = createAssetPhase<TilesetItem>({
  phaseId: "tilesets",
  planFilename: "tileset_plan.json",
  systemPrompt: TILESET_TILE_PROMPT,
  requiredPhases: [7, 9],
  // Worldbuilding expandido (14) e Exploration (21) detalham sub-regiões e
  // POIs que viram tiles específicos.
  corpusPhases: [5, 7, 9, 12, 14, 21],
  normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
    if (!name || !prompt) return null;
    const biome = typeof r.biome === "string" ? r.biome : "overworld";
    const tk = typeof r.tileKind === "string" ? r.tileKind : "floor";
    const tileKind = (
      ["floor", "wall", "ceiling", "transition", "decoration", "prop"].includes(tk)
        ? tk
        : "floor"
    ) as TilesetItem["tileKind"];
    const size =
      r.size === 32 || r.size === 48 || r.size === 64 ? (r.size as 32 | 48 | 64) : 64;
    const variant = typeof r.variant === "string" ? r.variant : undefined;
    const rationale = typeof r.rationale === "string" ? r.rationale : "";
    const sourcePhase = typeof r.sourcePhase === "number" ? r.sourcePhase : 7;
    return { name, biome, tileKind, size, variant, prompt, rationale, sourcePhase };
  },
  async runOne(item, ctx) {
    const res = await generatePixellab({
      projectId: ctx.projectId,
      prompt: item.prompt,
      size: item.size as 64,
      assetType: "tile",
      shading: "basic shading",
      detail: "highly detailed",
      outline: "selective outline",
      noBackground: false,
    });
    return {
      asset: res.asset,
      kbMetadata: {
        biome: item.biome,
        tileKind: item.tileKind,
        size: item.size,
        variant: item.variant,
      },
    };
  },
  defaultConcurrency: 2,
});
