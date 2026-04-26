// Templates determinísticos de sprite (F1 Character Sprites v2).
// Para cada canon entry elegível, monta:
//   - portrait prompt (base para animações via /animate-with-skeleton)
//   - lista de animações (action × direction × frames)
//   - custom actions (prompts individuais via /generate-image-pixflux)
//   - size e tier (custo/prioridade Pixellab)
//
// Zero Claude na fase de planejamento — é pura tradução canon → jobs.

import type { CanonEntry, CanonKind } from "./canon";
import type { SkeletonAction } from "./apis/pixellab";
import type { AssetJobCategory, AssetJobTier } from "@/types/domain";

export type SpriteSize = 64 | 96 | 128;
export type Direction = "north" | "south" | "east" | "west";
export type SpriteRole = "player" | "enemy" | "boss" | "npc" | "mount" | "creature";

export interface AnimationSpec {
  action: SkeletonAction;
  direction: Direction;
  frames: 4 | 6 | 8;
  priority: number;
}

export interface CustomActionSpec {
  action: string; // slug curto (attack, cast, bite, ...)
  description: string; // prompt livre
}

export interface SpritePromptResult {
  role: SpriteRole;
  category: AssetJobCategory;
  tier: AssetJobTier;
  size: SpriteSize;
  portraitPrompt: string;
  animations: AnimationSpec[];
  customActions: CustomActionSpec[];
}

// ---------- Kind → role + tier ----------

interface KindMapEntry {
  role: SpriteRole;
  category: AssetJobCategory;
  tier: AssetJobTier;
  size: SpriteSize;
}

export const KIND_ROLE_MAP: Record<string, KindMapEntry | null> = {
  character: { role: "player", category: "character", tier: "high", size: 96 },
  npc: { role: "npc", category: "npc", tier: "medium", size: 64 },
  boss: { role: "boss", category: "boss", tier: "high", size: 128 },
  enemy: { role: "enemy", category: "enemy", tier: "medium", size: 64 },
  creature: { role: "creature", category: "creature", tier: "medium", size: 64 },
  // Kinds sem sprite de personagem: ignorados
  lore: null,
  quest: null,
  dialogue: null,
  recipe: null,
  location: null,
  biome: null,
  poi: null,
  faction: null,
  weapon: null,
  armor: null,
  item: null,
  consumable: null,
  material: null,
};

// ---------- Animações por role ----------

/**
 * Para cada role, define o set mínimo de animações necessárias para o
 * personagem funcionar em gameplay (locomoção + reação + ação).
 *
 * Seleção conservadora — prioriza cobertura direcional (4 dir) para player,
 * e subsets simplificados para NPCs/enemies/creatures/bosses.
 */
function animationsForRole(role: SpriteRole): AnimationSpec[] {
  const DIRS: Direction[] = ["south", "north", "east", "west"];

  if (role === "player") {
    // Protagonista: movimento completo 4-dir + ataque + dodge + morte
    return [
      ...DIRS.map((d) => mk("idle", d, 4, 1)),
      ...DIRS.map((d) => mk("walk", d, 8, 1)),
      mk("run", "south", 8, 2),
      mk("attack", "south", 6, 2),
      mk("hurt", "south", 4, 2),
      mk("death", "south", 6, 2),
    ];
  }

  if (role === "boss") {
    // Bosses: idle imponente + combate + sofrimento
    return [
      mk("idle", "south", 4, 1),
      mk("attack", "south", 8, 1),
      mk("hurt", "south", 4, 2),
      mk("death", "south", 8, 2),
    ];
  }

  if (role === "npc") {
    // NPCs civis: apenas idle (conversam parados) + caminhada 2-dir
    return [
      mk("idle", "south", 4, 1),
      mk("walk", "south", 4, 1),
      mk("walk", "east", 4, 2),
    ];
  }

  if (role === "enemy") {
    // Inimigos comuns: locomoção 2-dir + combate
    return [
      mk("idle", "south", 4, 1),
      mk("walk", "south", 6, 1),
      mk("walk", "east", 6, 2),
      mk("attack", "south", 4, 1),
      mk("hurt", "south", 4, 2),
      mk("death", "south", 4, 2),
    ];
  }

  if (role === "creature") {
    // Fauna: idle + caminhada simples + morte (sem ataque explícito)
    return [
      mk("idle", "south", 4, 1),
      mk("walk", "south", 6, 1),
      mk("walk", "east", 6, 2),
      mk("hurt", "south", 4, 2),
      mk("death", "south", 4, 2),
    ];
  }

  if (role === "mount") {
    // Montaria: idle + andar + correr em 4 direções
    return [
      mk("idle", "south", 4, 1),
      ...DIRS.map((d) => mk("walk", d, 6, 1)),
      ...DIRS.map((d) => mk("run", d, 8, 2)),
    ];
  }

  // Fallback
  return [mk("idle", "south", 4, 1), mk("walk", "south", 4, 1)];
}

