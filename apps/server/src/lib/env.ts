import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Locate the Elysium repo root by walking up looking for pnpm-workspace.yaml.
 * Falls back to the current file's dir if not found.
 */
function findElysiumRoot(start: string): string {
  let cursor = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(cursor, 'pnpm-workspace.yaml'))) return cursor;
    const parent = resolve(cursor, '..');
    if (parent === cursor) break;
    cursor = parent;
  }
  return start;
}

const elysiumRoot = findElysiumRoot(here);

// Cascade order (nearest wins). dotenv's default is override:false so the
// first .env that defines a key locks it; later files only fill in gaps.
//   1. elysium/.env       — Elysium-specific overrides (e.g. PORT=3001)
//   2. ../.env            — NGS 2.0 root (shares MESHY_API_KEY, ANTHROPIC_API_KEY)
const candidates = [join(elysiumRoot, '.env'), resolve(elysiumRoot, '..', '.env')];

const loadedPaths: string[] = [];
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    config({ path: candidate, override: false });
    loadedPaths.push(candidate);
  }
}

if (loadedPaths.length > 0) {
  console.info(`[env] Loaded ${loadedPaths.length} file(s): ${loadedPaths.join(' + ')}`);
} else {
  console.warn('[env] No .env file found — relying on shell env only');
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  MESHY_API_KEY: process.env.MESHY_API_KEY ?? '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  NPC_LLM_MODEL: process.env.NPC_LLM_MODEL ?? 'claude-haiku-4-5-20251001',
  NPC_LLM_MODEL_PREMIUM: process.env.NPC_LLM_MODEL_PREMIUM ?? 'claude-sonnet-4-6',
  PORT: num(process.env.PORT, 3001),
  LOADED_FROM: loadedPaths,
} as const;
