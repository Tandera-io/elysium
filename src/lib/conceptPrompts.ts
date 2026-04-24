// Templates determinísticos de prompt por categoria para F0 Concept Pipeline v2.
// Cada template consome campos estruturados do CanonEntry — zero LLM.

import type { CanonEntry } from "./canon";
import type { AssetJobCategory, AssetJobTier } from "@/types/domain";

export type OpenAiImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export interface PromptTemplateResult {
  prompt: string;
  size: OpenAiImageSize;
}

const STYLE_SUFFIX =
  "Style: painterly, AAA video game concept art, cinematic lighting, highly detailed. Neutral background with subtle environmental hint.";

function joinTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return "";
  return tags.slice(0, 5).join(", ");
}

function actLabel(act?: 1 | 2 | 3): string {
  if (!act) return "";
  return `Act ${act === 1 ? "I" : act === 2 ? "II" : "III"}`;
}

function trimDesc(desc?: string, max = 400): string {
  if (!desc) return "";
  const cleaned = desc.replace(/\s+/g, " ").trim();
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max - 1).trimEnd() + "…";
}

function metaString(e: CanonEntry, key: string): string | undefined {
  const v = e.metadata?.[key];
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}

// ---------- Templates por categoria ----------

const TEMPLATES: Record<
  AssetJobCategory,
  (e: CanonEntry) => PromptTemplateResult
