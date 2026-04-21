// F3 — UI / HUD / Ícones. Cada item vira um ícone/elemento com fundo
// transparente (no_background=true), em tamanhos 16/32/64/128.

import { generatePixellab, type PixellabSize } from "../apis/pixellab";
import { createAssetPhase, type BasePlanItem } from "../assetPhase";
import { UI_ICON_PROMPT } from "@/prompts/ui_icon";

export interface UiHudItem extends BasePlanItem {
  group:
    | "hud"
    | "skill_icon"
    | "menu"
    | "button"
    | "inventory"
    | "cursor"
    | "frame";
  size: 16 | 32 | 64 | 128;
  prompt: string;
}

export const uiHudPhase = createAssetPhase<UiHudItem>({
  phaseId: "ui-hud",
  planFilename: "ui_hud_plan.json",
  systemPrompt: UI_ICON_PROMPT,
  requiredPhases: [8, 9],
  // Dialogues (19) informam ícones de HUD; Loot (17) informa icons de
  // inventário no HUD.
  corpusPhases: [6, 8, 9, 12, 17, 19],
  normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
    if (!name || !prompt) return null;
    const groupRaw = typeof r.group === "string" ? r.group : "hud";
    const group = (
      ["hud", "skill_icon", "menu", "button", "inventory", "cursor", "frame"].includes(
        groupRaw
      )
        ? groupRaw
        : "hud"
    ) as UiHudItem["group"];
    const size =
      r.size === 16 || r.size === 32 || r.size === 64 || r.size === 128
        ? (r.size as UiHudItem["size"])
        : 32;
    const rationale = typeof r.rationale === "string" ? r.rationale : "";
    const sourcePhase = typeof r.sourcePhase === "number" ? r.sourcePhase : 8;
    return { name, group, size, prompt, rationale, sourcePhase };
  },
  async runOne(item, ctx) {
    // Pixellab min é 64, então tamanhos menores são gerados a 64 e
    // downscalados no empacotamento. Passamos o size real em kbMetadata.
    const renderSize: PixellabSize = item.size < 64 ? 64 : (item.size as PixellabSize);
    const res = await generatePixellab({
      projectId: ctx.projectId,
      prompt: item.prompt,
      size: renderSize,
      assetType: "sprite",
      shading: "flat shading",
      detail: "highly detailed",
      outline: "single color black outline",
      noBackground: true,
    });
    return {
      asset: res.asset,
      kbMetadata: { group: item.group, target_size: item.size },
    };
  },
  defaultConcurrency: 3,
});
