// Fábrica genérica de sub-fases de produção de assets.
//
// Todas as 7 sub-fases do pipeline (concept-art, character-sprites, tilesets,
// ui-hud, vfx-items, audio-sfx, audio-music) seguem o mesmo padrão:
//
//   1) Planner: Claude lê o corpus do projeto, retorna JSON { items: [...] }.
//   2) Review: usuário edita/filtra a lista no UI, salva de volta.
//   3) Runner: worker pool dispara `runOne(item)` para cada item incluído,
//      com retry/backoff, emitindo atualizações item-a-item.
//   4) Ingest: resultado aprovado entra no KB e dispara "kb-updated".
//
// Isso elimina ~80% da duplicação entre conceptPlanner/Runner e os 6 novos
// planners/runners.

import { invoke } from "@tauri-apps/api/core";
import { nanoid } from "nanoid";
import { documentsRepo } from "./db";
import { streamClaude } from "./claude";
import { isTauri } from "./utils";
import { phaseLabel } from "@/types/pipeline";
import type { PhaseDocument, GeneratedAsset } from "@/types/domain";

// ---------- Tipos públicos ----------

export interface BasePlanItem {
  id: string;
  name: string;
  included: boolean;
  rationale?: string;
  sourcePhase?: number;
}

export interface AssetPhasePlan<TItem extends BasePlanItem> {
  projectId: string;
  phaseId: string;
  createdAt: string;
  items: TItem[];
  /** Incrementa a cada save. `undefined` em planos legados. */
  version?: number;
  /** ISO timestamp do último save. */
  updatedAt?: string;
}

export type RunStatus = "pending" | "running" | "success" | "error";

export interface RunItemState<TItem extends BasePlanItem> {
  plan: TItem;
  status: RunStatus;
  attempt: number;
  asset?: GeneratedAsset;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface RunOneResult {
  asset: GeneratedAsset;
  /** Metadata extra para o KB ingest (category, rationale, etc). */
  kbMetadata?: Record<string, unknown>;
  /** AssetType efetivo para ingest. Default: asset.asset_type. */
  kbDocumentType?: string;
}

export interface RunContext {
  projectId: string;
  signal?: AbortSignal;
}

export interface AssetPhaseConfig<TItem extends BasePlanItem> {
  /** "concept-art" | "character-sprites" | "tilesets" | ... */
  phaseId: string;
  /** Nome de arquivo de plano dentro de projects/<id>/. */
  planFilename: string;
  /** System prompt completo enviado ao Claude no planner. */
  systemPrompt: string;
  /** User message builder: receberá o corpus construído. */
  buildUserMessage?: (corpus: string) => string;
  /** Phases que DEVEM estar aprovadas para planejar. */
  requiredPhases: number[];
  /** Phases cujo content é concatenado no corpus. Default = requiredPhases. */
  corpusPhases?: number[];
  /** Normalizador de item cru vindo do JSON do Claude. */
  normalizeItem: (raw: any, ctx: { index: number }) => Omit<TItem, "id" | "included"> | null;
  /** Executor de 1 item. Retorna o GeneratedAsset resultante. */
  runOne: (item: TItem, ctx: RunContext) => Promise<RunOneResult>;
  /** Opcional: callback após ingest no KB (use p/ Aseprite post-processing). */
  onItemIngested?: (
    item: TItem,
    asset: GeneratedAsset,
    ctx: RunContext
  ) => Promise<void>;
  /** Concorrência default ao executar o batch. */
  defaultConcurrency?: number;
}

// ---------- Helpers ----------

function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function defaultBuildCorpus(
  docs: PhaseDocument[],
  phases?: number[]
): string {
  const filtered = docs
    .filter((d) => d.status === "approved")
    .filter((d) => (phases ? phases.includes(d.phase_number) : true))
    .sort((a, b) => a.phase_number - b.phase_number);
  if (filtered.length === 0) return "(nenhum documento relevante aprovado)";
  return filtered
    .map(
      (d) =>
        `### Etapa ${phaseLabel(d.phase_number)} — ${d.title}\n\n${d.content.slice(0, 6000)}`
    )
    .join("\n\n---\n\n");
}

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
    /* no window */
  }
}

