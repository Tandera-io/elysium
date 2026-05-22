import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Content-addressed cache for generated assets.
 * Key is sha256(prompt + mode + art_style). Avoids regenerating identical prompts.
 */

const here = dirname(fileURLToPath(import.meta.url));
// elysium/apps/server/src/lib  →  elysium/apps/client/public/assets/cache
const DEFAULT_CACHE_DIR = resolve(here, '../../../../apps/client/public/assets/cache');

export interface CacheKey {
  prompt: string;
  mode?: string;
  art_style?: string;
}

export interface AssetManifest {
  id: string;
  prompt: string;
  mode: string;
  art_style: string;
  meshy_task_id: string;
  glb_path: string; // relative to public/
  created_at: string;
  thumbnail_url?: string;
}

export class AssetCache {
  private readonly cacheDir: string;

  constructor(cacheDir: string = DEFAULT_CACHE_DIR) {
    this.cacheDir = cacheDir;
  }

  static hashKey(key: CacheKey): string {
    const normalized = `${key.prompt.trim().toLowerCase()}|${key.mode ?? 'preview'}|${key.art_style ?? 'realistic'}`;
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  paths(key: CacheKey): { id: string; glb: string; manifest: string; glbRel: string } {
    const id = AssetCache.hashKey(key);
    return {
      id,
      glb: join(this.cacheDir, `${id}.glb`),
      manifest: join(this.cacheDir, `${id}.json`),
      glbRel: `assets/cache/${id}.glb`,
    };
  }

  has(key: CacheKey): boolean {
    return existsSync(this.paths(key).manifest);
  }

  async read(key: CacheKey): Promise<AssetManifest | null> {
    const { manifest } = this.paths(key);
    if (!existsSync(manifest)) return null;
    const text = await readFile(manifest, 'utf-8');
    return JSON.parse(text) as AssetManifest;
  }

  async ensureDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  async writeManifest(manifest: AssetManifest): Promise<void> {
    await this.ensureDir();
    const path = this.paths({
      prompt: manifest.prompt,
      mode: manifest.mode,
      art_style: manifest.art_style,
    }).manifest;
    await writeFile(path, JSON.stringify(manifest, null, 2));
  }
}
