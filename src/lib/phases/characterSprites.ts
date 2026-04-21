// F1 — Character Sprites (híbrido Pixellab /animate-with-skeleton + frames).
//
// Para cada personagem:
//   1) Gera portrait 64x64 via /generate-image-pixflux (usa styleRef).
//   2) Para locomoção (idle, walk): chama /animate-with-skeleton passando o
//      portrait como reference_image → recebe PNG horizontal com N frames.
//   3) Para custom actions (attack, spells): gera frames individuais via
//      /generate-image-pixflux com prompts "attack frame i/N, same style".
//
// O spritesheet horizontal gerado em (2) é pós-processado pelo
// asepritePacker (F7) que fatiará em frames individuais.

import { invoke } from "@tauri-apps/api/core";
import { readBinaryAssetBase64 } from "../tauriFs";
import {
  animateWithSkeleton,
  generatePixellab,
  type SkeletonAction,
} from "../apis/pixellab";
import { createAssetPhase, type BasePlanItem } from "../assetPhase";
import { CHARACTER_SPRITE_PROMPT } from "@/prompts/character_sprite";
import type { GeneratedAsset } from "@/types/domain";

export interface AnimationSpec {
  action: SkeletonAction;
  direction: "north" | "south" | "east" | "west";
  frames: 4 | 6 | 8;
  priority: number;
}

export interface CustomActionSpec {
  action: string;
  description: string;
}

export interface CharacterSpriteItem extends BasePlanItem {
  role: "player" | "enemy" | "boss" | "npc" | "mount";
  size: 64 | 96 | 128;
  animations: AnimationSpec[];
  portraitPrompt: string;
  customActions: CustomActionSpec[];
}

async function runOneCharacter(
  item: CharacterSpriteItem,
  projectId: string
): Promise<{ asset: GeneratedAsset; extraAssetIds: string[] }> {
  const slug = item.name.replace(/\s+/g, "_").toLowerCase();
  // Passo 1: portrait como base.
  const portrait = await generatePixellab({
    projectId,
    prompt: item.portraitPrompt,
    size: item.size,
    assetType: "sprite",
    shading: "basic shading",
    detail: "highly detailed",
    outline: "single color black outline",
    noBackground: true,
    extraMetadata: {
      character_name: slug,
      character_display_name: item.name,
      character_role: item.role,
      frame_role: "portrait",
    },
  });

  // Lê o portrait como base64 para passar como reference_image.
  // file_path é absoluto; converte em relativo ao projeto.
  const rel = deriveRelativePath(portrait.asset.file_path, projectId);
  let portraitBase64 = "";
  if (rel) {
    try {
      portraitBase64 = await readBinaryAssetBase64(projectId, rel);
    } catch {
      portraitBase64 = "";
    }
  }

  const extraAssetIds: string[] = [];

  // Passo 2: animações de locomoção via skeleton.
  if (portraitBase64) {
    for (const anim of item.animations.filter((a) =>
      ["idle", "walk", "run"].includes(a.action)
    )) {
      try {
        const r = await animateWithSkeleton({
          projectId,
          referenceBase64: portraitBase64,
          action: anim.action,
          direction: anim.direction,
          nFrames: anim.frames,
          size: item.size,
          description: item.portraitPrompt,
          characterName: slug,
          extraMetadata: {
            character_display_name: item.name,
            character_role: item.role,
          },
        });
        extraAssetIds.push(r.asset.id);
      } catch (e) {
        console.warn(
          `[characterSprites] animate falhou p/ ${item.name}/${anim.action}:`,
          e
        );
      }
    }
  }

  // Passo 3: custom actions via frames individuais.
  for (const custom of item.customActions.slice(0, 4)) {
    try {
      const r = await generatePixellab({
        projectId,
        prompt: `${custom.description}, same style as character portrait, ${item.size}x${item.size} pixel art`,
        size: item.size,
        assetType: "sprite",
        shading: "basic shading",
        detail: "highly detailed",
        outline: "single color black outline",
        noBackground: true,
        extraMetadata: {
          character_name: slug,
          character_display_name: item.name,
          character_role: item.role,
          frame_role: "custom_action",
          custom_action: custom.action,
        },
      });
      extraAssetIds.push(r.asset.id);
    } catch (e) {
      console.warn(
        `[characterSprites] custom action falhou p/ ${item.name}/${custom.action}:`,
        e
      );
    }
  }

  return { asset: portrait.asset, extraAssetIds };
}

