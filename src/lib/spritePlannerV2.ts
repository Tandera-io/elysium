// F1 Character Sprites v2 — planner determinístico (zero LLM).
// Lê canon.json e monta 1 job por canon entry elegível (character/npc/boss/
// enemy/creature). Cada job carrega no `prompt` (JSON stringified) o bundle
// de animações e custom actions que o runner precisa executar para produzir
// portrait + animation frames fatiados.

import { invoke } from "@tauri-apps/api/core";
import { loadCanon, type CanonEntry } from "./canon";
import { buildSpritePromptForEntry, callCountFor, KIND_ROLE_MAP } from "./spritePrompts";
import type { SpritePromptResult } from "./spritePrompts";
import { isTauri } from "./utils";
import type { AssetJobCategory, AssetJobTier } from "@/types/domain";
import type { GenericPlanItem } from "./assetJobs";

export interface SpritePlanItem extends GenericPlanItem {
  role: SpritePromptResult["role"];
  /** Serialização JSON de SpritePromptResult (ida/volta no DB via prompt). */
  bundle: SpritePromptResult;
  canonEntry: CanonEntry;
  hasExistingSpriteAsset: boolean;
}

export interface SpritePlanResult {
  items: SpritePlanItem[];
  skipped: { kind: string; count: number }[];
  totalCanonEntries: number;
  estimatedCalls: number;
  estimatedCostUsd: number;
}

async function computeHash(bundleKey: string): Promise<string> {
  if (!isTauri()) {
    let h = 0;
    for (let i = 0; i < bundleKey.length; i++) h = (h * 31 + bundleKey.charCodeAt(i)) | 0;
    return `dev-${(h >>> 0).toString(16)}`;
  }
  return invoke<string>("compute_prompt_hash", {
    prompt: bundleKey,
    generator: "pixellab",
    kind: "sprite",
  });
}

export async function buildSpritePlanFromCanon(
  projectId: string
): Promise<SpritePlanResult> {
  const canon = await loadCanon(projectId);
  const items: SpritePlanItem[] = [];
  const skipCounts = new Map<string, number>();
  let estimatedCalls = 0;

  for (const entry of canon.entries) {
    if (entry.status === "retired") continue;
    const mapping = KIND_ROLE_MAP[entry.kind];
    if (!mapping) {
      skipCounts.set(entry.kind, (skipCounts.get(entry.kind) ?? 0) + 1);
      continue;
    }

    const bundle = buildSpritePromptForEntry(entry);
    if (!bundle) {
      skipCounts.set(entry.kind, (skipCounts.get(entry.kind) ?? 0) + 1);
      continue;
    }

    // O "prompt" gravado na linha do job é JSON com o bundle completo.
    // Runner faz JSON.parse ao processar — permite editar no UI e refletir
    // no comportamento do worker sem mudanças de schema.
    const promptJson = JSON.stringify(bundle);

    // Hash: identidade estável por (slug, role, size, animações, customs).
    const bundleKey = `sprite|${entry.slug}|${bundle.role}|${bundle.size}|${bundle.animations
      .map((a) => `${a.action}/${a.direction}/${a.frames}`)
      .join(",")}|${bundle.customActions.map((c) => c.action).join(",")}`;
    const promptHash = await computeHash(bundleKey);

    items.push({
      canonSlug: entry.slug,
      canonEntryId: entry.id,
      kind: entry.kind,
      tier: bundle.tier as AssetJobTier,
      category: bundle.category as AssetJobCategory,
      prompt: promptJson,
      promptHash,
      size: String(bundle.size),
      role: bundle.role,
      bundle,
      canonEntry: entry,
      hasExistingSpriteAsset: (entry.spriteAssetIds?.length ?? 0) > 0,
    });

    estimatedCalls += callCountFor(bundle);
  }

  const skipped = Array.from(skipCounts.entries()).map(([kind, count]) => ({
    kind,
    count,
  }));

  // ~$0.003/call Pixellab. Bem abaixo de OpenAI HIGH ($0.19).
  const estimatedCostUsd = estimatedCalls * 0.003;

  return {
    items,
    skipped,
    totalCanonEntries: canon.entries.length,
    estimatedCalls,
    estimatedCostUsd,
  };
}

/**
 * Parser do campo `prompt` do job (quando vem como JSON serializado).
 * Retorna null se o formato não for o esperado — runner decide tratar como
 * erro permanente (skipped) nesse caso.
 */
export function parseSpriteBundle(rawPrompt: string): SpritePromptResult | null {
  try {
    const parsed = JSON.parse(rawPrompt);
    if (
      parsed &&
      typeof parsed.portraitPrompt === "string" &&
      Array.isArray(parsed.animations) &&
      typeof parsed.size === "number"
    ) {
      return parsed as SpritePromptResult;
    }
    return null;
  } catch {
    return null;
  }
}
