// Parser e tipos do <manifest> emitido pelo Asset Producer na Etapa 12.
//
// O Asset Producer inclui ao final do documento da Etapa 12 um bloco
// <manifest>{ "assets": [...] }</manifest> com o plano de produção. Este
// módulo extrai esse bloco, valida/normaliza e expõe tipos tipados.

export type AssetManifestKind =
  | "concept_art"
  | "sprite"
  | "tile"
  | "audio_sfx"
  | "audio_music";

export interface AssetManifestItem {
  kind: AssetManifestKind;
  name: string;
  prompt: string;
  size?: 64 | 96 | 128 | 192 | 256;
  variations?: number;
  duration_sec?: number;
  priority?: number;
}

export interface AssetManifest {
  assets: AssetManifestItem[];
}

const VISUAL_KINDS: AssetManifestKind[] = ["concept_art", "sprite", "tile"];
const AUDIO_KINDS: AssetManifestKind[] = ["audio_sfx", "audio_music"];

export function isVisualKind(k: AssetManifestKind): boolean {
  return VISUAL_KINDS.includes(k);
}

export function isAudioKind(k: AssetManifestKind): boolean {
  return AUDIO_KINDS.includes(k);
}

/**
 * Extrai o primeiro bloco <manifest>...</manifest> do documento em Markdown
 * e faz JSON.parse. Retorna null se não houver bloco ou se o JSON estiver
 * malformado.
 */
export function extractManifestFromDocument(
  docContent: string
): AssetManifest | null {
  const m = docContent.match(/<manifest>([\s\S]*?)<\/manifest>/i);
  if (!m) return null;
  const raw = m[1]?.trim();
  if (!raw) return null;
  // Tolera JSON dentro de bloco de código markdown (```json ... ```)
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(stripped);
    return validateManifest(parsed);
  } catch (e) {
    console.warn("[assetManifest] JSON invalido no bloco <manifest>:", e);
    return null;
  }
}

function validateManifest(data: unknown): AssetManifest | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const list = obj.assets;
  if (!Array.isArray(list)) return null;
  const assets: AssetManifestItem[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const kind = it.kind as AssetManifestKind;
    if (!VISUAL_KINDS.includes(kind) && !AUDIO_KINDS.includes(kind)) continue;
    const name = typeof it.name === "string" ? it.name.trim() : "";
    const prompt = typeof it.prompt === "string" ? it.prompt.trim() : "";
    if (!name || !prompt) continue;
    const item: AssetManifestItem = { kind, name, prompt };
    if (typeof it.size === "number" && [64, 96, 128, 192, 256].includes(it.size)) {
      item.size = it.size as 64 | 96 | 128 | 192 | 256;
    }
    if (typeof it.variations === "number" && it.variations > 0) {
      item.variations = Math.min(10, Math.floor(it.variations));
    }
    if (typeof it.duration_sec === "number" && it.duration_sec > 0) {
      item.duration_sec = Math.min(60, it.duration_sec);
    }
    if (typeof it.priority === "number") {
      item.priority = it.priority;
    }
    assets.push(item);
  }
  if (assets.length === 0) return null;
  // Ordena por prioridade (menor primeiro); itens sem prioridade vão para o fim.
  assets.sort((a, b) => {
    const pa = a.priority ?? Number.MAX_SAFE_INTEGER;
    const pb = b.priority ?? Number.MAX_SAFE_INTEGER;
    return pa - pb;
  });
  return { assets };
}

/**
 * Remove o bloco <manifest>...</manifest> do conteúdo original para exibição
 * limpa no painel central (o JSON não é para olho humano).
 */
export function stripManifestFromDocument(docContent: string): string {
  return docContent
    .replace(/<manifest>[\s\S]*?<\/manifest>\s*/gi, "")
    .trim();
}

const EXTRACTOR_SYSTEM = `Você é um extrator estrito. Recebe o documento da Etapa 12 (Produção de Assets) de um GDD indie e deve devolver **apenas** um JSON no formato:

{
  "assets": [
    { "kind": "concept_art|sprite|tile|audio_sfx|audio_music", "name": "snake_case", "prompt": "...", "size": 128, "variations": 1, "duration_sec": 2, "priority": 1 }
  ]
}

Regras:
- "kind" controla o pipeline: concept_art|sprite|tile → Pixellab; audio_sfx|audio_music → ElevenLabs.
- "size" só para visuais (aceitos: 64, 96, 128, 192, 256; default 128).
- "duration_sec" só para áudio (SFX 1-5s; music 15-60s).
- "variations" default 1 (máx 10).
- "priority" menor = primeiro.
- Nomes em snake_case ASCII, curtos.
- Prompts enxutos (1-2 linhas), em inglês quando servirem para Pixellab/ElevenLabs.

Responda ESTRITAMENTE com o JSON puro, sem prosa, sem code fences.`;

/**
 * Extrator "one-shot": pega o texto do documento da Etapa 12 (que não tem
 * <manifest> embutido, por ter sido gerado antes do schema) e pede para o
 * Claude converter em JSON válido. Retorna o manifest normalizado ou null.
 *
 * Essa função é assíncrona e importa streamClaude dinamicamente para evitar
 * ciclo de dependência (kb -> assetManifest -> claude).
 */
export async function extractManifestViaClaude(
  docContent: string,
  opts: { model?: string; onText?: (d: string) => void } = {}
): Promise<AssetManifest | null> {
  const { streamClaude } = await import("./claude");
  const stripped = stripManifestFromDocument(docContent);
  const { done } = streamClaude({
    systemPrompt: EXTRACTOR_SYSTEM,
    model: opts.model ?? "sonnet",
    userMessage:
      `Documento da Etapa 12 abaixo. Produza o manifest JSON conforme as regras do sistema.\n\n` +
      `---\n${stripped}\n---`,
    onText: opts.onText,
  });
  const result = await done;
  if (!result.success) {
    console.warn("[assetManifest] extractor Claude falhou:", result.error);
    return null;
  }
  // Tolera respostas com JSON bruto ou dentro de ```json.
  const text = result.fullText.trim();
  // Tenta extrair o primeiro JSON object balanceado.
  const jsonText = firstJsonObject(text) ?? text;
  try {
    const parsed = JSON.parse(jsonText);
    return validateManifest(parsed);
  } catch (e) {
    console.warn("[assetManifest] JSON invalido do extractor:", e, jsonText);
    return null;
  }
}

function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
