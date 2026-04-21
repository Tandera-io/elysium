// Cliente ElevenLabs: SFX e música.
// Endpoints: /sound-generation, /music (compose), /text-to-speech

import { fetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { assetsRepo, uid } from "../db";
import { getApiKeys } from "./env";
import type { AssetType, GeneratedAsset } from "@/types/domain";

export type ElevenLabsKind = "music" | "sfx" | "audio";

export interface ElevenLabsGenerateOptions {
  projectId: string;
  prompt: string;
  kind: ElevenLabsKind;
  durationSeconds?: number;
  force?: boolean;
}

export interface ElevenLabsResult {
  asset: GeneratedAsset;
  cached: boolean;
}

export async function generateElevenLabs(
  opts: ElevenLabsGenerateOptions
): Promise<ElevenLabsResult> {
  const keys = await getApiKeys();
  if (!keys.elevenlabs)
    throw new Error("ELEVENLABS_API_KEY não configurada");

  const hash = await invoke<string>("compute_prompt_hash", {
    prompt: opts.prompt,
    generator: "elevenlabs",
    kind: opts.kind,
  });

  if (!opts.force) {
    const cached = await assetsRepo.findByPromptHash(opts.projectId, hash);
    if (cached) return { asset: cached, cached: true };
  }

  const id = uid();
  const subfolder = "audio";
  let endpoint: string;
  let body: any;
  let filename: string;

  if (opts.kind === "music") {
    endpoint = `${keys.elevenlabsUrl}/music`;
    body = {
      prompt: opts.prompt,
      music_length_ms: Math.round((opts.durationSeconds ?? 30) * 1000),
    };
    filename = `${id}.mp3`;
  } else {
    endpoint = `${keys.elevenlabsUrl}/sound-generation`;
    body = {
      text: opts.prompt,
      duration_seconds: opts.durationSeconds ?? 5,
      prompt_influence: 0.7,
    };
    filename = `${id}.mp3`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": keys.elevenlabs,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${text.slice(0, 500)}`);
  }

  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const filePath = await invoke<string>("save_binary_asset", {
    projectId: opts.projectId,
    subfolder,
    filename,
    bytes: Array.from(bytes),
  });

  const assetType: AssetType =
    opts.kind === "music" ? "music" : opts.kind === "sfx" ? "sfx" : "audio";

  const asset = await assetsRepo.create({
    id,
    project_id: opts.projectId,
    asset_type: assetType,
    file_path: filePath,
    file_name: filename,
    prompt: opts.prompt,
    prompt_hash: hash,
    generator: "elevenlabs",
    status: "generated",
    file_size_bytes: bytes.length,
    generation_metadata: JSON.stringify({
      durationSeconds: opts.durationSeconds ?? null,
    }),
    iteration_count: 1,
  });

  return { asset, cached: false };
}