// ---------- Factory ----------

export interface PhasePreReqs {
  ready: boolean;
  missing: string[];
  approvedPhases: number[];
}

export interface PlanOptions {
  projectId: string;
  onText?: (delta: string) => void;
  signal?: AbortSignal;
}

export interface RunOptions<TItem extends BasePlanItem> {
  projectId: string;
  items: TItem[];
  concurrency?: number;
  autoApprove?: boolean;
  onItemUpdate: (state: RunItemState<TItem>) => void;
  signal?: AbortSignal;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500];

export function createAssetPhase<TItem extends BasePlanItem>(
  cfg: AssetPhaseConfig<TItem>
) {
  async function checkPreReqs(projectId: string): Promise<PhasePreReqs> {
    const docs = await documentsRepo.listByProject(projectId);
    const approved = new Set(
      docs.filter((d) => d.status === "approved").map((d) => d.phase_number)
    );
    const missing = cfg.requiredPhases
      .filter((p) => !approved.has(p))
      .map((p) => `Etapa ${p}`);
    return {
      ready: missing.length === 0,
      missing,
      approvedPhases: Array.from(approved).sort((a, b) => a - b),
    };
  }

  function historyDir(): string {
    // Mantém o mesmo "nome base" do plano, mas como pasta sidecar.
    // Ex: character_sprite_plan.json -> character_sprite_plan.history/
    const base = cfg.planFilename.replace(/\.json$/i, "");
    return `${base}.history`;
  }

  async function savePlan(plan: AssetPhasePlan<TItem>): Promise<void> {
    if (!isTauri()) return;
    await invoke("create_project_dir", { projectId: plan.projectId });

    // Versão monotônica. Busca o maior N em plan.history/v{N}.json e
    // incrementa. Lê também do plano atual (plan.version) para estabilidade.
    const nextVersion = await computeNextVersion(plan.projectId, plan.version);
    const versioned: AssetPhasePlan<TItem> = {
      ...plan,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    // 1) Escreve snapshot na history antes (fail-safe: se o principal falhar
    //    depois, ainda temos histórico).
    try {
      await invoke("write_project_file", {
        args: {
          project_id: plan.projectId,
          relative: `${historyDir()}/v${nextVersion}.json`,
          content: JSON.stringify(versioned, null, 2),
        },
      });
    } catch (e) {
      console.warn(`[${cfg.phaseId}] histórico v${nextVersion} falhou:`, e);
    }

    // 2) Escreve o "atual".
    await invoke("write_project_file", {
      args: {
        project_id: plan.projectId,
        relative: cfg.planFilename,
        content: JSON.stringify(versioned, null, 2),
      },
    });
  }

  async function computeNextVersion(
    projectId: string,
    currentVersion?: number
  ): Promise<number> {
    try {
      const entries = await invoke<
        Array<{ name: string; is_dir: boolean }>
      >("list_project_files", {
        projectId,
        relative: historyDir(),
      }).catch(() => []);
      let maxN = currentVersion ?? 0;
      for (const e of entries ?? []) {
        if (e.is_dir) continue;
        const m = e.name.match(/^v(\d+)(?:_discarded_|\.json$)/);
        if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
      }
      return maxN + 1;
    } catch {
      return (currentVersion ?? 0) + 1;
    }
  }

  async function listPlanVersions(
    projectId: string
  ): Promise<
    Array<{ version: number; filename: string; discarded: boolean; size: number }>
  > {
    if (!isTauri()) return [];
    try {
      const entries = await invoke<
        Array<{ name: string; is_dir: boolean; size: number }>
      >("list_project_files", {
        projectId,
        relative: historyDir(),
      }).catch(() => []);
      const out: Array<{
        version: number;
        filename: string;
        discarded: boolean;
        size: number;
      }> = [];
      for (const e of entries ?? []) {
        if (e.is_dir) continue;
        const m = e.name.match(/^v(\d+)(?:_discarded_\d+)?\.json$/);
        if (m) {
          out.push({
            version: parseInt(m[1], 10),
            filename: e.name,
            discarded: e.name.includes("_discarded_"),
            size: e.size,
          });
        }
      }
      out.sort((a, b) => b.version - a.version);
      return out;
    } catch {
      return [];
    }
  }

  async function restorePlanVersion(
    projectId: string,
    filename: string
  ): Promise<AssetPhasePlan<TItem> | null> {
    if (!isTauri()) return null;
    try {
      const raw = await invoke<string>("read_project_file", {
        projectId,
        relative: `${historyDir()}/${filename}`,
      });
      const parsed = JSON.parse(raw) as AssetPhasePlan<TItem>;
      if (!parsed.items || !Array.isArray(parsed.items)) return null;
      await savePlan({ ...parsed, version: undefined });
      return parsed;
    } catch (e) {
      console.warn(`[${cfg.phaseId}] restore falhou:`, e);
      return null;
    }
  }

  async function discardPlan(
    projectId: string
  ): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      // Move o atual pra history como v{N}_discarded_{ts}.json (via read+write).
      const raw = await invoke<string>("read_project_file", {
        projectId,
        relative: cfg.planFilename,
      }).catch(() => "");
      if (raw) {
        const ts = Date.now();
        const parsed = JSON.parse(raw) as AssetPhasePlan<TItem>;
        const v = parsed.version ?? (await computeNextVersion(projectId));
        await invoke("write_project_file", {
          args: {
            project_id: projectId,
            relative: `${historyDir()}/v${v}_discarded_${ts}.json`,
            content: raw,
          },
        });
      }
      // Sobrescreve atual com `{ items: [] }` vazio (mantém "ausente" de
      // forma explícita — assim loadPlan retorna null coerentemente).
      await invoke("write_project_file", {
        args: {
          project_id: projectId,
          relative: cfg.planFilename,
          content: "",
        },
      });
      return true;
    } catch (e) {
      console.warn(`[${cfg.phaseId}] discardPlan falhou:`, e);
      return false;
    }
  }

  async function loadPlan(
    projectId: string
  ): Promise<AssetPhasePlan<TItem> | null> {
    if (!isTauri()) return null;
    try {
      const raw = await invoke<string>("read_project_file", {
        projectId,
        relative: cfg.planFilename,
      });
      const parsed = JSON.parse(raw) as AssetPhasePlan<TItem>;
      if (!parsed.items || !Array.isArray(parsed.items)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function plan(
    opts: PlanOptions
  ): Promise<AssetPhasePlan<TItem>> {
    const docs = await documentsRepo.listByProject(opts.projectId);
    const corpus = defaultBuildCorpus(docs, cfg.corpusPhases ?? cfg.requiredPhases);

    // Injeta bloco CANON ATUAL para evitar duplicação cross-phase.
    let canonBlock = "";
    try {
      const { buildCanonPromptBlock } = await import("./canon");
      canonBlock = await buildCanonPromptBlock(opts.projectId);
    } catch (e) {
      console.warn(`[${cfg.phaseId}] canon block build falhou:`, e);
    }

    const baseUser = cfg.buildUserMessage
      ? cfg.buildUserMessage(corpus)
      : `Documentos aprovados do projeto abaixo. Planeje conforme as regras do sistema.\n\n${corpus}`;
    const userMessage = canonBlock
      ? `${canonBlock}\n\n---\n\n${baseUser}`
      : baseUser;

    const { done } = streamClaude({
      systemPrompt: cfg.systemPrompt,
      model: "sonnet",
      userMessage,
      onText: opts.onText,
      signal: opts.signal,
    });

    const result = await done;
    if (!result.success) {
      throw new Error(
        `[${cfg.phaseId}] planner Claude falhou: ${result.error ?? "erro desconhecido"}`
      );
    }

    const text = result.fullText.trim();
    const jsonText = firstJsonObject(text) ?? text;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new Error(
        `[${cfg.phaseId}] resposta não é JSON válido: ${String(e)}\n\n${text.slice(0, 600)}`
      );
    }

    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    const items: TItem[] = [];
    const seenNames = new Set<string>();
    rawItems.forEach((raw: any, index: number) => {
      const norm = cfg.normalizeItem(raw, { index });
      if (!norm) return;
      const nameKey = (norm.name ?? "").toLowerCase().trim();
      if (!nameKey || seenNames.has(nameKey)) return;
      seenNames.add(nameKey);
      items.push({
        ...norm,
        id: nanoid(),
        included: true,
      } as TItem);
    });

    if (items.length === 0) {
      throw new Error(`[${cfg.phaseId}] plano vazio ou inválido.`);
    }

    const planObj: AssetPhasePlan<TItem> = {
      projectId: opts.projectId,
      phaseId: cfg.phaseId,
      createdAt: new Date().toISOString(),
      items,
    };

    await savePlan(planObj).catch((e) =>
      console.warn(`[${cfg.phaseId}] falha ao persistir plano:`, e)
    );
    return planObj;
  }

  async function processOne(
    state: RunItemState<TItem>,
    opts: RunOptions<TItem>
  ): Promise<void> {
    const autoApprove = opts.autoApprove ?? true;
    const { assetsRepo } = await import("./db");
    const { ingestAsset } = await import("./kb");
    const { tryLinkAssetFromMetadata } = await import("./canon");

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
        const res = await cfg.runOne(state.plan, {
          projectId: opts.projectId,
          signal: opts.signal,
        });
        state.asset = res.asset;

        if (autoApprove) {
          try {
            await assetsRepo.setStatus(res.asset.id, "approved");
            await ingestAsset({
              projectId: opts.projectId,
              assetId: res.asset.id,
              assetPath: res.asset.file_path,
              assetType: (res.kbDocumentType ?? res.asset.asset_type) as any,
              prompt: res.asset.prompt,
              phaseNumber: state.plan.sourcePhase,
              metadata: {
                plan_item_id: state.plan.id,
                name: state.plan.name,
                rationale: state.plan.rationale,
                ...(res.kbMetadata ?? {}),
              },
            });
            emitKbUpdated(opts.projectId);

            // Link automático ao canon (se entry com slug compatível existir).
            try {
              const canonKind: "concept" | "sprite" =
                cfg.phaseId === "concept-art" ? "concept" : "sprite";
              const meta = res.kbMetadata ?? {};
              await tryLinkAssetFromMetadata(
                opts.projectId,
                res.asset.id,
                canonKind,
                {
                  slug: (meta as any).canon_slug,
                  name: state.plan.name,
                  prompt: res.asset.prompt,
                  characterName: (meta as any).character_name,
                }
              );
            } catch (e) {
              console.warn(`[${cfg.phaseId}] canon.linkAsset falhou:`, e);
            }

            if (cfg.onItemIngested) {
              try {
                await cfg.onItemIngested(state.plan, res.asset, {
                  projectId: opts.projectId,
                  signal: opts.signal,
                });
              } catch (e) {
                console.warn(`[${cfg.phaseId}] onItemIngested falhou:`, e);
              }
            }
          } catch (e) {
            console.warn(
              `[${cfg.phaseId}] falha ao auto-aprovar/ingerir:`,
              e
            );
          }
        }

        state.status = "success";
        state.error = undefined;
        state.finishedAt = Date.now();
        opts.onItemUpdate({ ...state });
        return;
      } catch (e: any) {
        state.error = String(e?.message ?? e);
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

  async function run(
    opts: RunOptions<TItem>
  ): Promise<RunItemState<TItem>[]> {
    const states: RunItemState<TItem>[] = opts.items.map((plan) => ({
      plan,
      status: "pending",
      attempt: 0,
    }));
    for (const s of states) opts.onItemUpdate({ ...s });

    const concurrency = Math.max(
      1,
      Math.min(4, opts.concurrency ?? cfg.defaultConcurrency ?? 2)
    );
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

  return {
    phaseId: cfg.phaseId,
    checkPreReqs,
    plan,
    savePlan,
    loadPlan,
    run,
    listPlanVersions,
    restorePlanVersion,
    discardPlan,
  };
}
