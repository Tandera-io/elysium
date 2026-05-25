#!/usr/bin/env tsx
/**
 * Generate a pixel-art sprite via OpenAI Images API.
 *
 *   pnpm sprite:generate --prompt "Stardew-style pixel art ..." --name player
 *
 * Requires the server to be running (`pnpm dev:server`).
 */

interface Args {
  prompt: string;
  name?: string;
  size?: string;
  host?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { host: 'http://localhost:3001' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (!k || !k.startsWith('--')) continue;
    const key = k.slice(2) as keyof Args;
    if (v === undefined || v.startsWith('--')) continue;
    (out as Record<string, string>)[key] = v;
    i++;
  }
  if (!out.prompt) {
    throw new Error(
      'Usage: pnpm sprite:generate --prompt "<text>" [--name <id>] [--size 1024x1024]',
    );
  }
  return out as Args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const url = `${args.host}/api/sprite/generate`;
  console.info(`[sprite:generate] POST ${url}`);
  console.info(`[sprite:generate] prompt: ${JSON.stringify(args.prompt)}`);

  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: args.prompt, size: args.size }),
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[sprite:generate] FAILED (${res.status}) after ${dt}s: ${text}`);
    process.exit(1);
  }

  const data = (await res.json()) as {
    cached: boolean;
    manifest: { id: string; png_path: string };
  };
  console.info(
    `[sprite:generate] ${data.cached ? 'CACHE HIT' : 'SUCCESS'} in ${dt}s — id=${data.manifest.id} png=${data.manifest.png_path}`,
  );
  if (args.name) {
    console.info(
      `[sprite:generate] suggested registry entry:  ${args.name}: '${data.manifest.png_path}'`,
    );
  }
}

void main().catch((err) => {
  console.error('[sprite:generate] uncaught:', err);
  process.exit(1);
});
