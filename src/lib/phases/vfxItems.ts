// F4 — VFX & Itens. Armas, consumíveis, partículas — todos com
// no_background=true.

import { generatePixellab, type PixellabSize } from "../apis/pixellab";
import { createAssetPhase, type BasePlanItem } from "../assetPhase";
import { VFX_ITEM_PROMPT } from "@/prompts/vfx_item";

export interface VfxItem extends BasePlanItem {
  kind:
    | "consumable"
    | "weapon"
    | "armor"
    | "key_item"
    | "vfx_particle"
    | "vfx_burst";
  size: 16 | 32 | 64;
  prompt: string;
}

export const vfxItemsPhase = createAssetPhase<VfxItem>({
  phaseId: "vfx-items",
  planFilename: "vfx_items_plan.json",
  systemPrompt: VFX_ITEM_PROMPT,
  requiredPhases: [6, 9],
  // Loot catalog (17), Crafting (20) e Bestiary (16, para drops) definem o
  // universo concreto de itens/VFX que o planner precisa enumerar.
  corpusPhases: [6, 8, 9, 12, 16, 17, 20],
  normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
    if (!name || !prompt) return null;
    const kindRaw = typeof r.kind === "string" ? r.kind : "consumable";
    const kind = (
      [
        "consumable",
        "weapon",
        "armor",
        "key_item",
        "vfx_particle",
        "vfx_burst",
      ].includes(kindRaw)
        ? kindRaw
        : "consumable"
    ) as VfxItem["kind"];
    const size =
      r.size === 16 || r.size === 32 || r.size === 64 ? (r.size as VfxItem["size"]) : 32;
    const rationale = typeof r.rationale === "string" ? r.rationale : "";
    const sourcePhase = typeof r.sourcePhase === "number" ? r.sourcePhase : 8;
    return { name, kind, size, prompt, rationale, sourcePhase };
  },
  async runOne(item, ctx) {
    const renderSize: PixellabSize = item.size < 64 ? 64 : (item.size as PixellabSize);
    const res = await generatePixellab({
      projectId: ctx.projectId,
      prompt: item.prompt,
      size: renderSize,
      assetType: "sprite",
      shading: "basic shading",
      detail: "highly detailed",
      outline: "single color black outline",
      noBackground: true,
    });
    return {
      asset: res.asset,
      kbMetadata: { kind: item.kind, target_size: item.size },
    };
  },
  defaultConcurrency: 3,
});
