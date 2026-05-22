import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDialogueRoutes, type DialogueLlm } from './dialogue';
import { NpcLoader } from '../lib/npc-loader';
import { NpcMemory } from '../lib/npc-memory';

const FAKE_NPC = {
  id: 'test',
  name: 'Tester',
  role: 'qa',
  personality: {
    core_traits: ['curious'],
    speech_style: 'plain',
    values: ['truth'],
    fears: ['flakes'],
  },
};

function mockLoaderReturning(def = FAKE_NPC): NpcLoader {
  const loader = new NpcLoader('/tmp/none');
  // Override list/load on the instance
  vi.spyOn(loader, 'list').mockResolvedValue([def]);
  vi.spyOn(loader, 'load').mockResolvedValue(def);
  return loader;
}

function llmReturning(text: string): DialogueLlm {
  return { generate: vi.fn().mockResolvedValue(text) };
}

describe('dialogue routes', () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await mkdtemp(join(tmpdir(), 'elysium-mem-'));
  });
  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  it('GET /npcs returns loaded NPCs', async () => {
    const app = buildDialogueRoutes({ loader: mockLoaderReturning(), llm: llmReturning('') });
    const res = await app.request('/npcs');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { npcs: { id: string }[] };
    expect(body.npcs.map((n) => n.id)).toContain('test');
  });

  it('POST /dialogue validates body', async () => {
    const app = buildDialogueRoutes({ loader: mockLoaderReturning(), llm: llmReturning('') });
    const res = await app.request('/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /dialogue 404 for unknown npc', async () => {
    const loader = new NpcLoader('/tmp/none');
    vi.spyOn(loader, 'load').mockResolvedValue(null);
    const app = buildDialogueRoutes({ loader, llm: llmReturning('{}'), noPersist: true });
    const res = await app.request('/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'ghost',
        playerInput: 'oi',
        worldContext: { hour: 10, dayInSeason: 1, season: 'spring', year: 1 },
      }),
    });
    expect(res.status).toBe(404);
  });

  it('POST /dialogue returns parsed JSON on success', async () => {
    const llmJson = JSON.stringify({
      npcReply: 'Oi! Tudo bem?',
      emotion: 'happy',
      memorySummary: 'Player cumprimentou.',
      actionHint: null,
    });
    const app = buildDialogueRoutes({
      loader: mockLoaderReturning(),
      memory: new NpcMemory(stateDir),
      llm: llmReturning(llmJson),
    });
    const res = await app.request('/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'test',
        playerInput: 'olá',
        worldContext: { hour: 10, dayInSeason: 1, season: 'spring', year: 1 },
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { npcReply: string; emotion: string };
    expect(body.npcReply).toBe('Oi! Tudo bem?');
    expect(body.emotion).toBe('happy');
  });

  it('POST /dialogue tolerates code-fence wrapped JSON', async () => {
    const raw =
      '```json\n' +
      JSON.stringify({
        npcReply: 'oi',
        emotion: 'neutral',
        memorySummary: '',
        actionHint: null,
      }) +
      '\n```';
    const app = buildDialogueRoutes({
      loader: mockLoaderReturning(),
      memory: new NpcMemory(stateDir),
      llm: llmReturning(raw),
    });
    const res = await app.request('/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'test',
        playerInput: 'olá',
        worldContext: { hour: 10, dayInSeason: 1, season: 'spring', year: 1 },
      }),
    });
    expect(res.status).toBe(200);
  });

  it('POST /dialogue persists memory across calls', async () => {
    const llmFirst = JSON.stringify({
      npcReply: 'oi',
      emotion: 'neutral',
      memorySummary: 'primeiro encontro com player',
      actionHint: null,
    });
    const llmSecond = JSON.stringify({
      npcReply: 'voltou',
      emotion: 'happy',
      memorySummary: 'jogador retornou',
      actionHint: null,
    });
    const llm: DialogueLlm = { generate: vi.fn() };
    (llm.generate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(llmFirst)
      .mockResolvedValueOnce(llmSecond);

    const memory = new NpcMemory(stateDir);
    const app = buildDialogueRoutes({ loader: mockLoaderReturning(), memory, llm });
    const body = JSON.stringify({
      npcId: 'test',
      playerInput: 'olá',
      worldContext: { hour: 10, dayInSeason: 1, season: 'spring', year: 1 },
    });

    await app.request('/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    await app.request('/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    expect(await memory.countEntries('test')).toBe(2);

    // Second invocation should have seen the first memory in the system prompt
    const firstCall = (llm.generate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const secondCall = (llm.generate as ReturnType<typeof vi.fn>).mock.calls[1]?.[0];
    expect(firstCall.system).toContain('sem memórias anteriores');
    expect(secondCall.system).toContain('primeiro encontro com player');
  });
});
