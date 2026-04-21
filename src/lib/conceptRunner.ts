// Orquestrador de geração em lote dos concept arts planejados.
//
// Reaproveita generatePixellab (Pixellab client) e ingestAsset (KB) sem
// duplicar infra. Emite atualizações item-a-item para que a UI mostre o
// progresso ao vivo, e dispara "kb-updated" após cada ingest para que o
// Grafo Semântico recarregue sozinho.

import { generatePixellab } from "./apis/pixellab";
import { assetsRepo } from "./db";
import { ingestAsset } from "./kb";
import type { ConceptArtPlanItem } from "./conceptPlanner";
import type { GeneratedAsset } from "@/types/domain";

export type ItemStatus = "pending" | "running" | "success" | "error";

export interface RunItemState {
  plan: ConceptArtPlanItem;
  status: ItemStatus;
  attempt: number;
  asset?: GeneratedAsset;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface RunConceptBatchOptions {
  projectId: string;
  items: ConceptArtPlanItem[];
  concurrency?: number;
  autoApprove?: boolean;
  onItemUpdate: (state: RunItemState) => void;
  signal?: AbortSignal;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500];

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("abort"));
    });
  });
}

function emitKbUpdated(projectId: string) {
  try {
    window.dispatchEvent(
      new CustomEvent("kb-updated", { detail: { projectId } })
    );
  } catch {
    // ambientes sem window (tests) — ignora
  }
}

async function processOne(
  state: RunItemState,
  opts: RunConceptBatchOptions
): Promise<void> {
  const autoApprove = opts.autoApprove ?? true;

  while (state.attempt < MAX_ATTEMPTS) {
    if (opts.signal?.aborted) {
      state.status = "error";
      state.error = "cancelado";
      state.finishedAt = Date.now();
      opts.onItemUpdate({ ...state });
      return;
    }

    state.attempt += 1;
    state.status = "running";
    state.startedAt = state.startedAt ?? Date.now();
    opts.onItemUpdate({ ...state });

    try {
      const res = await generatePixellab({
        projectId: opts.projectId,
        prompt: state.plan.prompt,
        size: state.plan.size,
        assetType: "concept_art",
        outline: state.plan.outline,
        shading: state.plan.shading,
        detail: state.plan.detail,
        // force=true: cada item do plano é intencionalmente único.
        // Sem force o Pixellab retorna cache quando o prompt bate, o que
        // seria estranho se o usuário re-disparar o mesmo plano.
        force: false,
      });

      state.asset = res.asset;

      if (autoApprove) {
        try {
          await assetsRepo.setStatus(res.asset.id, "approved");
          await ingestAsset({
            projectId: opts.projectId,
            assetId: res.asset.id,
            assetPath: res.asset.file_path,
            assetType: "concept_art",
            prompt: state.plan.prompt,
            phaseNumber: state.plan.sourcePhase,
            metadata: {
              category: state.plan.category,
              rationale: state.plan.rationale,
              plan_item_id: state.plan.id,
              name: state.plan.name,
              size: state.plan.size,
            },
          });
          emitKbUpdated(opts.projectId);
        } catch (e) {
          console.warn("[conceptRunner] falha ao auto-aprovar/ingerir:", e);
        }
      }

      state.status = "success";
      state.error = undefined;
      state.finishedAt = Date.now();
      opts.onItemUpdate({ ...state });
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      state.error = msg;
      if (state.attempt >= MAX_ATTEMPTS) {
        state.status = "error";
        state.finishedAt = Date.now();
        opts.onItemUpdate({ ...state });
        return;
      }
      const backoff = BACKOFF_MS[state.attempt - 1] ?? 2000;
      try {
        await sleep(backoff, opts.signal);
      } catch {
        state.status = "error";
        state.error = "cancelado";
        state.finishedAt = Date.now();
        opts.onItemUpdate({ ...state });
        return;
      }
    }
  }
}

export async function runConceptBatch(
  opts: RunConceptBatchOptions
): Promise<RunItemState[]> {
  const states: RunItemState[] = opts.items.map((plan) => ({
    plan,
    status: "pending",
    attempt: 0,
  }));

  // Emite estado inicial para a UI pintar tudo como pending.
  for (const s of states) opts.onItemUpdate({ ...s });

  const concurrency = Math.max(1, Math.min(4, opts.concurrency ?? 2));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      if (opts.signal?.aborted) return;
      const idx = cursor++;
      if (idx >= states.length) return;
      await processOne(states[idx], opts);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return states;
}
