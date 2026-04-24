// Runner v2 da fila de concept arts com workers paralelos, exponential backoff
// com jitter, heartbeat e circuit breaker. Recupera-se de crash porque todo o
// estado vive na tabela `asset_jobs` (migration 004).

import { generateOpenAiImage, OpenAiImageError } from "./apis/openaiImage";
import { linkAsset } from "./canon";
import * as jobs from "./assetJobs";
import { ingestAsset } from "./kb";
import type {
  AssetJob,
  AssetJobTier,
  QueueSnapshot,
} from "@/types/domain";

const MAX_ATTEMPTS = 4;
const HEARTBEAT_MS = 30_000;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
// Circuit breaker: se N falhas em janela de M segundos → pausa P segundos.
const CB_WINDOW_MS = 60_000;
const CB_THRESHOLD = 5;
const CB_PAUSE_MS = 120_000;

export type RunnerEvent =
  | { kind: "job-started"; job: AssetJob }
  | { kind: "job-success"; job: AssetJob; assetId: string }
  | { kind: "job-failed"; job: AssetJob; error: string; willRetry: boolean }
  | { kind: "snapshot"; snapshot: QueueSnapshot }
  | { kind: "paused"; reason: string; resumeAt: number }
  | { kind: "resumed" }
  | { kind: "done"; totals: { generated: number; failed: number; skipped: number } };

export interface RunnerOptions {
  projectId: string;
  concurrency?: number;
  tierFilter?: AssetJobTier[];
  onEvent?: (e: RunnerEvent) => void;
  signal?: AbortSignal;
}

export async function runAssetQueue(opts: RunnerOptions): Promise<{
  generated: number;
  failed: number;
  skipped: number;
}> {
  const concurrency = Math.min(Math.max(opts.concurrency ?? 4, 1), 8);

  // Recovery: jobs running abandonados → pending
  await jobs.requeueStale(opts.projectId, 300);

  const emit = (e: RunnerEvent) => opts.onEvent?.(e);
  const emitSnapshot = async () => emit({ kind: "snapshot", snapshot: await jobs.snapshot(opts.projectId) });
  await emitSnapshot();

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  // Circuit breaker: buffer de timestamps de falhas
  const failureTimes: number[] = [];
  const cbState = { pausedUntil: 0 };

  async function runWorker(workerIdx: number): Promise<void> {
    while (!opts.signal?.aborted) {
      // Respeita circuit breaker
      const now = Date.now();
      if (cbState.pausedUntil > now) {
        await sleep(cbState.pausedUntil - now, opts.signal);
        continue;
      }

      const job = await jobs.claimNext(opts.projectId, { tierFilter: opts.tierFilter });
      if (!job) {
        // Fila vazia para este worker; sai.
        return;
      }
      emit({ kind: "job-started", job });

      const heartbeatTimer = setInterval(() => {
        void jobs.heartbeat(job.id);
      }, HEARTBEAT_MS);

      try {
        const result = await generateOpenAiImage({
          projectId: opts.projectId,
          prompt: job.prompt,
          quality: job.tier,
          size: (job.size as "1024x1024" | "1024x1536" | "1536x1024") ?? "1024x1024",
          canonSlug: job.canon_slug,
          extraMetadata: {
            canon_entry_id: job.canon_entry_id,
            kind: job.kind,
            category: job.category,
          },
        });
        await jobs.completeSuccess(job.id, result.asset.id);
        await linkAsset(opts.projectId, job.canon_slug, result.asset.id, "concept").catch(() => {});
        // KB ingest em background (não bloqueia worker)
        void ingestAsset({
          projectId: opts.projectId,
          assetId: result.asset.id,
          assetPath: result.asset.file_path,
          assetType: "concept_art",
          prompt: job.prompt,
          phaseNumber: 10,
          metadata: { canon_slug: job.canon_slug, tier: job.tier },
        }).catch(() => {});

        generated++;
        emit({ kind: "job-success", job, assetId: result.asset.id });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const retriable =
          err instanceof OpenAiImageError
            ? err.retriable ?? false
            : /network|timeout|ECONN|429|5\d\d/i.test(errMsg);

        if (retriable && job.attempts < MAX_ATTEMPTS) {
          // backoff e requeue
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

          // Circuit breaker: regista falha
          failureTimes.push(Date.now());
          // purga antigas
          while (failureTimes.length && failureTimes[0] < Date.now() - CB_WINDOW_MS) {
            failureTimes.shift();
          }
          if (failureTimes.length >= CB_THRESHOLD) {
            cbState.pausedUntil = Date.now() + CB_PAUSE_MS;
            failureTimes.length = 0;
            emit({ kind: "paused", reason: `${CB_THRESHOLD} falhas em 60s`, resumeAt: cbState.pausedUntil });
            await sleep(CB_PAUSE_MS, opts.signal);
            emit({ kind: "resumed" });
          }
        }
      } finally {
        clearInterval(heartbeatTimer);
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
