import { writeFile } from 'node:fs/promises';

/**
 * Meshy.ai v2 REST client (text-to-3d).
 * Docs: https://docs.meshy.ai/api/text-to-3d
 *
 * Flow:
 *   1. POST /openapi/v2/text-to-3d → returns taskId
 *   2. GET  /openapi/v2/text-to-3d/{taskId} → poll until status === SUCCEEDED
 *   3. download model_urls.glb to disk
 */

const API_BASE = 'https://api.meshy.ai/openapi';

export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

export interface MeshyTaskResponse {
  id: string;
  status: MeshyTaskStatus;
  progress: number;
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
  };
  thumbnail_url?: string;
  task_error?: { message?: string };
}

export interface CreateTextTo3DOptions {
  prompt: string;
  mode?: 'preview' | 'refine';
  /**
   * Meshy v2 currently only accepts 'realistic'. Keep the prompt itself
   * stylized ("stylized cartoon ...") to drive the look.
   */
  art_style?: 'realistic';
  negative_prompt?: string;
  /** When mode='refine', required: ID of a preview task that already succeeded. */
  preview_task_id?: string;
  /** When mode='preview', defaults to T-pose for characters. */
  topology?: 'triangle' | 'quad';
  target_polycount?: number;
  ai_model?: 'meshy-4' | 'meshy-5' | 'latest';
  should_remesh?: boolean;
}

export interface MeshyClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** Initial backoff in ms; doubles up to maxBackoffMs. */
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export class MeshyClient {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly initialBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(options: MeshyClientOptions) {
    if (!options.apiKey) throw new Error('MeshyClient: apiKey is required');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.initialBackoffMs = options.initialBackoffMs ?? 500;
    this.maxBackoffMs = options.maxBackoffMs ?? 8000;
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
    this.maxPollAttempts = options.maxPollAttempts ?? 180;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /** POST a new text-to-3d task. Returns the task id. */
  async createTextTo3DTask(options: CreateTextTo3DOptions): Promise<string> {
    // Meshy v2 currently accepts only art_style='realistic'; achieve stylization
    // via the prompt itself (e.g. "stylized cartoon ...").
    const body = {
      mode: options.mode ?? 'preview',
      prompt: options.prompt,
      art_style: options.art_style ?? 'realistic',
      negative_prompt: options.negative_prompt,
      preview_task_id: options.preview_task_id,
      topology: options.topology ?? 'triangle',
      target_polycount: options.target_polycount ?? 30000,
      ai_model: options.ai_model ?? 'meshy-5',
      should_remesh: options.should_remesh ?? true,
    };

    const res = await this.requestWithRetry(`${API_BASE}/v2/text-to-3d`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { result?: string };
    if (!json.result) throw new Error(`Meshy: missing taskId in response: ${JSON.stringify(json)}`);
    return json.result;
  }

  /** GET task status by id. */
  async getTaskStatus(taskId: string): Promise<MeshyTaskResponse> {
    const res = await this.requestWithRetry(`${API_BASE}/v2/text-to-3d/${taskId}`, {
      method: 'GET',
      headers: this.headers(),
    });
    return (await res.json()) as MeshyTaskResponse;
  }

  /**
   * Poll a task until it reaches a terminal state (SUCCEEDED or FAILED).
   * Returns the final task. Throws on FAILED/EXPIRED or timeout.
   */
  async pollUntilDone(
    taskId: string,
    onProgress?: (task: MeshyTaskResponse) => void,
  ): Promise<MeshyTaskResponse> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      const task = await this.getTaskStatus(taskId);
      onProgress?.(task);
      if (task.status === 'SUCCEEDED') return task;
      if (task.status === 'FAILED' || task.status === 'EXPIRED') {
        throw new Error(
          `Meshy task ${taskId} ended with status ${task.status}: ${task.task_error?.message ?? 'unknown'}`,
        );
      }
      await sleep(this.pollIntervalMs);
    }
    throw new Error(
      `Meshy task ${taskId} timed out after ${this.maxPollAttempts * this.pollIntervalMs}ms`,
    );
  }

  /** Download a completed task's GLB to the given absolute path. */
  async downloadResult(task: MeshyTaskResponse, destPath: string): Promise<void> {
    const url = task.model_urls?.glb;
    if (!url) throw new Error(`Meshy task ${task.id} has no glb url`);
    const res = await this.fetchImpl(url);
    if (!res.ok) throw new Error(`Meshy download failed (${res.status}) for ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buf);
  }

  private async requestWithRetry(url: string, init: RequestInit): Promise<Response> {
    let backoff = this.initialBackoffMs;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await this.fetchImpl(url, init);
        if (res.status === 429 || res.status >= 500) {
          // transient — retry
          throw new Error(`Meshy ${res.status}: ${await res.text()}`);
        }
        if (!res.ok) {
          throw new Error(`Meshy ${res.status}: ${await res.text()}`);
        }
        return res;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        // Non-transient (4xx other than 429) → don't retry
        if (/Meshy 4(0[0-8]|1[0-9]|2[0-7])/.test(msg)) throw err;
        await sleep(backoff);
        backoff = Math.min(this.maxBackoffMs, backoff * 2);
      }
    }
    throw lastErr ?? new Error('Meshy: exhausted retries');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
