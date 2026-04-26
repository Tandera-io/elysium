// Cliente Pixellab: concept arts / sprites / tiles.
//
// Docs oficiais: https://api.pixellab.ai/v1  (endpoints principais:
// /generate-image-pixflux, /generate-image-bitforge, /animate-with-skeleton).

import { fetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { assetsRepo, uid } from "../db";
import { getApiKeys } from "./env";
import { getStyleRef } from "../styleRef";
import type { AssetType, GeneratedAsset } from "@/types/domain";

export type PixellabSize = 64 | 96 | 128 | 192 | 256;

// ---------------------------------------------------------------------------
// Semaphore global — limita concurrent HTTP calls à API Pixellab.
// Evita o erro "Sorry, you have reached the maximum number of concurrent
// jobs" (429) que ocorria quando N workers × M calls/job excediam o limite
// do plano Pixellab (~3 concurrent).
// ---------------------------------------------------------------------------

const MAX_CONCURRENT_PIXELLAB = 3;
let activePixellabCalls = 0;
const pixellabQueue: Array<() => void> = [];

async function acquirePixellabSlot(): Promise<void> {
  if (activePixellabCalls < MAX_CONCURRENT_PIXELLAB) {
    activePixellabCalls++;
    return;
  }
  return new Promise<void>((resolve) => {
    pixellabQueue.push(() => {
      activePixellabCalls++;
      resolve();
    });
  });
}

function releasePixellabSlot(): void {
  activePixellabCalls = Math.max(0, activePixellabCalls - 1);
  const next = pixellabQueue.shift();
  if (next) next();
}

// Timeout máximo por chamada Pixellab. Se servidor demora demais, falha
// retriable (job vai para retry com backoff em vez de ficar travado).
const PIXELLAB_FETCH_TIMEOUT_MS = 180_000; // 3 min

async function pixellabFetch(
  url: string,
  init: RequestInit,
  retryOn429 = true
): Promise<Response> {
  await acquirePixellabSlot();
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      releasePixellabSlot();
    }
  };
  try {
    // AbortController + timeout — protege contra Promises penduradas que
    // antes deixavam jobs em "running" para sempre quando a network/HMR
    // perdia o controle.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PIXELLAB_FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: controller.signal as any });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429 && retryOn429) {
      const body = await res.clone().text();
      release();
      const delay =
        2000 +
        Math.min(pixellabQueue.length * 500, 4000) +
        Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
      throw new Error(
        `Pixellab 429 (retry after ${Math.round(delay)}ms): ${body.slice(0, 200)}`
      );
    }
    return res;
  } finally {
    release();
  }
}

export interface PixellabGenerateOptions {
  projectId: string;
  prompt: string;
  negativePrompt?: string;
  size: PixellabSize;
  assetType: Extract<AssetType, "sprite" | "tile" | "concept_art">;
  /** Base64 manual; se omitido, o wrapper auto-injeta o style-ref do projeto.
   *  Passar null explicitamente desativa o lock (usado pelo próprio
   *  concept-planner para gerar o 1º concept, que será o seed). */
  styleRef?: string | null;
  outline?: "single color black outline" | "lineless" | "selective outline";
  shading?: "flat shading" | "basic shading" | "medium shading";
  detail?: "low detail" | "medium detail" | "highly detailed";
  force?: boolean;
  /** Remove o fundo (transparente) independente do assetType. */
  noBackground?: boolean;
  /** Metadata extra salva em generation_metadata (ex: character_name,
   *  frame_role, biome) — usada pelo asepritePacker para agrupar corretamente. */
  extraMetadata?: Record<string, unknown>;
}

export interface PixellabResult {
  asset: GeneratedAsset;
  cached: boolean;
}