function mk(
  action: SkeletonAction,
  direction: Direction,
  frames: AnimationSpec["frames"],
  priority: number
): AnimationSpec {
  return { action, direction, frames, priority };
}

// ---------- Custom actions por role ----------

function customActionsForRole(role: SpriteRole, entry: CanonEntry): CustomActionSpec[] {
  // Só player tem ações customizadas ricas por padrão — bosses ficam por
  // conta do ataque base (que já é mais complexo).
  if (role === "player") {
    return [
      {
        action: "special",
        description: `${entry.name} executing a signature special move, dynamic pose, magical/energy effect around body, same pixel art style as portrait`,
      },
    ];
  }
  if (role === "boss") {
    return [
      {
        action: "special",
        description: `${entry.name} unleashing a devastating special attack, full-body pose with impact effects, same pixel art style as portrait`,
      },
    ];
  }
  return [];
}

// ---------- Portrait prompt (base) ----------

function joinTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return "";
  return tags.slice(0, 4).join(", ");
}

function trimDesc(desc?: string, max = 220): string {
  if (!desc) return "";
  const c = desc.replace(/\s+/g, " ").trim();
  return c.length <= max ? c : c.slice(0, max - 1).trimEnd() + "…";
}

function portraitPrompt(entry: CanonEntry, role: SpriteRole, size: SpriteSize): string {
  const baseStyle = `pixel art ${size}x${size}`;
  const poseByRole: Record<SpriteRole, string> = {
    player: "heroic stance, clear silhouette, front-facing pose",
    boss: "imposing full-body stance, dramatic silhouette",
    enemy: "aggressive ready stance, clear silhouette",
    creature: "natural habitat pose showing anatomy",
    npc: "neutral standing pose, readable role attire",
    mount: "side profile showing full body, with or without saddle",
  };
  const pose = poseByRole[role] ?? poseByRole.npc;

  return [
    `${baseStyle} ${pose} of ${entry.name}.`,
    trimDesc(entry.description),
    joinTags(entry.tags) ? `Traits: ${joinTags(entry.tags)}.` : "",
    "Crisp outlines, same palette as style reference, high contrast, transparent background.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ---------- API pública ----------

export function buildSpritePromptForEntry(
  entry: CanonEntry
): SpritePromptResult | null {
  const mapping = KIND_ROLE_MAP[entry.kind];
  if (!mapping) return null;

  const { role, category, tier, size } = mapping;

  return {
    role,
    category,
    tier,
    size,
    portraitPrompt: portraitPrompt(entry, role, size),
    animations: animationsForRole(role),
    customActions: customActionsForRole(role, entry),
  };
}

/** Quantos calls Pixellab 1 item consome (portrait + N anims + N customs). */
export function callCountFor(result: SpritePromptResult): number {
  return 1 + result.animations.length + result.customActions.length;
}

// Custo aproximado Pixellab por call (USD). Pixellab não publica preço
// exato — estimamos em ~$0.003/call.
export const PIXELLAB_COST_PER_CALL_USD = 0.003;