> = {
  character: (e) => ({
    prompt: [
      `Concept art illustration of ${e.name}, a main character.`,
      trimDesc(e.description),
      "Full body, three-quarter view, expressive face, detailed costume reflecting background and role.",
      joinTags(e.tags) ? `Context tags: ${joinTags(e.tags)}.` : "",
      actLabel(e.act),
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1536",
  }),

  npc: (e) => ({
    prompt: [
      `Concept art portrait of ${e.name}, a named NPC.`,
      trimDesc(e.description),
      "Medium shot, three-quarter view, readable silhouette, costume and props that signal their role.",
      joinTags(e.tags) ? `Tags: ${joinTags(e.tags)}.` : "",
      actLabel(e.act),
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  boss: (e) => ({
    prompt: [
      `Dramatic concept art of ${e.name}, a boss encounter.`,
      trimDesc(e.description),
      "Imposing full-body pose, dynamic action stance, threat silhouette, strong backlight.",
      joinTags(e.tags) ? `Themes: ${joinTags(e.tags)}.` : "",
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1536x1024",
  }),

  enemy: (e) => ({
    prompt: [
      `Concept art of ${e.name}, a hostile enemy creature.`,
      trimDesc(e.description, 280),
      "Combat-ready pose, clear readable silhouette from a three-quarter angle.",
      joinTags(e.tags) ? `Traits: ${joinTags(e.tags)}.` : "",
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  creature: (e) => ({
    prompt: [
      `Concept art of ${e.name}, a creature of the world.`,
      trimDesc(e.description, 280),
      "Behavioral pose suggesting its natural habitat. Anatomically coherent, readable silhouette.",
      joinTags(e.tags) ? `Habitat/traits: ${joinTags(e.tags)}.` : "",
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  location: (e) => ({
    prompt: [
      `Environment concept art of ${e.name}, a key location.`,
      trimDesc(e.description, 350),
      "Wide establishing shot, strong sense of place, atmospheric depth, time-of-day hint.",
      joinTags(e.tags) ? `Mood/elements: ${joinTags(e.tags)}.` : "",
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1536x1024",
  }),

  biome: (e) => ({
    prompt: [
      `Landscape concept art of ${e.name}, a distinctive biome.`,
      trimDesc(e.description, 350),
      "Wide panoramic view, characteristic flora/fauna hints, natural lighting.",
      joinTags(e.tags) ? `Features: ${joinTags(e.tags)}.` : "",
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1536x1024",
  }),

  poi: (e) => ({
    prompt: [
      `Concept art of ${e.name}, a point of interest in the world.`,
      trimDesc(e.description, 300),
      "Establishing composition, clear focal landmark, readable silhouette against environment.",
      joinTags(e.tags) ? `Tags: ${joinTags(e.tags)}.` : "",
      STYLE_SUFFIX,
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  faction: (e) => ({
    prompt: [
      `Heraldic emblem / insignia concept art for ${e.name}, a faction.`,
      trimDesc(e.description, 250),
      "Centered symmetrical composition, clean vector-style readability, distinctive symbolic elements.",
      joinTags(e.tags) ? `Symbolism: ${joinTags(e.tags)}.` : "",
      "Flat graphic style with subtle material texture. Solid background.",
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  weapon: (e) => ({
    prompt: [
      `Isolated concept art of ${e.name}, a weapon.`,
      trimDesc(e.description, 220),
      metaString(e, "damage_type") ? `Type: ${metaString(e, "damage_type")}.` : "",
      "Single object centered on neutral studio background, three-quarter view, sharp details, subtle material highlights.",
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  armor: (e) => ({
    prompt: [
      `Isolated concept art of ${e.name}, a piece of armor.`,
      trimDesc(e.description, 220),
      "Front view on mannequin or floating display, clean neutral background, material and craftsmanship details visible.",
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  item: (e) => ({
    prompt: [
      `Isolated concept art of ${e.name}, a game item.`,
      trimDesc(e.description, 220),
      "Centered on neutral studio background, three-quarter view, readable silhouette, minor highlights.",
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  consumable: (e) => ({
    prompt: [
      `Isolated concept art of ${e.name}, a consumable item.`,
      trimDesc(e.description, 200),
      "Object centered on clean background, slight glow or effect hinting at function.",
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),

  material: (e) => ({
    prompt: [
      `Isolated concept art of ${e.name}, a crafting material.`,
      trimDesc(e.description, 180),
      "Raw resource presented on neutral background, tactile material quality, clear silhouette.",
    ]
      .filter(Boolean)
      .join(" "),
    size: "1024x1024",
  }),
};

// ---------- Tier map ----------

interface TierMapEntry {
  tier: AssetJobTier | "skip";
  category: AssetJobCategory;
}

export const KIND_TIER: Record<string, TierMapEntry> = {
  character: { tier: "high", category: "character" },
  npc: { tier: "high", category: "npc" },
  boss: { tier: "high", category: "boss" },
  faction: { tier: "high", category: "faction" },
  location: { tier: "high", category: "location" },
  biome: { tier: "high", category: "biome" },
  enemy: { tier: "medium", category: "enemy" },
  creature: { tier: "medium", category: "creature" },
  poi: { tier: "medium", category: "poi" },
  weapon: { tier: "low", category: "weapon" },
  armor: { tier: "low", category: "armor" },
  item: { tier: "low", category: "item" },
  consumable: { tier: "low", category: "consumable" },
  material: { tier: "low", category: "material" },
  // kinds sem arte
  lore: { tier: "skip", category: "item" },
  quest: { tier: "skip", category: "item" },
  dialogue: { tier: "skip", category: "item" },
  recipe: { tier: "skip", category: "item" },
};

// ---------- API pública ----------

export function buildPromptForEntry(
  entry: CanonEntry
): { category: AssetJobCategory; tier: AssetJobTier; prompt: string; size: PromptTemplateResult["size"] } | null {
  const tierInfo = KIND_TIER[entry.kind];
  if (!tierInfo || tierInfo.tier === "skip") return null;
  const tmpl = TEMPLATES[tierInfo.category];
  if (!tmpl) return null;
  const { prompt, size } = tmpl(entry);
  return {
    category: tierInfo.category,
    tier: tierInfo.tier,
    prompt,
    size,
  };
}

// Custo estimado por tier (USD, aproximado para gpt-image-1.5 em 04/2026)
export const TIER_COST_USD: Record<AssetJobTier, number> = {
  high: 0.19,
  medium: 0.07,
  low: 0.02,
};
