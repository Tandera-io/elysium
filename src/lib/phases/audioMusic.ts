// F6 — Audio Music via ElevenLabs /music, tracks 15-60s loopáveis.

import { generateElevenLabs } from "../apis/elevenlabs";
import { createAssetPhase, type BasePlanItem } from "../assetPhase";
import { AUDIO_MUSIC_PROMPT } from "@/prompts/audio_music";

export interface AudioMusicItem extends BasePlanItem {
  context:
    | "main_theme"
    | "biome_loop"
    | "boss_fight"
    | "combat"
    | "menu"
    | "cutscene"
    | "victory"
    | "defeat"
    | "ambient";
  prompt: string;
  durationSeconds: number;
  biome?: string;
}

export const audioMusicPhase = createAssetPhase<AudioMusicItem>({
  phaseId: "audio-music",
  planFilename: "audio_music_plan.json",
  systemPrompt: AUDIO_MUSIC_PROMPT,
  requiredPhases: [11],
  // Worldbuilding (14) traz sub-regiões com mood próprio → temas musicais
  // específicos. Bestiary (16) traz bosses que precisam de boss-theme.
  // Quests (18) traz cutscenes que precisam de stingers.
  corpusPhases: [5, 7, 8, 11, 12, 14, 16, 18],
  normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
    if (!name || !prompt) return null;
    const cxRaw = typeof r.context === "string" ? r.context : "biome_loop";
    const context = (
      [
        "main_theme",
        "biome_loop",
        "boss_fight",
        "combat",
        "menu",
        "cutscene",
        "victory",
        "defeat",
        "ambient",
      ].includes(cxRaw)
        ? cxRaw
        : "biome_loop"
    ) as AudioMusicItem["context"];
    let durationSeconds =
      typeof r.durationSeconds === "number" ? r.durationSeconds : 30;
    durationSeconds = Math.min(60, Math.max(15, durationSeconds));
    const biome = typeof r.biome === "string" ? r.biome : undefined;
    const rationale = typeof r.rationale === "string" ? r.rationale : "";
    const sourcePhase = typeof r.sourcePhase === "number" ? r.sourcePhase : 11;
    return {
      name,
      context,
      prompt,
      durationSeconds,
      biome,
      rationale,
      sourcePhase,
    };
  },
  async runOne(item, ctx) {
    const res = await generateElevenLabs({
      projectId: ctx.projectId,
      prompt: item.prompt,
      kind: "music",
      durationSeconds: item.durationSeconds,
    });
    return {
      asset: res.asset,
      kbMetadata: {
        context: item.context,
        biome: item.biome,
        duration: item.durationSeconds,
      },
    };
  },
  defaultConcurrency: 1, // música demora; serial é ok
});
