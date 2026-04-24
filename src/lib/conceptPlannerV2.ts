// F0 Concept Pipeline v2 — planner determinístico (zero LLM).
// Lê canon.json do projeto e produz 1 item por entry aplicável, com prompt
// montado via templates em conceptPrompts.ts.

import { invoke } from "@tauri-apps/api/core";
import { loadCanon, type CanonEntry } from "./canon";
import { buildPromptForEntry, KIND_TIER } from "./conceptPrompts";
import { isTauri } from "./utils";
import type { AssetJobCategory, AssetJobTier } from "@/types/domain";

export interface PlanItemV2 {
  canonSlug: string;
  canonEntryId: string;
  kind: string;
  name: string;
  tier: AssetJobTier;
  category: AssetJobCategory;
  prompt: string;
  promptHash: string;
  size: string;
  hasExistingAsset: boolean; // já há concept vinculado no canon
}

export interface BuildPlanResult {
  items: PlanItemV2[];
  skipped: { kind: string; count: number }[];
  totalCanonEntries: number;
}

async function computeHash(prompt: string): Promise<string> {
  if (!isTauri()) {
    // Fallback simples pra dev/web (não usa no runtime real)
    let h = 0;
    for (let i = 0; i < prompt.length; i++) {
      h = (h * 31 + prompt.charCodeAt(i)) | 0;
    }
    return `dev-${(h >>> 0).toString(16)}`;
  }
  return invoke<string>("compute_prompt_hash", {
    prompt,
    generator: "openai",
    kind: "concept_art",
  });
}

export async function buildPlanFromCanon(projectId: string): Promise<BuildPlanResult> {
  const canon = await loadCanon(projectId);
  const items: PlanItemV2[] = [];
  const skipCounts = new Map<string, number>();

  for (const entry of canon.entries) {
    if (entry.status === "retired") continue;
    const built = buildPromptForEntry(entry);
    if (!built) {
      const tierInfo = KIND_TIER[entry.kind];
      const reason = tierInfo?.tier === "skip" ? entry.kind : `unknown:${entry.kind}`;
      skipCounts.set(reason, (skipCounts.get(reason) ?? 0) + 1);
      continue;
    }

    const promptHash = await computeHash(built.prompt);
    items.push({
      canonSlug: entry.slug,
      canonEntryId: entry.id,
      kind: entry.kind,
      name: entry.name,
      tier: built.tier,
      category: built.category,
      prompt: built.prompt,
      promptHash,
      size: built.size,
      hasExistingAsset: (entry.conceptAssetIds?.length ?? 0) > 0,
    });
  }

  const skipped = Array.from(skipCounts.entries()).map(([kind, count]) => ({
    kind,
    count,
  }));

  return {
    items,
    skipped,
    totalCanonEntries: canon.entries.length,
  };
}

// Overrides manuais de prompt (usuário edita no UI). Armazenado em memória
// ou no próprio asset_jobs via prompt field — aqui só tipo helper.
export function overridePrompt(
  item: PlanItemV2,
  newPrompt: string
): PlanItemV2 {
  return { ...item, prompt: newPrompt };
}
