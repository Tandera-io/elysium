import Anthropic from '@anthropic-ai/sdk';
import { Hono } from 'hono';
import type {
  DialogueMemoryEntry,
  DialogueRequest,
  DialogueResponse,
  NpcDef,
  NpcEmotion,
} from '@elysium/shared';
import { env } from '../lib/env.js';
import { NpcLoader } from '../lib/npc-loader.js';
import { NpcMemory } from '../lib/npc-memory.js';

const EMOTIONS: readonly NpcEmotion[] = ['neutral', 'happy', 'annoyed', 'sad', 'excited'];

/** Minimal Anthropic-shaped client for tests to mock. */
export interface DialogueLlm {
  generate(args: {
    system: string;
    userMessage: string;
    model: string;
    maxTokens: number;
  }): Promise<string>;
}

function makeRealLlm(apiKey: string): DialogueLlm {
  const client = new Anthropic({ apiKey });
  return {
    async generate({ system, userMessage, model, maxTokens }) {
      const resp = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMessage }],
      });
      const out: string[] = [];
      for (const block of resp.content) {
        if (block.type === 'text') out.push(block.text);
      }
      return out.join('\n');
    },
  };
}

interface RoutesDeps {
  loader?: NpcLoader;
  memory?: NpcMemory;
  llm?: DialogueLlm;
  /** Skip persistence (used by tests). */
  noPersist?: boolean;
}

export function buildDialogueRoutes(deps: RoutesDeps = {}): Hono {
  const app = new Hono();
  const loader = deps.loader ?? new NpcLoader();
  const memory = deps.memory ?? new NpcMemory();
  const llm = deps.llm ?? (env.ANTHROPIC_API_KEY ? makeRealLlm(env.ANTHROPIC_API_KEY) : null);

  app.get('/npcs', async (c) => {
    const npcs = await loader.list();
    return c.json({ npcs });
  });

  app.post('/dialogue', async (c) => {
    if (!llm) {
      return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 503);
    }
    let body: DialogueRequest;
    try {
      body = (await c.req.json()) as DialogueRequest;
    } catch {
      return c.json({ error: 'invalid JSON body' }, 400);
    }
    if (!body.npcId || !body.playerInput) {
      return c.json({ error: 'npcId and playerInput required' }, 400);
    }

    const npc = (await loader.load(body.npcId)) as NpcDefExtended | null;
    if (!npc) return c.json({ error: `unknown npc: ${body.npcId}` }, 404);

    const recent = await memory.readRecent(body.npcId, 20);
    const systemPrompt = buildSystemPrompt(npc, recent, body.worldContext);

    let raw: string;
    try {
      raw = await llm.generate({
        system: systemPrompt,
        userMessage: body.playerInput,
        model: env.NPC_LLM_MODEL,
        maxTokens: 512,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: 'llm call failed', detail: message }, 502);
    }

    const parsed = parseLlmJson(raw);
    if (!parsed) {
      return c.json({ error: 'llm returned non-JSON', raw }, 502);
    }

    if (!deps.noPersist) {
      const entry: DialogueMemoryEntry = {
        t: new Date().toISOString(),
        type: 'dialogue',
        with: 'player',
        summary: parsed.memorySummary,
        sentiment: clamp(
          parsed.emotion === 'happy' || parsed.emotion === 'excited'
            ? 0.5
            : parsed.emotion === 'annoyed' || parsed.emotion === 'sad'
              ? -0.5
              : 0,
          -1,
          1,
        ),
      };
      await memory.append(body.npcId, entry);
    }

    return c.json(parsed);
  });

  return app;
}

/** Extended NpcDef that may carry optional dialogue_hints from JSON */
interface NpcDefExtended extends NpcDef {
  dialogue_hints?: {
    greeting?: string;
    shop_context?: string;
    buy_seeds_hint?: string;
    sell_crops_hint?: string;
    farewell_hint?: string;
    [key: string]: string | undefined;
  };
}

function buildSystemPrompt(
  npc: NpcDefExtended,
  recent: DialogueMemoryEntry[],
  world: { hour: number; dayInSeason: number; season: string; year: number; weather?: string },
): string {
  const memorySection =
    recent.length === 0
      ? '(sem memórias anteriores deste jogador)'
      : recent
          .map((m) => `- [${m.t.slice(0, 10)}] ${m.summary} (sentimento ${m.sentiment.toFixed(2)})`)
          .join('\n');

  // Build optional shop/dialogue context section from dialogue_hints
  let shopSection = '';
  if (npc.dialogue_hints) {
    const hints = npc.dialogue_hints;
    const lines: string[] = [];
    if (hints.shop_context) lines.push(`Contexto da loja: ${hints.shop_context}`);
    if (hints.buy_seeds_hint) lines.push(`Dica (compra de sementes): ${hints.buy_seeds_hint}`);
    if (hints.sell_crops_hint) lines.push(`Dica (venda de colheita): ${hints.sell_crops_hint}`);
    if (hints.farewell_hint) lines.push(`Dica (despedida): ${hints.farewell_hint}`);
    if (lines.length > 0) {
      shopSection = `\nInformações do seu negócio:\n${lines.join('\n')}\n`;
    }
  }

  return `Você é ${npc.name}, ${npc.role}. Esta é a sua personalidade:

Traços: ${npc.personality.core_traits.join(', ')}.
Estilo de fala: ${npc.personality.speech_style}.
Valores: ${npc.personality.values.join(', ')}.
Medos: ${npc.personality.fears.join(', ')}.
${shopSection}
Memórias recentes desta pessoa:
${memorySection}

Contexto do mundo agora:
- Ano ${world.year}, ${world.season}, dia ${world.dayInSeason}, hora ${world.hour.toFixed(1)}h
${world.weather ? `- Tempo: ${world.weather}` : ''}

REGRAS DE RESPOSTA:
1. Fale APENAS como ${npc.name} falaria. Mantenha o estilo, valores e medos.
2. Seja conciso: 1-3 frases curtas.
3. Se as memórias forem relevantes, referencie-as naturalmente.
4. Responda em português brasileiro coloquial.
5. Se o jogador perguntar sobre comprar sementes ou vender colheita, use actionHint "open_shop".
6. Retorne EXCLUSIVAMENTE um objeto JSON válido (sem markdown, sem prefixo) com este formato:
{
  "npcReply": "<a fala em pt-BR>",
  "emotion": "<neutral|happy|annoyed|sad|excited>",
  "memorySummary": "<resumo curto da interação para registrar na memória>",
  "actionHint": null
}`;
}

function parseLlmJson(text: string): DialogueResponse | null {
  // Strip common code-fence wrappers
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }
  // Find first { and last } as a fallback
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice) as Partial<DialogueResponse>;
    if (typeof obj.npcReply !== 'string') return null;
    const emotion: NpcEmotion = EMOTIONS.includes(obj.emotion as NpcEmotion)
      ? (obj.emotion as NpcEmotion)
      : 'neutral';
    return {
      npcReply: obj.npcReply,
      emotion,
      memorySummary: typeof obj.memorySummary === 'string' ? obj.memorySummary : '',
      actionHint: obj.actionHint ?? null,
    };
  } catch {
    return null;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
