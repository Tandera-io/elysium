// Runner do Batch Producer: executa o manifest da Etapa 12 em paralelo
// controlado, despachando cada item para Pixellab (visuais) ou ElevenLabs
// (áudio) e persistindo os resultados em `generated_assets`.

import {
  type AssetManifest,
  type AssetManifestItem,
  isAudioKind,
  isVisualKind,
} from "./assetManifest";
import { generatePixellab, type PixellabSize } from "./apis/pixellab";
import { generateElevenLabs } from "./apis/elevenlabs";
import type { GeneratedAsset } from "@/types/domain";

export type BatchItemStatus = "pending" | "running" | "success" | "error";

export interface BatchItem {
  id: string; // "{name}#{variation}"
  manifest: AssetManifestItem;
  variationIndex: number;
  status: BatchItemStatus;
  attempt: number;
  asset?: GeneratedAsset;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface BatchOptions {
  projectId: string;
  manifest: AssetManifest;
  concurrency?: number;
  maxRetries?: number;
  onItemUpdate?: (item: BatchItem) => void;
  signal?: AbortSignal;
  force?: boolean;
}

export interface BatchResult {
  items: BatchItem[];
  okCount: number;
  errorCount: number;
  cancelled: boolean;
}

/**
 * Expande o manifest em items (uma entrada por variation) e roda a fila com
 * concorrência limitada. Cada item é re-tentado até `maxRetries` vezes com
 * backoff exponencial simples.
 */
export async function runManifestBatch(
  opts: BatchOptions
): Promise<BatchResult> {
  const concurrency = Math.max(1, opts.concurrency ?? 2);
  const maxRetries = Math.max(0, opts.maxRetries ?? 2);
  const items = expandManifest(opts.manifest);

  let okCount = 0;
  let errorCount = 0;
  let cancelled = false;

  // Roda em "worker pool" simples.
  let cursor = 0;
  const workers: Promise<void>[] = [];

  const emit = (it: BatchItem) => {
    try {
      opts.onItemUpdate?.(it);
    } catch {
      // ignora
    }
  };

  async function worker() {
    while (cursor < items.length) {
      if (opts.signal?.aborted) {
        cancelled = true;
        return;
      }
      const i = cursor++;
      const it = items[i];
      await runOneWithRetry(it, {
        projectId: opts.projectId,
        maxRetries,
        force: opts.force,
        onUpdate: emit,
        signal: opts.signal,
      });
      if (it.status === "success") okCount++;
      else if (it.status === "error") errorCount++;
    }
  }

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return { items, okCount, errorCount, cancelled };
}

function expandManifest(manifest: AssetManifest): BatchItem[] {
  const items: BatchItem[] = [];
  for (const m of manifest.assets) {
    const variations = Math.max(1, m.variations ?? 1);
    for (let v = 0; v < variations; v++) {
      items.push({
        id: variations > 1 ? `${m.name}#${v + 1}` : m.name,
        manifest: m,
        variationIndex: v,
        status: "pending",
        attempt: 0,
      });
    }
  }
  return items;
}

async function runOneWithRetry(
  it: BatchItem,
  ctx: {
    projectId: string;
    maxRetries: number;
    force?: boolean;
    signal?: AbortSignal;
    onUpdate: (it: BatchItem) => void;
  }
): Promise<void> {
  for (let attempt = 0; attempt <= ctx.maxRetries; attempt++) {
    if (ctx.signal?.aborted) {
      it.status = "error";
      it.error = "cancelado pelo usuario";
      it.finishedAt = Date.now();
      ctx.onUpdate(it);
      return;
    }
    it.attempt = attempt + 1;
    it.status = "running";
    it.startedAt = Date.now();
    it.error = undefined;
    ctx.onUpdate(it);
    try {
      const asset = await dispatch(it, ctx);
      it.asset = asset;
      it.status = "success";
      it.finishedAt = Date.now();
      ctx.onUpdate(it);
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      it.error = msg;
      if (attempt >= ctx.maxRetries) {
        it.status = "error";
        it.finishedAt = Date.now();
        ctx.onUpdate(it);
        return;
      }
      // backoff: 800ms, 1600ms, 3200ms
      const wait = 800 * Math.pow(2, attempt);
      ctx.onUpdate(it);
      await sleep(wait);
    }
  }
}

async function dispatch(
  it: BatchItem,
  ctx: { projectId: string; force?: boolean }
): Promise<GeneratedAsset> {
  const m = it.manifest;
  if (isVisualKind(m.kind)) {
    const size = (m.size ?? 128) as PixellabSize;
    const assetType =
      m.kind === "sprite" ? "sprite" : m.kind === "tile" ? "tile" : "concept_art";
    // Se houver N variações do mesmo prompt, "forçamos" a geração para não
    // retornar o mesmo cache 3x.
    const force = ctx.force || it.variationIndex > 0;
    const res = await generatePixellab({
      projectId: ctx.projectId,
      prompt: m.prompt,
      size,
      assetType,
      force,
    });
    return res.asset;
  }
  if (isAudioKind(m.kind)) {
    const kind = m.kind === "audio_music" ? "music" : "sfx";
    const durationSeconds =
      m.duration_sec ?? (kind === "music" ? 30 : 3);
    const force = ctx.force || it.variationIndex > 0;
    const res = await generateElevenLabs({
      projectId: ctx.projectId,
      prompt: m.prompt,
      kind,
      durationSeconds,
      force,
    });
    return res.asset;
  }
  throw new Error(`kind desconhecido: ${(m as AssetManifestItem).kind}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
