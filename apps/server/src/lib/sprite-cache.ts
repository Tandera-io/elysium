import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Content-addressed cache for 2D sprites (PNG).
 * Parallel to AssetCache but the file lives under apps/client/public/sprites/cache/.
 */

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_DIR = resolve(here, '../../../../apps/client/public/sprites/cache');

export interface SpriteCacheKey {
  prompt: string;
  size?: string;
}

export interface SpriteManifest {
  id: string;
  prompt: string;
  size: string;
  png_path: string;
  created_at: string;
}

export class SpriteCache {
  private readonly cacheDir: string;
  constructor(cacheDir: string = DEFAULT_CACHE_DIR) {
    this.cacheDir = cacheDir;
  }

  static hashKey(key: SpriteCacheKey): string {
    const normalized = `${key.prompt.trim().toLowerCase()}|${key.size ?? '1024x1024'}`;
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  paths(key: SpriteCacheKey): { id: string; png: string; manifest: string; pngRel: string } {
    const id = SpriteCache.hashKey(key);
    return {
      id,
      png: join(this.cacheDir, `${id}.png`),
      manifest: join(this.cacheDir, `${id}.json`),
      pngRel: `sprites/cache/${id}.png`,
    };
  }

  has(key: SpriteCacheKey): boolean {
    return existsSync(this.paths(key).manifest);
  }

  async read(key: SpriteCacheKey): Promise<SpriteManifest | null> {
    const { manifest } = this.paths(key);
    if (!existsSync(manifest)) return null;
    const text = await readFile(manifest, 'utf-8');
    return JSON.parse(text) as SpriteManifest;
  }

  async ensureDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  async writeManifest(manifest: SpriteManifest): Promise<void> {
    await this.ensureDir();
    const path = this.paths({
      prompt: manifest.prompt,
      size: manifest.size,
    }).manifest;
    await writeFile(path, JSON.stringify(manifest, null, 2));
  }
}
