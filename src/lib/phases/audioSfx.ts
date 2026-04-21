// F5 — Audio SFX curtos via ElevenLabs /sound-generation.

import { generateElevenLabs } from "../apis/elevenlabs";
import { createAssetPhase, type BasePlanItem } from "../assetPhase";
import { AUDIO_SFX_PROMPT } from "@/prompts/audio_sfx";

export interface AudioSfxItem extends BasePlanItem {
  category:
    | "combat"
    | "ui"
    | "ambient"
    | "footsteps"
    | "magic"
    | "pickup"
    | "death"
    | "notification";
  prompt: string;
  durationSeconds: number;
}

export const audioSfxPhase = createAssetPhase<AudioSfxItem>({
  phaseId: "audio-sfx",
  planFilename: "audio_sfx_plan.json",
  systemPrompt: AUDIO_SFX_PROMPT,
  requiredPhases: [11],
  // Bestiary (16) fornece sons de criaturas/bosses; Exploration (21)
  // fornece ambiências e eventos; Crafting (20) fornece foleys de
  // smithing/alchemy; Worldbuilding (14) define ambient beds por bioma.
  corpusPhases: [6, 7, 11, 12, 14, 16, 20, 21],
  normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
    if (!name || !prompt) return null;
    const catRaw = typeof r.category === "string" ? r.category : "combat";
    const category = (
      [
        "combat",
        "ui",
        "ambient",
        "footsteps",
        "magic",
        "pickup",
        "death",
        "notification",
      ].includes(catRaw)
        ? catRaw
        : "combat"
    ) as AudioSfxItem["category"];
    let durationSeconds =
      typeof r.durationSeconds === "number" ? r.durationSeconds : 1.5;
    durationSeconds = Math.min(3, Math.max(0.3, durationSeconds));
    const rationale = typeof r.rationale === "string" ? r.rationale : "";
    const sourcePhase = typeof r.sourcePhase === "number" ? r.sourcePhase : 11;
    return { name, category, prompt, durationSeconds, rationale, sourcePhase };
  },
  async runOne(item, ctx) {
    const res = await generateElevenLabs({
      projectId: ctx.projectId,
      prompt: item.prompt,
      kind: "sfx",
      durationSeconds: item.durationSeconds,
    });
    return {
      asset: res.asset,
      kbMetadata: { category: item.category, duration: item.durationSeconds },
    };
  },
  defaultConcurrency: 2,
});