function deriveRelativePath(
  filePath: string,
  projectId: string
): string | null {
  const marker = `projects\\${projectId}\\`;
  const markerUnix = `projects/${projectId}/`;
  const idx = filePath.lastIndexOf(marker);
  if (idx >= 0) return filePath.slice(idx + marker.length).replace(/\\/g, "/");
  const idxUnix = filePath.lastIndexOf(markerUnix);
  if (idxUnix >= 0) return filePath.slice(idxUnix + markerUnix.length);
  return null;
}

export const characterSpritePhase = createAssetPhase<CharacterSpriteItem>({
  phaseId: "character-sprites",
  planFilename: "character_sprite_plan.json",
  systemPrompt: CHARACTER_SPRITE_PROMPT,
  requiredPhases: [6, 9],
  // Inclui Expansão Narrativa: NPC roster (15), Bestiário (16), Quests
  // detalhadas (18). Sem isso, o planner enxerga só 5-6 personagens da
  // Etapa 6 e ignora as dezenas criadas pelos specialist writers.
  corpusPhases: [5, 6, 9, 12, 14, 15, 16, 18],
  normalizeItem(raw, _ctx) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) return null;
    const role = (
      typeof r.role === "string" && ["player", "enemy", "boss", "npc", "mount"].includes(r.role)
        ? r.role
        : "npc"
    ) as CharacterSpriteItem["role"];
    const size =
      r.size === 64 || r.size === 96 || r.size === 128 ? (r.size as 64 | 96 | 128) : 64;
    const portraitPrompt =
      typeof r.portraitPrompt === "string" && r.portraitPrompt.trim()
        ? r.portraitPrompt.trim()
        : `pixel art ${size}x${size} ${name}, side view, crisp outlines, same palette as style reference`;
    const animRaw = Array.isArray(r.animations) ? r.animations : [];
    const animations: AnimationSpec[] = animRaw
      .map((a: any) => {
        const action = (
          typeof a?.action === "string" ? a.action : "idle"
        ) as SkeletonAction;
        const direction = (
          typeof a?.direction === "string" ? a.direction : "south"
        ) as AnimationSpec["direction"];
        const frames =
          a?.frames === 4 || a?.frames === 6 || a?.frames === 8
            ? (a.frames as AnimationSpec["frames"])
            : 4;
        const priority = typeof a?.priority === "number" ? a.priority : 1;
        return { action, direction, frames, priority };
      })
      .filter((a: AnimationSpec) =>
        ["idle", "walk", "run", "jump", "attack", "hurt", "death"].includes(a.action)
      );
    if (animations.length === 0) {
      animations.push({ action: "idle", direction: "south", frames: 4, priority: 1 });
      animations.push({ action: "walk", direction: "south", frames: 8, priority: 1 });
    }
    const customRaw = Array.isArray(r.customActions) ? r.customActions : [];
    const customActions: CustomActionSpec[] = customRaw
      .map((c: any) => ({
        action: typeof c?.action === "string" ? c.action : "custom",
        description: typeof c?.description === "string" ? c.description : "",
      }))
      .filter((c: CustomActionSpec) => !!c.description);
    const rationale = typeof r.rationale === "string" ? r.rationale : "";
    const sourcePhase = typeof r.sourcePhase === "number" ? r.sourcePhase : 6;
    return {
      name,
      role,
      size,
      animations,
      portraitPrompt,
      customActions,
      rationale,
      sourcePhase,
    };
  },
  async runOne(item, ctx) {
    const { asset, extraAssetIds } = await runOneCharacter(item, ctx.projectId);
    return {
      asset,
      kbMetadata: {
        role: item.role,
        size: item.size,
        animations: item.animations.map((a) => `${a.action}/${a.direction}/${a.frames}f`),
        related_asset_ids: extraAssetIds,
      },
    };
  },
  defaultConcurrency: 1, // sprites dependem sequencialmente do portrait
});

// Fallback helper para UI checar path binary.
export async function readBinaryOrEmpty(
  projectId: string,
  relative: string
): Promise<string> {
  try {
    return await invoke<string>("read_binary_asset", {
      projectId,
      relative,
    });
  } catch {
    return "";
  }
}
