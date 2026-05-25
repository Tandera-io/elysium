import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { env } from '../lib/env.js';
import {
  OpenAIImageClient,
  type ImageBackground,
  type ImageSize,
} from '../lib/openai-image-client.js';
import { SpriteCache, type SpriteManifest } from '../lib/sprite-cache.js';

const here = dirname(fileURLToPath(import.meta.url));
// elysium/apps/server/src/routes → elysium/apps/client/public
const PUBLIC_ROOT = resolve(here, '../../../../apps/client/public');

interface GenerateBody {
  prompt: string;
  size?: ImageSize;
  background?: ImageBackground;
  /** If set, runs /images/edits using this PNG (path relative to public/) as the reference. */
  base?: string;
}

export function buildSpriteRoutes(
  deps: { cache?: SpriteCache; client?: OpenAIImageClient | null } = {},
): Hono {
  const app = new Hono();
  const cache = deps.cache ?? new SpriteCache();
  const client =
    deps.client ??
    (env.OPENAI_API_KEY ? new OpenAIImageClient({ apiKey: env.OPENAI_API_KEY }) : null);

  app.post('/generate', async (c) => {
    if (!client) {
      return c.json({ error: 'OPENAI_API_KEY not configured' }, 503);
    }
    const body = (await c.req.json()) as GenerateBody;
    if (!body.prompt || body.prompt.trim().length < 4) {
      return c.json({ error: 'prompt is required (min 4 chars)' }, 400);
    }

    // Cache key also includes the base image (if any), so edits get distinct entries
    const key = {
      prompt: body.prompt + (body.base ? `|base:${body.base}` : ''),
      size: body.size ?? '1024x1024',
      background: body.background ?? 'transparent',
    };
    const cached = await cache.read(key);
    if (cached) {
      return c.json({ cached: true, manifest: cached });
    }

    try {
      const { png, pngRel } = cache.paths(key);
      await cache.ensureDir();

      if (body.base) {
        const baseAbs = join(PUBLIC_ROOT, body.base);
        if (!existsSync(baseAbs)) {
          return c.json({ error: `base image not found: ${body.base}` }, 400);
        }
        await client.editImageToFile(
          {
            prompt: body.prompt,
            baseImagePath: baseAbs,
            size: body.size,
            background: body.background,
          },
          png,
        );
      } else {
        await client.generateImageToFile(
          { prompt: body.prompt, size: body.size, background: body.background },
          png,
        );
      }

      const manifest: SpriteManifest = {
        id: SpriteCache.hashKey(key),
        prompt: body.prompt,
        size: body.size ?? '1024x1024',
        background: body.background ?? 'transparent',
        png_path: pngRel,
        created_at: new Date().toISOString(),
      };
      await cache.writeManifest(manifest);
      return c.json({ cached: false, manifest });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: 'openai sprite generation failed', detail: message }, 502);
    }
  });

  return app;
}
