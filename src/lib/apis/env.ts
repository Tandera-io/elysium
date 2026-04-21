// Helpers para ler chaves do `.env` via Vite (VITE_* prefix) OU do settings do app.

import { settingsRepo } from "../db";

export interface ApiKeys {
  pixellab: string | null;
  pixellabUrl: string;
  elevenlabs: string | null;
  elevenlabsUrl: string;
  openai: string | null;
  openaiModel: string | null;
  asepritePath: string | null;
}

const FALLBACKS = {
  pixellabUrl: "https://api.pixellab.ai/v1",
  elevenlabsUrl: "https://api.elevenlabs.io/v1",
};

let cache: ApiKeys | null = null;

export async function getApiKeys(force = false): Promise<ApiKeys> {
  if (cache && !force) return cache;

  const settings = await settingsRepo.all().catch(() => ({} as Record<string, string>));

  const env = import.meta.env as Record<string, string | undefined>;
  const keys: ApiKeys = {
    pixellab:
      settings["pixellab_api_key"] ??
      env.VITE_PIXELLAB_API_KEY ??
      env.PIXELLAB_API_KEY ??
      null,
    pixellabUrl:
      settings["pixellab_api_url"] ??
      env.VITE_PIXELLAB_API_URL ??
      env.PIXELLAB_API_URL ??
      FALLBACKS.pixellabUrl,
    elevenlabs:
      settings["elevenlabs_api_key"] ??
      env.VITE_ELEVENLABS_API_KEY ??
      env.ELEVENLABS_API_KEY ??
      null,
    elevenlabsUrl:
      settings["elevenlabs_api_url"] ??
      env.VITE_ELEVENLABS_API_URL ??
      env.ELEVENLABS_API_URL ??
      FALLBACKS.elevenlabsUrl,
    openai:
      settings["openai_api_key"] ??
      env.VITE_OPENAI_API_KEY ??
      env.OPENAI_API_KEY ??
      null,
    openaiModel:
      settings["openai_model"] ??
      env.VITE_OPENAI_MODEL ??
      env.OPENAI_MODEL ??
      "gpt-4o-mini",
    asepritePath:
      settings["aseprite_path"] ??
      env.VITE_ASEPRITE_PATH ??
      env.ASEPRITE_PATH ??
      null,
  };

  cache = keys;
  return keys;
}

export function invalidateKeyCache() {
  cache = null;
}
