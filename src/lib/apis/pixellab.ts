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

  const res = await fetch(`${keys.pixellabUrl}/generate-image-pixflux`, {
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

  const res = await fetch(`${keys.pixellabUrl}/animate-with-skeleton`, {
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
