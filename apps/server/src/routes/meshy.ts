import { Hono } from 'hono';
import { AssetCache, type AssetManifest } from '../lib/asset-cache.js';
import { env } from '../lib/env.js';
import { MeshyClient } from '../lib/meshy-client.js';

interface GenerateBody {
  prompt: string;
  mode?: 'preview' | 'refine';
  art_style?: 'realistic';
  preview_task_id?: string;
}

export function buildMeshyRoutes(deps: { meshy?: MeshyClient; cache?: AssetCache } = {}): Hono {
  const app = new Hono();
  const cache = deps.cache ?? new AssetCache();
  const client =
    deps.meshy ?? (env.MESHY_API_KEY ? new MeshyClient({ apiKey: env.MESHY_API_KEY }) : null);

  app.get('/cache', async (c) => {
    const items: string[] = [];
    return c.json({ items });
  });

  app.post('/generate', async (c) => {
    if (!client) {
      return c.json({ error: 'MESHY_API_KEY not configured' }, 503);
    }
    const body = (await c.req.json()) as GenerateBody;
    if (!body.prompt || body.prompt.trim().length < 4) {
      return c.json({ error: 'prompt is required (min 4 chars)' }, 400);
    }

    const key = { prompt: body.prompt, mode: body.mode, art_style: body.art_style };
    const cached = await cache.read(key);
    if (cached) {
      return c.json({ cached: true, manifest: cached });
    }

    try {
      const taskId = await client.createTextTo3DTask({
        prompt: body.prompt,
        mode: body.mode ?? 'preview',
        art_style: body.art_style ?? 'realistic',
        preview_task_id: body.preview_task_id,
      });
      const final = await client.pollUntilDone(taskId);
      const { glb, glbRel } = cache.paths(key);
      await cache.ensureDir();
      await client.downloadResult(final, glb);
      const manifest: AssetManifest = {
        id: AssetCache.hashKey(key),
        prompt: body.prompt,
        mode: body.mode ?? 'preview',
        art_style: body.art_style ?? 'realistic',
        meshy_task_id: taskId,
        glb_path: glbRel,
        created_at: new Date().toISOString(),
        thumbnail_url: final.thumbnail_url,
      };
      await cache.writeManifest(manifest);
      return c.json({ cached: false, manifest });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: 'meshy generation failed', detail: message }, 502);
    }
  });

  return app;
}
