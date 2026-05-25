import { readFile, writeFile } from 'node:fs/promises';

/**
 * OpenAI Images API wrapper (gpt-image-1 by default).
 * Docs: https://platform.openai.com/docs/api-reference/images
 *
 * Flow is synchronous: POST returns b64-encoded PNG directly.
 * For pixel art, drive the look through the PROMPT, not provider flags.
 *
 * Two endpoints:
 *   generateImage()  → /images/generations  (text → image)
 *   editImage()      → /images/edits        (image + text → image, preserves
 *                                            character identity better)
 */

const API_BASE = 'https://api.openai.com/v1';

export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
export type ImageBackground = 'transparent' | 'opaque' | 'auto';

export interface GenerateImageOptions {
  prompt: string;
  size?: ImageSize;
  background?: ImageBackground;
  quality?: ImageQuality;
  model?: string;
}

export interface EditImageOptions {
  prompt: string;
  /** Absolute path to a PNG to use as the reference. */
  baseImagePath: string;
  size?: ImageSize;
  background?: ImageBackground;
  quality?: ImageQuality;
  model?: string;
}

export interface OpenAIImageClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

export class OpenAIImageClient {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly initialBackoffMs: number;
  private readonly maxBackoffMs: number;

  constructor(options: OpenAIImageClientOptions) {
    if (!options.apiKey) throw new Error('OpenAIImageClient: apiKey is required');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.initialBackoffMs = options.initialBackoffMs ?? 800;
    this.maxBackoffMs = options.maxBackoffMs ?? 8000;
  }

  /** Returns the raw PNG bytes for a single generated image. */
  async generateImage(options: GenerateImageOptions): Promise<Buffer> {
    const body = {
      model: options.model ?? 'gpt-image-1',
      prompt: options.prompt,
      n: 1,
      size: options.size ?? '1024x1024',
      background: options.background ?? 'transparent',
      quality: options.quality ?? 'medium',
    };

    let backoff = this.initialBackoffMs;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await this.fetchImpl(`${API_BASE}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`OpenAI transient ${res.status}: ${await res.text()}`);
        }
        if (!res.ok) {
          throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
        }
        const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
        const first = json.data?.[0];
        if (!first) throw new Error('OpenAI: empty data array in response');
        if (first.b64_json) return Buffer.from(first.b64_json, 'base64');
        if (first.url) {
          const r = await this.fetchImpl(first.url);
          if (!r.ok) throw new Error(`OpenAI image fetch failed: ${r.status}`);
          return Buffer.from(await r.arrayBuffer());
        }
        throw new Error('OpenAI: neither b64_json nor url present');
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (/OpenAI 4(0[0-8]|1[0-9]|2[0-7])/.test(msg)) throw err; // permanent 4xx
        await sleep(backoff);
        backoff = Math.min(this.maxBackoffMs, backoff * 2);
      }
    }
    throw lastErr ?? new Error('OpenAI: exhausted retries');
  }

  async generateImageToFile(options: GenerateImageOptions, destPath: string): Promise<void> {
    const buf = await this.generateImage(options);
    await writeFile(destPath, buf);
  }

  /**
   * Edit an existing PNG with a text prompt. Uses /images/edits which
   * preserves the input's character identity / palette much better than
   * a fresh /generations call.
   */
  async editImage(options: EditImageOptions): Promise<Buffer> {
    const pngBytes = await readFile(options.baseImagePath);
    const form = new FormData();
    form.append('model', options.model ?? 'gpt-image-1');
    form.append('prompt', options.prompt);
    form.append('n', '1');
    form.append('size', options.size ?? '1024x1024');
    form.append('background', options.background ?? 'transparent');
    form.append('quality', options.quality ?? 'medium');
    // PNG MIME explicit so the API accepts it
    const blob = new Blob([new Uint8Array(pngBytes)], { type: 'image/png' });
    form.append('image', blob, 'base.png');

    let backoff = this.initialBackoffMs;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await this.fetchImpl(`${API_BASE}/images/edits`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiKey}` },
          body: form,
        });
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`OpenAI transient ${res.status}: ${await res.text()}`);
        }
        if (!res.ok) {
          throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
        }
        const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
        const first = json.data?.[0];
        if (!first) throw new Error('OpenAI: empty data array in edit response');
        if (first.b64_json) return Buffer.from(first.b64_json, 'base64');
        if (first.url) {
          const r = await this.fetchImpl(first.url);
          if (!r.ok) throw new Error(`OpenAI image fetch failed: ${r.status}`);
          return Buffer.from(await r.arrayBuffer());
        }
        throw new Error('OpenAI: edit response missing b64_json and url');
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (/OpenAI 4(0[0-8]|1[0-9]|2[0-7])/.test(msg)) throw err;
        await sleep(backoff);
        backoff = Math.min(this.maxBackoffMs, backoff * 2);
      }
    }
    throw lastErr ?? new Error('OpenAI: exhausted retries on edit');
  }

  async editImageToFile(options: EditImageOptions, destPath: string): Promise<void> {
    const buf = await this.editImage(options);
    await writeFile(destPath, buf);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
