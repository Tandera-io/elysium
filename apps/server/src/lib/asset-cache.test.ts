import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AssetCache, type AssetManifest } from './asset-cache';

describe('AssetCache', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'elysium-cache-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('hashes the same key consistently', () => {
    const a = AssetCache.hashKey({ prompt: 'baker', mode: 'preview', art_style: 'cartoon' });
    const b = AssetCache.hashKey({ prompt: 'baker', mode: 'preview', art_style: 'cartoon' });
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  it('hashes different keys to different ids', () => {
    const a = AssetCache.hashKey({ prompt: 'baker' });
    const b = AssetCache.hashKey({ prompt: 'blacksmith' });
    expect(a).not.toBe(b);
  });

  it('is case- and whitespace-insensitive on the prompt', () => {
    const a = AssetCache.hashKey({ prompt: 'BAKER ' });
    const b = AssetCache.hashKey({ prompt: 'baker' });
    expect(a).toBe(b);
  });

  it('has() returns false for missing keys', () => {
    const cache = new AssetCache(dir);
    expect(cache.has({ prompt: 'never-generated' })).toBe(false);
  });

  it('persists and reads back a manifest', async () => {
    const cache = new AssetCache(dir);
    const manifest: AssetManifest = {
      id: AssetCache.hashKey({ prompt: 'tomato plant' }),
      prompt: 'tomato plant',
      mode: 'preview',
      art_style: 'realistic',
      meshy_task_id: 'task_xyz',
      glb_path: 'assets/cache/abc.glb',
      created_at: new Date().toISOString(),
    };
    await cache.writeManifest(manifest);
    expect(cache.has({ prompt: 'tomato plant' })).toBe(true);
    const back = await cache.read({ prompt: 'tomato plant' });
    expect(back).toEqual(manifest);
  });

  it('paths() builds glb_path relative to public/', () => {
    const cache = new AssetCache(dir);
    const p = cache.paths({ prompt: 'wheat' });
    expect(p.glbRel).toMatch(/^assets\/cache\/.+\.glb$/);
    expect(p.glb).toContain(dir);
  });
});
