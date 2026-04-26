// F1 Character Sprites v2 — runner com workers paralelos, recovery e backoff.
// Espelha o padrão de conceptRunnerV2, mas cada job executa um bundle Pixellab
// (portrait + animate-with-skeleton por anim + slice_frames + custom actions)
// gravando múltiplos sprite_assets por job. O asset_id vinculado ao job é o
// portrait — frames fatiados e custom actions são sprites satélites.

import { invoke } from "@tauri-apps/api/core";
import {
  animateWithSkeleton,
  generatePixellab,
  generatePixellabBitforge,
  generatePixellabV2,
} from "./apis/pixellab";
import { readBinaryAssetBase64 } from "./tauriFs";
import { assetsRepo, uid } from "./db";
import { linkAsset } from "./canon";
import { getStyleRefForSlug } from "./styleRef";
import * as jobs from "./assetJobs";
import { parseSpriteBundle } from "./spritePlannerV2";
import type {
  AssetJob,
  AssetJobTier,
  QueueSnapshot,
} from "@/types/domain";
import type { GeneratedAsset } from "@/types/domain";
import type { AnimationSpec, SpritePromptResult } from "./spritePrompts";

const DOMAIN = "character_sprite" as const;
const MAX_ATTEMPTS = 4;
const HEARTBEAT_MS = 30_000;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const CB_WINDOW_MS = 60_000;
const CB_THRESHOLD = 5;
const CB_PAUSE_MS = 120_000;

export type SpriteRunnerEvent =
  | { kind: "job-started"; job: AssetJob }
  | { kind: "job-success"; job: AssetJob; portraitAssetId: string; extraCount: number }
  | { kind: "job-failed"; job: AssetJob; error: string; willRetry: boolean }
  | { kind: "snapshot"; snapshot: QueueSnapshot }
  | { kind: "paused"; reason: string; resumeAt: number }
  | { kind: "resumed" }
  | { kind: "done"; totals: { generated: number; failed: number; skipped: number } };

export interface SpriteRunnerOptions {
  projectId: string;
  concurrency?: number;
  tierFilter?: AssetJobTier[];
  /** Restringe o runner aos jobs específicos (UI seleção). Se omitido, pega
   *  qualquer pending do domain. */
  allowedJobIds?: string[];
  onEvent?: (e: SpriteRunnerEvent) => void;
  signal?: AbortSignal;
}

function deriveRelativePath(filePath: string, projectId: string): string | null {
  const marker = `projects\\${projectId}\\`;
  const markerUnix = `projects/${projectId}/`;
  const idx = filePath.lastIndexOf(marker);
  if (idx >= 0) return filePath.slice(idx + marker.length).replace(/\\/g, "/");
  const idxUnix = filePath.lastIndexOf(markerUnix);
  if (idxUnix >= 0) return filePath.slice(idxUnix + markerUnix.length);
  return null;
}

