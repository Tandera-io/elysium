import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { HealthResponse } from '@elysium/shared';
import { env } from './lib/env.js';
import { buildDialogueRoutes } from './routes/dialogue.js';
import { buildMeshyRoutes } from './routes/meshy.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  }),
);

app.route('/api/meshy', buildMeshyRoutes());
app.route('/api', buildDialogueRoutes());

app.get('/api/health', (c) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'elysium-server',
    version: '0.0.1',
    timestamp: new Date().toISOString(),
    hasMeshyKey: env.MESHY_API_KEY.length > 0,
    hasAnthropicKey: env.ANTHROPIC_API_KEY.length > 0,
    npcModel: env.NPC_LLM_MODEL,
  };
  return c.json(body);
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  console.info(`[server] Elysium server listening on http://localhost:${port}`);
});

export { app };