export async function generatePixellab(
  opts: PixellabGenerateOptions
): Promise<PixellabResult> {
  const keys = await getApiKeys();
  if (!keys.pixellab) throw new Error("PIXELLAB_API_KEY não configurada");

  const hash = await invoke<string>("compute_prompt_hash", {
    prompt: opts.prompt,
    generator: "pixellab",
    kind: opts.assetType,
  });

  if (!opts.force) {
    const cached = await assetsRepo.findByPromptHash(opts.projectId, hash);
    if (cached) {
      return { asset: cached, cached: true };
    }
  }

  const body: Record<string, unknown> = {
    description: opts.prompt,
    negative_description: opts.negativePrompt ?? "",
    image_size: { width: opts.size, height: opts.size },
    no_background: opts.noBackground ?? opts.assetType === "sprite",
    outline: opts.outline,
    shading: opts.shading,
    detail: opts.detail,
    text_guidance_scale: 8,
  };
  // Auto-inject style-ref: se caller não passou explicitamente null, tenta
  // buscar o concept art aprovado do projeto para "travar" o estilo visual.
  let styleRefBase64: string | null | undefined = opts.styleRef;
  if (styleRefBase64 === undefined) {
    styleRefBase64 = await getStyleRef(opts.projectId);
  }
  if (styleRefBase64) {
    body.style_image = { type: "base64", base64: styleRefBase64 };
  }

  const res = await pixellabFetch(`${keys.pixellabUrl}/generate-image-pixflux`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${keys.pixellab}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pixellab ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as any;
  const base64 = json?.image?.base64;
  if (!base64) throw new Error("Pixellab: resposta sem imagem base64");

  const bytes = base64ToBytes(base64);
  const id = uid();
  const filename = `${id}.png`;
  const subfolder =
    opts.assetType === "sprite"
      ? "sprite"
      : opts.assetType === "tile"
        ? "tile"
        : "concept";

  const filePath = await invoke<string>("save_binary_asset", {
    projectId: opts.projectId,
    subfolder,
    filename,
    bytes: Array.from(bytes),
  });

  const asset = await assetsRepo.create({
    id,
    project_id: opts.projectId,
    asset_type: opts.assetType,
    file_path: filePath,
    file_name: filename,
    prompt: opts.prompt,
    prompt_hash: hash,
    generator: "pixellab",
    status: "generated",
    file_size_bytes: bytes.length,
    generation_metadata: JSON.stringify({
      size: opts.size,
      outline: opts.outline ?? null,
      shading: opts.shading ?? null,
      detail: opts.detail ?? null,
      ...(opts.extraMetadata ?? {}),
    }),
    iteration_count: 1,
  });
  return { asset, cached: false };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------------------------------------------------------------------------
// Animate with skeleton: gera um PNG horizontal com N frames de animação
// (walk/idle) aproveitando o skeleton pose estimator do Pixellab.
// ---------------------------------------------------------------------------

export type SkeletonAction =
  | "walk"
  | "run"
  | "idle"
  | "jump"
  | "attack"
  | "hurt"
  | "death";

export type SkeletonView = "side" | "low top-down" | "high top-down";

export interface AnimateSkeletonOptions {
  projectId: string;
  referenceBase64: string; // portrait gerado por generatePixellab (base64)
  action: SkeletonAction;
  /** Direção: "east" (padrão side-view), "south" top-down, etc. */
  direction?: "north" | "south" | "east" | "west";
  view?: SkeletonView;
  nFrames?: 4 | 6 | 8;
  size: PixellabSize;
  description: string;
  /** Nome lógico do personagem para log/filename. */
  characterName: string;
  force?: boolean;
  /** Metadata extra salva em generation_metadata. */
  extraMetadata?: Record<string, unknown>;
}

export interface AnimateSkeletonResult {
  asset: GeneratedAsset;
  cached: boolean;
  frameCount: number;
}

export async function animateWithSkeleton(
  opts: AnimateSkeletonOptions
): Promise<AnimateSkeletonResult> {
  const keys = await getApiKeys();
  if (!keys.pixellab) throw new Error("PIXELLAB_API_KEY não configurada");

  const nFrames = opts.nFrames ?? 4;
  const view = opts.view ?? "side";
  const direction = opts.direction ?? "east";
  const promptKey = `animate|${opts.characterName}|${opts.action}|${direction}|${view}|${nFrames}|${opts.size}`;
  const hash = await invoke<string>("compute_prompt_hash", {
    prompt: promptKey,
    generator: "pixellab",
    kind: "sprite",
  });

  if (!opts.force) {
    const cached = await assetsRepo.findByPromptHash(opts.projectId, hash);
    if (cached) return { asset: cached, cached: true, frameCount: nFrames };
  }

  const body: Record<string, unknown> = {
    description: opts.description,
    image_size: { width: opts.size, height: opts.size },
    action: opts.action,
    direction,
    view,
    n_frames: nFrames,
    reference_image: { type: "base64", base64: opts.referenceBase64 },
  };

  const res = await pixellabFetch(`${keys.pixellabUrl}/animate-with-skeleton`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${keys.pixellab}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Pixellab animate-with-skeleton ${res.status}: ${text.slice(0, 500)}`
    );
  }

  const json = (await res.json()) as any;
  // API pode retornar images[] (array por frame) OU image (spritesheet horizontal).
  let base64: string | null = null;
  let isSheet = true;
  if (typeof json?.image?.base64 === "string") {
    base64 = json.image.base64;
    isSheet = true;
  } else if (Array.isArray(json?.images)) {
    // Concatena frames num único sheet horizontal usando canvas (renderer side).
    // Para simplificar, salvamos TODOS os frames lado a lado como PNG horizontal
    // criando um ImageBitmap. Se falhar no Node env, salvamos o primeiro.
    try {
      base64 = await mergeBase64Horizontal(
        json.images.map((i: any) => i.base64 as string)
      );
      isSheet = true;
    } catch {
      base64 = json.images[0]?.base64 ?? null;
      isSheet = false;
    }
  }
  if (!base64) throw new Error("Pixellab animate: resposta sem imagem");

  const bytes = base64ToBytes(base64);
  const id = uid();
  const filename = `${opts.characterName}_${opts.action}_${direction}_sheet.png`;
  const filePath = await invoke<string>("save_binary_asset", {
    projectId: opts.projectId,
    subfolder: "sprite",
    filename,
    bytes: Array.from(bytes),
  });

  const asset = await assetsRepo.create({
    id,
    project_id: opts.projectId,
    asset_type: "sprite",
    file_path: filePath,
    file_name: filename,
    prompt: `${opts.characterName} — ${opts.action} (${direction}, ${nFrames} frames)`,
    prompt_hash: hash,
    generator: "pixellab",
    status: "generated",
    file_size_bytes: bytes.length,
    generation_metadata: JSON.stringify({
      kind: "animate-with-skeleton",
      action: opts.action,
      direction,
      view,
      n_frames: nFrames,
      size: opts.size,
      sheet: isSheet,
      character_name: opts.characterName,
      frame_role: "animation",
      ...(opts.extraMetadata ?? {}),
    }),
    iteration_count: 1,
  });

  return { asset, cached: false, frameCount: nFrames };
}

// ---------------------------------------------------------------------------
// V2 endpoint: /v2/generate-image-v2 (Tier 2/Pro)
//
// Aceita reference_images[] (até 4) como SUBJECT GUIDANCE — Pixellab v2
// preserva identidade do char muito melhor que init_image do bitforge v1.
// Async (202 + job_id) — fazemos polling em /v2/background-jobs/{id}.
// Suporta até 792×688 pixels (sem o resize destrutivo que v1 exigia).
// ---------------------------------------------------------------------------

const PIXELLAB_V2_BASE = "https://api.pixellab.ai/v2";

interface PixellabImagePayload {
  type: string;
  base64: string;
  width?: number;
  height?: number;
}

interface BackgroundJobResponse {
  id?: string;
  background_job_id?: string;
  // Pixellab status enum varia: "processing" | "completed" | "failed"
  status: "pending" | "running" | "processing" | "completed" | "failed";
  // Shape oficial (v2) — imagem em last_response.images[0]
  last_response?: {
    type?: string;
    action?: string;
    seed?: number;
    image?: PixellabImagePayload;
    images?: PixellabImagePayload[];
  };
  // Shapes alternativos (defensive — diferentes endpoints)
  result?: {
    image?: PixellabImagePayload;
    images?: PixellabImagePayload[];
  };
  image?: PixellabImagePayload;
  error?: string;
  usage?: { type?: string; usd?: number; credits?: number } | null;
}

function extractV2Image(resp: BackgroundJobResponse): string | null {
  return (
    resp.last_response?.images?.[0]?.base64 ??
    resp.last_response?.image?.base64 ??
    resp.result?.images?.[0]?.base64 ??
    resp.result?.image?.base64 ??
    resp.image?.base64 ??
    null
  );
}

/** Decodifica width/height do header PNG (IHDR chunk) sem precisar carregar
 *  imagem em canvas. Útil para preencher `size` em reference_images do v2. */
function decodePngSize(base64: string): { width: number; height: number } {
  // Decodifica primeiros bytes do PNG: signature(8) + length(4) + "IHDR"(4) + width(4) + height(4) = 24 bytes
  const bin = atob(base64.slice(0, 40));
  const view = new DataView(
    new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i)).buffer
  );
  const width = view.getUint32(16, false); // big-endian
  const height = view.getUint32(20, false);
  return { width, height };
}

async function pollBackgroundJob(
  jobId: string,
  apiKey: string,
  opts: { maxWaitMs?: number; pollIntervalMs?: number } = {}
): Promise<BackgroundJobResponse> {
  const maxWait = opts.maxWaitMs ?? 240_000; // 4 min
  const interval = opts.pollIntervalMs ?? 2500;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`${PIXELLAB_V2_BASE}/background-jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`pollBackgroundJob ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = (await res.json()) as BackgroundJobResponse;
    if (data.status === "completed" || data.status === "failed") return data;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`pollBackgroundJob timeout após ${maxWait}ms (job ${jobId})`);
}

export interface PixellabV2Options {
  projectId: string;
  prompt: string;
  /** Até 4 imagens de referência (base64 puro). 1ª é a principal — usada
   *  como subject guidance (mantém identidade). */
  referenceImages: string[];
  size: number; // 16-792
  assetType: Extract<AssetType, "sprite" | "tile" | "concept_art">;
  styleImageBase64?: string;
  noBackground?: boolean;
  seed?: number;
  force?: boolean;
  extraMetadata?: Record<string, unknown>;
}

/** Gera pixel art via /v2/generate-image-v2 (Pro endpoint, Tier 2+).
 *  Async — faz polling até job completo. Preserva identidade do char muito
 *  melhor que bitforge v1 (que exigia resize destrutivo do init_image). */
export async function generatePixellabV2(
  opts: PixellabV2Options
): Promise<PixellabResult> {
  const keys = await getApiKeys();
  if (!keys.pixellab) throw new Error("PIXELLAB_API_KEY não configurada");
  if (opts.referenceImages.length === 0) {
    throw new Error("generatePixellabV2: referenceImages obrigatório");
  }
  if (opts.size > 792) {
    throw new Error(`generatePixellabV2: size ${opts.size} > 792 (max v2)`);
  }

  // Hash com fingerprint da 1ª reference image
  const refFingerprint = opts.referenceImages[0].slice(0, 64);
  const hash = await invoke<string>("compute_prompt_hash", {
    prompt: `${opts.prompt}|v2-ref:${refFingerprint}`,
    generator: "pixellab",
    kind: opts.assetType,
  });

  if (!opts.force) {
    const cached = await assetsRepo.findByPromptHash(opts.projectId, hash);
    if (cached) return { asset: cached, cached: true };
  }

  const body: Record<string, unknown> = {
    description: opts.prompt,
    image_size: { width: opts.size, height: opts.size },
    // Pixellab v2 schema: cada item tem `image` + `size` (dimensões reais do PNG).
    reference_images: opts.referenceImages.slice(0, 4).map((b) => {
      const { width, height } = decodePngSize(b);
      return {
        image: { type: "base64", base64: b },
        size: { width, height },
      };
    }),
    no_background: opts.noBackground ?? opts.assetType === "sprite",
  };
  if (opts.styleImageBase64) {
    const { width, height } = decodePngSize(opts.styleImageBase64);
    body.style_image = {
      image: { type: "base64", base64: opts.styleImageBase64 },
      size: { width, height },
    };
  }
  if (opts.seed !== undefined) body.seed = opts.seed;

  // Submete o job (async)
  await acquirePixellabSlot();
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      releasePixellabSlot();
    }
  };
  let jobId: string;
  try {
    const submitRes = await fetch(`${PIXELLAB_V2_BASE}/generate-image-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys.pixellab}`,
      },
      body: JSON.stringify(body),
    });
    if (!submitRes.ok) {
      const txt = await submitRes.text();
      throw new Error(`Pixellab v2 submit ${submitRes.status}: ${txt.slice(0, 400)}`);
    }
    const submitJson = (await submitRes.json()) as {
      background_job_id?: string;
      job_id?: string;
    };
    const id = submitJson.background_job_id ?? submitJson.job_id;
    if (!id) {
      throw new Error(
        `Pixellab v2 sem background_job_id: ${JSON.stringify(submitJson).slice(0, 200)}`
      );
    }
    jobId = id;
  } finally {
    release();
  }

  // Polling do resultado (sem ocupar slot do semaphore — só requests leves)
  const final = await pollBackgroundJob(jobId, keys.pixellab);
  if (final.status === "failed") {
    throw new Error(`Pixellab v2 job failed: ${final.error ?? "unknown"}`);
  }
  const base64 = extractV2Image(final);
  if (!base64) {
    throw new Error(
      `Pixellab v2: resposta sem imagem — ${JSON.stringify(final).slice(0, 300)}`
    );
  }

  const bytes = base64ToBytes(base64);
  const id = uid();
  const filename = `${id}.png`;
  const subfolder =
    opts.assetType === "sprite"
      ? "sprite"
      : opts.assetType === "tile"
        ? "tile"
        : "concept";

  const filePath = await invoke<string>("save_binary_asset", {
    projectId: opts.projectId,
    subfolder,
    filename,
    bytes: Array.from(bytes),
  });

  const asset = await assetsRepo.create({
    id,
    project_id: opts.projectId,
    asset_type: opts.assetType,
    file_path: filePath,
    file_name: filename,
    prompt: opts.prompt,
    prompt_hash: hash,
    generator: "pixellab",
    status: "generated",
    file_size_bytes: bytes.length,
    generation_metadata: JSON.stringify({
      kind: "v2-generate-image",
      size: opts.size,
      ref_count: opts.referenceImages.length,
      job_id: jobId,
      ...(opts.extraMetadata ?? {}),
    }),
    iteration_count: 1,
  });

  return { asset, cached: false };
}

// ---------------------------------------------------------------------------
// Bitforge: image-to-image — converte uma imagem qualquer (concept art em alta
// resolução, PNG, JPG) em pixel art preservando estrutura/identidade.
//
// Diferente do pixflux (que usa style_image como ref de paleta), bitforge
// recebe `init_image` como BASE da geração — o personagem/objeto resultante
// mantém o rosto, postura, roupa do input. Ideal para portrait de sprite a
// partir do concept específico do canon entry.
// ---------------------------------------------------------------------------

export interface PixellabBitforgeOptions {
  projectId: string;
  prompt: string; // descrição complementar para guiar tradução
  negativePrompt?: string; // o que evitar (ex: "different character, generic")
  initImageBase64: string; // PNG do concept (base64 puro, sem prefixo)
  size: PixellabSize;
  assetType: Extract<AssetType, "sprite" | "tile" | "concept_art">;
  /** Força integer (0..100) — quanto o init_image domina vs prompt. Pixellab espera int.
   *  Usamos 90 por padrão para forçar identidade do concept. */
  initStrength?: number;
  /** Peso do prompt textual (1..20). Default Pixellab ~8. Reduzimos para 3 para
   *  o init_image dominar a composição. */
  textGuidanceScale?: number;
  outline?: "single color black outline" | "lineless" | "selective outline";
  shading?: "flat shading" | "basic shading" | "medium shading";
  detail?: "low detail" | "medium detail" | "highly detailed";
  force?: boolean;
  noBackground?: boolean;
  extraMetadata?: Record<string, unknown>;
}

export async function generatePixellabBitforge(
  opts: PixellabBitforgeOptions
): Promise<PixellabResult> {
  const keys = await getApiKeys();
  if (!keys.pixellab) throw new Error("PIXELLAB_API_KEY não configurada");

  // Pixellab bitforge exige que init_image tenha o MESMO tamanho do output
  // (image_size). Concepts são 1024×1024 (gpt-image-1) — fazemos downscale
  // via canvas antes de enviar.
  const resizedInit = await resizeBase64ToSize(
    opts.initImageBase64,
    opts.size,
    opts.size
  );

  // Hash inclui init_image fingerprint para que mudanças no concept
  // invalidem o cache. Usa hash curto do base64 (primeiros 64 chars).
  const initFingerprint = resizedInit.slice(0, 64);
  const hash = await invoke<string>("compute_prompt_hash", {
    prompt: `${opts.prompt}|init:${initFingerprint}`,
    generator: "pixellab",
    kind: opts.assetType,
  });

  if (!opts.force) {
    const cached = await assetsRepo.findByPromptHash(opts.projectId, hash);
    if (cached) return { asset: cached, cached: true };
  }

  const body: Record<string, unknown> = {
    description: opts.prompt,
    negative_description:
      opts.negativePrompt ??
      "different character, generic person, random face, deviation from reference",
    image_size: { width: opts.size, height: opts.size },
    no_background: opts.noBackground ?? opts.assetType === "sprite",
    outline: opts.outline,
    shading: opts.shading,
    detail: opts.detail,
    init_image: { type: "base64", base64: resizedInit },
    // 90 (de 0-100) força init_image dominar — preserva identidade do concept.
    init_image_strength: Math.round(opts.initStrength ?? 90),
    // 3 (de 1-20) reduz peso do prompt textual — o concept é a verdade.
    text_guidance_scale: opts.textGuidanceScale ?? 3,
  };

  const res = await pixellabFetch(`${keys.pixellabUrl}/generate-image-bitforge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${keys.pixellab}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pixellab bitforge ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as any;
  const base64 = json?.image?.base64;
  if (!base64) throw new Error("Pixellab bitforge: resposta sem imagem base64");

  const bytes = base64ToBytes(base64);
  const id = uid();
  const filename = `${id}.png`;
  const subfolder =
    opts.assetType === "sprite"
      ? "sprite"
      : opts.assetType === "tile"
        ? "tile"
        : "concept";

  const filePath = await invoke<string>("save_binary_asset", {
    projectId: opts.projectId,
    subfolder,
    filename,
    bytes: Array.from(bytes),
  });

  const asset = await assetsRepo.create({
    id,
    project_id: opts.projectId,
    asset_type: opts.assetType,
    file_path: filePath,
    file_name: filename,
    prompt: opts.prompt,
    prompt_hash: hash,
    generator: "pixellab",
    status: "generated",
    file_size_bytes: bytes.length,
    generation_metadata: JSON.stringify({
      kind: "bitforge",
      size: opts.size,
      init_strength: Math.round(opts.initStrength ?? 90),
      text_guidance_scale: opts.textGuidanceScale ?? 3,
      outline: opts.outline ?? null,
      shading: opts.shading ?? null,
      detail: opts.detail ?? null,
      ...(opts.extraMetadata ?? {}),
    }),
    iteration_count: 1,
  });

  return { asset, cached: false };
}

/**
 * Redimensiona um PNG (base64 puro, sem prefixo `data:`) para width×height
 * via canvas no renderer. Usado pelo bitforge para garantir que init_image
 * tenha o mesmo tamanho do output (Pixellab exige match exato).
 *
 * Nota: usa interpolação default do canvas (bilinear). Para pixelart fina
 * isso pode borrar — mas como o init_image é apenas guia de identidade
 * para o modelo, não vai aparecer no resultado final.
 */
async function resizeBase64ToSize(
  base64: string,
  width: number,
  height: number
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("resizeBase64ToSize requer ambiente browser (canvas)");
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = (e) => reject(e);
    i.src = `data:image/png;base64,${base64}`;
  });
  // Se já está no tamanho correto, retorna sem modificar
  if (img.width === width && img.height === height) return base64;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context indisponível");
  // Para downscale grande (1024 → 64), usa filtro de qualidade alta
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/png");
  // Strip do prefixo "data:image/png;base64,"
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

async function mergeBase64Horizontal(frames: string[]): Promise<string> {
  // Só disponível no renderer (tem document/canvas). Usa ImageBitmap.
  if (typeof document === "undefined") {
    throw new Error("mergeBase64Horizontal requer ambiente browser");
  }
  const imgs = await Promise.all(
    frames.map(
      (b64) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `data:image/png;base64,${b64}`;
        })
    )
  );
  const w = imgs[0]!.width;
  const h = imgs[0]!.height;
  const canvas = document.createElement("canvas");
  canvas.width = w * imgs.length;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  imgs.forEach((img, i) => ctx.drawImage(img, i * w, 0));
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1] ?? "";
}
