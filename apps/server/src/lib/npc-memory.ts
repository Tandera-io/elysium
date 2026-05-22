import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DialogueMemoryEntry } from '@elysium/shared';

const here = dirname(fileURLToPath(import.meta.url));
// elysium/apps/server/src/lib  →  elysium/.elysium-state/npcs
const DEFAULT_STATE_DIR = resolve(here, '../../../../.elysium-state/npcs');

export class NpcMemory {
  private readonly baseDir: string;

  constructor(baseDir: string = DEFAULT_STATE_DIR) {
    this.baseDir = baseDir;
  }

  private fileFor(npcId: string): string {
    return join(this.baseDir, npcId, 'memory.jsonl');
  }

  async ensureNpcDir(npcId: string): Promise<void> {
    const dir = join(this.baseDir, npcId);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }

  async append(npcId: string, entry: DialogueMemoryEntry): Promise<void> {
    await this.ensureNpcDir(npcId);
    await appendFile(this.fileFor(npcId), JSON.stringify(entry) + '\n', 'utf-8');
  }

  async readRecent(npcId: string, n: number): Promise<DialogueMemoryEntry[]> {
    const path = this.fileFor(npcId);
    if (!existsSync(path)) return [];
    const text = await readFile(path, 'utf-8');
    const lines = text
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);
    const tail = lines.slice(-n);
    return tail
      .map((l) => {
        try {
          return JSON.parse(l) as DialogueMemoryEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is DialogueMemoryEntry => e !== null);
  }

  async countEntries(npcId: string): Promise<number> {
    const path = this.fileFor(npcId);
    if (!existsSync(path)) return 0;
    const text = await readFile(path, 'utf-8');
    return text.split('\n').filter((l) => l.length > 0).length;
  }
}
