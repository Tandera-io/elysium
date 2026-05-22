import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NpcDef } from '@elysium/shared';

const here = dirname(fileURLToPath(import.meta.url));
// elysium/apps/server/src/lib  →  elysium/apps/server/content/npcs
const DEFAULT_DIR = resolve(here, '../../content/npcs');

export class NpcLoader {
  private readonly dir: string;
  private cache: Map<string, NpcDef> = new Map();

  constructor(dir: string = DEFAULT_DIR) {
    this.dir = dir;
  }

  async list(): Promise<NpcDef[]> {
    if (!existsSync(this.dir)) return [];
    const files = readdirSync(this.dir).filter((f) => f.endsWith('.json'));
    const out: NpcDef[] = [];
    for (const f of files) {
      const def = await this.load(f.replace(/\.json$/, ''));
      if (def) out.push(def);
    }
    return out;
  }

  async load(id: string): Promise<NpcDef | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const path = join(this.dir, `${id}.json`);
    if (!existsSync(path)) return null;
    const text = await readFile(path, 'utf-8');
    const def = JSON.parse(text) as NpcDef;
    this.cache.set(id, def);
    return def;
  }
}
