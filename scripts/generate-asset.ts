#!/usr/bin/env tsx
/**
 * Generate a 3D asset via Meshy by hitting the local server.
 *
 *   pnpm asset:generate --prompt "stylized cartoon baker character ..." --name marina
 *
 * Requires the server to be running (`pnpm dev:server`).
 */

interface Args {
  prompt: string;
  name?: string;
  mode?: 'preview' | 'refine';
  art_style?: 'realistic';
  host?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { host: 'http://localhost:3001' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (!k || !k.startsWith('--')) continue;
    const key = k.slice(2) as keyof Args;
    if (v === undefined || v.startsWith('--')) {
      // boolean flag — unused here
      continue;
    }
    (out as Record<string, string>)[key] = v;
    i++;
  }
  if (!out.prompt) {
    throw new Error(
      'Usage: pnpm asset:generate --prompt "<text>" [--name <id>] [--mode preview|refine] [--art_style cartoon|realistic|...]',
    );
  }
  return out as Args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const url = `${args.host}/api/meshy/generate`;
  console.info(`[asset:generate] POST ${url}`);
  console.info(`[asset:generate] prompt: ${JSON.stringify(args.prompt)}`);

  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: args.prompt,
      mode: args.mode ?? 'preview',
      art_style: args.art_style ?? 'realistic',
    }),
  });

  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[asset:generate] FAILED (${res.status}) after ${dt}s: ${text}`);
    process.exit(1);
  }

  const data = (await res.json()) as {
    cached: boolean;
    manifest: { id: string; glb_path: string; meshy_task_id: string };
  };

  console.info(
    `[asset:generate] ${data.cached ? 'CACHE HIT' : 'SUCCESS'} in ${dt}s — id=${data.manifest.id} glb=${data.manifest.glb_path}`,
  );

  if (args.name) {
    console.info(`[asset:generate] (note) registering as '${args.name}' is a future-phase step`);
  }
}

void main().catch((err) => {
  console.error('[asset:generate] uncaught:', err);
  process.exit(1);
});