function safeParseMetadata(raw: string | undefined | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function sliceSheetToFrames(
  projectId: string,
  sheetAsset: GeneratedAsset,
  anim: AnimationSpec,
  slug: string,
  characterName: string,
  characterRole: string,
  size: number
): Promise<string[]> {
  const projectsDir = await invoke<string>("get_projects_dir");
  const subDirRel = `assets/sprite/${slug}_${anim.action}_${anim.direction}_frames`;
  const outDir = `${projectsDir}/${projectId}/${subDirRel}`.replace(/\\/g, "/");
  const prefix = `${slug}_${anim.action}_${anim.direction}`;

  let result: { success: boolean; stderr: string; stdout: string };
  try {
    result = await invoke<typeof result>("aseprite_run_script", {
      args: {
        script: "slice_frames",
        params: [
          ["input", sheetAsset.file_path],
          ["out_dir", outDir],
          ["frames", String(anim.frames)],
          ["prefix", prefix],
        ],
      },
    });
  } catch (e) {
    console.warn(
      `[spriteRunner] slice_frames falhou (${slug}/${anim.action}/${anim.direction}):`,
      e
    );
    return [];
  }
  if (!result.success) {
    console.warn(
      `[spriteRunner] slice_frames exit erro (${slug}/${anim.action}/${anim.direction}):`,
      result.stderr
    );
    return [];
  }

  const frameIds: string[] = [];
  for (let i = 1; i <= anim.frames; i++) {
    const frameName = `${prefix}_${String(i).padStart(2, "0")}.png`;
    const framePath = `${outDir}/${frameName}`;
    try {
      const promptKey = `frame|${slug}|${anim.action}|${anim.direction}|${i}/${anim.frames}|${size}`;
      const hash = await invoke<string>("compute_prompt_hash", {
        prompt: promptKey,
        generator: "pixellab",
        kind: "sprite",
      });
      const frameId = uid();
      const asset = await assetsRepo.create({
        id: frameId,
        project_id: projectId,
        asset_type: "sprite",
        file_path: framePath,
        file_name: frameName,
        prompt: `${characterName} — ${anim.action}/${anim.direction} frame ${i}/${anim.frames}`,
        prompt_hash: hash,
        generator: "pixellab",
        status: "generated",
        file_size_bytes: null,
        generation_metadata: JSON.stringify({
          kind: "animation-frame",
          action: anim.action,
          direction: anim.direction,
          frame_index: i,
          total_frames: anim.frames,
          size,
          sheet_asset_id: sheetAsset.id,
          character_name: slug,
          character_display_name: characterName,
          character_role: characterRole,
          frame_role: "animation_frame",
        }),
        iteration_count: 1,
      });
      frameIds.push(asset.id);
    } catch (e) {
      console.warn(
        `[spriteRunner] falha ao registrar frame ${i} (${slug}/${anim.action}/${anim.direction}):`,
        e
      );
    }
  }
  return frameIds;
}

async function processJob(
  projectId: string,
  job: AssetJob
): Promise<{ portraitAssetId: string; extraAssetIds: string[] }> {
  const bundle = parseSpriteBundle(job.prompt);
  if (!bundle) {
    throw new Error(`Bundle inválido para job ${job.id} (slug=${job.canon_slug})`);
  }
  const slug = job.canon_slug;
  const characterName = job.canon_slug; // fallback; poderíamos carregar canon entry para nome display

  // Carrega concept art ESPECÍFICO do canon entry (herda identidade visual
  // daquele personagem). Fallback para styleRef global se entry não tem
  // conceptAssetIds populado.
  const slugStyleRef = await getStyleRefForSlug(projectId, slug);

  // Passo 1: portrait base. Estratégia depende da disponibilidade do concept:
  //   - Concept específico → /v2/generate-image-v2 (Pro endpoint, Tier 2+):
  //     reference_images=[concept] em alta resolução (256×256). Preserva
  //     identidade (rosto, postura, roupa) muito melhor que bitforge v1.
  //   - Sem concept → fallback pixflux v1 com style global.
  // Resolução de geração ALTA (256) — Aseprite reduz para o size final ao
  // empacotar. Mais detalhes preservados do concept.
  const PORTRAIT_GEN_SIZE = 256;
  let portrait: { asset: GeneratedAsset; cached: boolean };
  if (slugStyleRef) {
    portrait = await generatePixellabV2({
      projectId,
      prompt: bundle.portraitPrompt,
      referenceImages: [slugStyleRef], // concept como subject guidance
      size: PORTRAIT_GEN_SIZE,
      assetType: "sprite",
      noBackground: true,
      extraMetadata: {
        character_name: slug,
        character_role: bundle.role,
        frame_role: "portrait",
        sprite_plan_domain: DOMAIN,
        gen_size: PORTRAIT_GEN_SIZE,
        target_size: bundle.size,
        canon_concept_ref: "v2-reference-image",
      },
    });
  } else {
    // Fallback v1 pixflux quando entry não tem concept linkado
    portrait = await generatePixellab({
      projectId,
      prompt: bundle.portraitPrompt,
      size: bundle.size,
      assetType: "sprite",
      styleRef: null,
      shading: "basic shading",
      detail: "highly detailed",
      outline: "single color black outline",
      noBackground: true,
      extraMetadata: {
        character_name: slug,
        character_role: bundle.role,
        frame_role: "portrait",
        sprite_plan_domain: DOMAIN,
        canon_concept_ref: "pixflux-no-concept-fallback",
      },
    });
  }

  const extraAssetIds: string[] = [];

  // Passo 2: lê portrait como base64 (reference_image do skeleton)
  const rel = deriveRelativePath(portrait.asset.file_path, projectId);
  let portraitBase64 = "";
  if (rel) {
    try {
      portraitBase64 = await readBinaryAssetBase64(projectId, rel);
    } catch {
      portraitBase64 = "";
    }
  }

  // Preferência para usar o PORTRAIT recém-gerado como reference nas custom
  // actions. Fallback: slug concept ou global.
  const actionRef = portraitBase64 || slugStyleRef || null;

  // Passo 3: TODAS as animações suportadas por /animate-with-skeleton
  // (idle/walk/run/attack/hurt/death/jump) usam reference_image REAL do
  // portrait, garantindo identidade visual do char em todas as actions.
  // Depois fatia cada sheet horizontal em frames individuais.
  const SKELETON_ACTIONS = [
    "idle",
    "walk",
    "run",
    "attack",
    "hurt",
    "death",
    "jump",
  ];
  if (portraitBase64) {
    for (const anim of bundle.animations.filter((a) =>
      SKELETON_ACTIONS.includes(a.action)
    )) {
      try {
        const r = await animateWithSkeleton({
          projectId,
          referenceBase64: portraitBase64,
          action: anim.action,
          direction: anim.direction,
          nFrames: anim.frames,
          size: bundle.size,
          description: bundle.portraitPrompt,
          characterName: slug,
          extraMetadata: {
            character_role: bundle.role,
            sprite_plan_domain: DOMAIN,
          },
        });
        extraAssetIds.push(r.asset.id);

        const sheetMeta = safeParseMetadata(r.asset.generation_metadata);
        if (sheetMeta.sheet === true && r.frameCount > 1) {
          const frameIds = await sliceSheetToFrames(
            projectId,
            r.asset,
            anim,
            slug,
            characterName,
            bundle.role,
            bundle.size
          );
          extraAssetIds.push(...frameIds);
        }
      } catch (e) {
        console.warn(
          `[spriteRunner] animate falhou ${slug}/${anim.action}/${anim.direction}:`,
          e
        );
      }
    }
  } else {
    console.warn(
      `[spriteRunner] ${slug}: portrait sem base64 — pulando animações skeleton (sem identidade confiável)`
    );
  }

  // Passo 4: custom actions (special, cast, etc.) via /v2/generate-image-v2
  // com PORTRAIT + CONCEPT como reference_images. Garante que o char da action
  // é o MESMO do portrait, não um humanoide genérico (problema do pixflux v1).
  // Usa o size de geração alta (256) — Aseprite reduz depois.
  const customRefs: string[] = [];
  if (portraitBase64) customRefs.push(portraitBase64);
  if (slugStyleRef && customRefs.length < 4) customRefs.push(slugStyleRef);

  for (const custom of bundle.customActions.slice(0, 4)) {
    try {
      if (customRefs.length === 0) {
        // Sem referências disponíveis — pula em vez de gerar char errado
        console.warn(`[spriteRunner] custom ${slug}/${custom.action} skipped (sem reference)`);
        continue;
      }
      const r = await generatePixellabV2({
        projectId,
        prompt: `${custom.description} — same exact character as reference, full-body pose`,
        referenceImages: customRefs,
        size: 256,
        assetType: "sprite",
        noBackground: true,
        extraMetadata: {
          character_name: slug,
          character_role: bundle.role,
          frame_role: "custom_action",
          custom_action: custom.action,
          sprite_plan_domain: DOMAIN,
          gen_size: 256,
          target_size: bundle.size,
          ref_count: customRefs.length,
        },
      });
      extraAssetIds.push(r.asset.id);
    } catch (e) {
      console.warn(`[spriteRunner] custom ${slug}/${custom.action} falhou:`, e);
    }
  }

  // Linka portrait no canon como sprite principal do entry
  try {
    await linkAsset(projectId, slug, portrait.asset.id, "sprite");
  } catch (e) {
    console.warn(`[spriteRunner] canon link falhou ${slug}:`, e);
  }

  return { portraitAssetId: portrait.asset.id, extraAssetIds };
}

export async function runSpriteQueue(opts: SpriteRunnerOptions): Promise<{
  generated: number;
  failed: number;
  skipped: number;
}> {
  const concurrency = Math.min(Math.max(opts.concurrency ?? 2, 1), 6);

  // Recovery: jobs running abandonados. Timeout de 5min — heartbeat é a cada
  // 30s; se passou 5x sem update, o worker está zombie (HMR, crash de tab,
  // promise pendurada). Antes era 15min, mas isso fazia o usuário esperar
  // demais para retomar.
  await jobs.requeueStale(opts.projectId, 300, DOMAIN);

  const emit = (e: SpriteRunnerEvent) => opts.onEvent?.(e);
  const emitSnapshot = async () =>
    emit({ kind: "snapshot", snapshot: await jobs.snapshot(opts.projectId, DOMAIN) });
  await emitSnapshot();

  let generated = 0;
  let failed = 0;
  const skipped = 0;

  const failureTimes: number[] = [];
  const cbState = { pausedUntil: 0 };

  async function runWorker(workerIdx: number): Promise<void> {
    while (!opts.signal?.aborted) {
      const now = Date.now();
      if (cbState.pausedUntil > now) {
        await sleep(cbState.pausedUntil - now, opts.signal);
        continue;
      }

      const job = await jobs.claimNext(opts.projectId, {
        domain: DOMAIN,
        tierFilter: opts.tierFilter,
        allowedJobIds: opts.allowedJobIds,
      });
      if (!job) return;
      emit({ kind: "job-started", job });

      const heartbeat = setInterval(() => {
        void jobs.heartbeat(job.id);
      }, HEARTBEAT_MS);

      try {
        // Graceful stop: se abort ocorreu antes do processJob iniciar,
        // devolve imediatamente em vez de executar o job.
        if (opts.signal?.aborted) {
          await jobs.requeue(job.id, "cancelled by user");
          return;
        }
        console.log(`[F1.worker${workerIdx}] start ${job.canon_slug} (${job.tier}/${job.category})`);
        const t0 = Date.now();
        const result = await processJob(opts.projectId, job);
        console.log(
          `[F1.worker${workerIdx}] done ${job.canon_slug} in ${((Date.now() - t0) / 1000).toFixed(1)}s — portrait + ${result.extraAssetIds.length} extras`
        );
        await jobs.completeSuccess(job.id, result.portraitAssetId);
        generated++;
        emit({
          kind: "job-success",
          job,
          portraitAssetId: result.portraitAssetId,
          extraCount: result.extraAssetIds.length,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Se abort ocorreu durante processJob, não conta como falha:
        // devolve o job para pending para o usuário retomar depois.
        if (opts.signal?.aborted) {
          await jobs.requeue(job.id, "cancelled by user");
          emit({ kind: "job-failed", job, error: "cancelled", willRetry: true });
          return;
        }
        const retriable = /network|timeout|ECONN|429|5\d\d/i.test(errMsg);
        if (retriable && job.attempts < MAX_ATTEMPTS) {
          const delay = Math.min(
            BACKOFF_BASE_MS * 2 ** (job.attempts - 1) + Math.random() * 500,
            BACKOFF_MAX_MS
          );
          await jobs.requeue(job.id, errMsg);
          emit({ kind: "job-failed", job, error: errMsg, willRetry: true });
          await sleep(delay, opts.signal);
        } else {
          await jobs.completeFailure(job.id, errMsg);
          failed++;
          emit({ kind: "job-failed", job, error: errMsg, willRetry: false });
          failureTimes.push(Date.now());
          while (failureTimes.length && failureTimes[0] < Date.now() - CB_WINDOW_MS) {
            failureTimes.shift();
          }
          if (failureTimes.length >= CB_THRESHOLD) {
            cbState.pausedUntil = Date.now() + CB_PAUSE_MS;
            failureTimes.length = 0;
            emit({
              kind: "paused",
              reason: `${CB_THRESHOLD} falhas em 60s`,
              resumeAt: cbState.pausedUntil,
            });
            await sleep(CB_PAUSE_MS, opts.signal);
            emit({ kind: "resumed" });
          }
        }
      } finally {
        clearInterval(heartbeat);
        await emitSnapshot();
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) workers.push(runWorker(i));
  await Promise.all(workers);

  emit({ kind: "done", totals: { generated, failed, skipped } });
  return { generated, failed, skipped };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}
