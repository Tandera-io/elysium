// Cliente OpenAI gpt-image-1 para geração de concept arts em batch.
//
// Endpoint: POST https://api.openai.com/v1/images/generations
// Model: gpt-image-1 (aka gpt-image-1.5)
// Quality: "low" | "medium" | "high"  (preços aprox: $0.02 / $0.07 / $0.19)
// Sizes: "1024x1024" | "1024x1536" | "1536x1024"
//
// Resposta: { data: [{ b64_json, revised_prompt? }] }

import { fetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { assetsRepo, uid } from "../db";
import { getApiKeys } from "./env";
import type { OpenAiImageSize } from "../conceptPrompts";
import type { AssetJobTier } from "@/types/domain";
import type { GeneratedAsset } from "@/types/domain";

const ENDPOINT = "https://api.openai.com/v1/images/generations";
const IMAGE_MODEL = "gpt-image-1";

export interface OpenAiImageOptions {
  projectId: string;
  prompt: string;
  quality: AssetJobTier; // high | medium | low
  size?: OpenAiImageSize;
  canonSlug?: string;
  extraMetadata?: Record<string, unknown>;
  /** Se true, ignora cache por prompt_hash e sempre gera novamente. */
  force?: boolean;
}

export interface OpenAiImageResult {
  asset: GeneratedAsset;
  cached: boolean;
  revisedPrompt?: string;
}

export class OpenAiImageError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retriable?: boolean
  ) {
    super(message);
    this.name = "OpenAiImageError";
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function generateOpenAiImage(
  opts: OpenAiImageOptions
): Promise<OpenAiImageResult> {
  const keys = await getApiKeys();
  if (!keys.openai) throw new OpenAiImageError("OPENAI_API_KEY não configurada", undefined, false);

  const hash = await invoke<string>("compute_prompt_hash", {
    prompt: opts.prompt,
    generator: "openai",
    kind: "concept_art",
  });

  if (!opts.force) {
    const cached = await assetsRepo.findByPromptHash(opts.projectId, hash);
    if (cached) return { asset: cached, cached: true };
  }

  const body = {
    model: IMAGE_MODEL,
    prompt: opts.prompt,
    n: 1,
    size: opts.size ?? "1024x1024",
    quality: opts.quality,
  };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys.openai}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    // network error: retriable
    throw new OpenAiImageError(`network: ${String(e?.message ?? e)}`, undefined, true);
  }

  if (!res.ok) {
    const text = await res.text();
    const retriable = res.status === 429 || res.status >= 500;
    throw new OpenAiImageError(
      `OpenAI ${res.status}: ${text.slice(0, 400)}`,
      res.status,
      retriable
    );
  }

  const json = (await res.json()) as any;
  const data = json?.data?.[0];
  if (!data?.b64_json) {
    throw new OpenAiImageError("OpenAI: resposta sem b64_json", undefined, true);
  }

  const bytes = base64ToBytes(data.b64_json);
  const id = uid();
  const filename = `${id}.png`;

  const filePath = await invoke<string>("save_binary_asset", {
    projectId: opts.projectId,
    subfolder: "concept",
    filename,
    bytes: Array.from(bytes),
  });

  const asset = await assetsRepo.create({
    id,
    project_id: opts.projectId,
    asset_type: "concept_art",
    file_path: filePath,
    file_name: filename,
    prompt: opts.prompt,
    prompt_hash: hash,
    generator: "openai",
    status: "generated",
    file_size_bytes: bytes.length,
    generation_metadata: JSON.stringify({
      model: IMAGE_MODEL,
      quality: opts.quality,
      size: body.size,
      canon_slug: opts.canonSlug,
      revised_prompt: data.revised_prompt,
      ...(opts.extraMetadata ?? {}),
    }),
    iteration_count: 1,
  });

  return { asset, cached: false, revisedPrompt: data.revised_prompt };
}
