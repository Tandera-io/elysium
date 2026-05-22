import { describe, expect, it, vi } from 'vitest';
import { MeshyClient, type MeshyTaskResponse } from './meshy-client';

function mockFetch(responses: Array<Response | (() => Response)>): typeof fetch {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return typeof r === 'function' ? r() : (r as Response);
  }) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('MeshyClient', () => {
  it('requires an apiKey', () => {
    expect(() => new MeshyClient({ apiKey: '' })).toThrow(/apiKey/);
  });

  it('createTextTo3DTask returns the task id from { result }', async () => {
    const fetchImpl = mockFetch([jsonResponse({ result: 'task_abc' })]);
    const client = new MeshyClient({ apiKey: 'k', fetchImpl });
    const id = await client.createTextTo3DTask({ prompt: 'baker' });
    expect(id).toBe('task_abc');
  });

  it('createTextTo3DTask throws when result is missing', async () => {
    const fetchImpl = mockFetch([jsonResponse({})]);
    const client = new MeshyClient({ apiKey: 'k', fetchImpl });
    await expect(client.createTextTo3DTask({ prompt: 'baker' })).rejects.toThrow(/missing taskId/);
  });

  it('pollUntilDone resolves on SUCCEEDED', async () => {
    const task: MeshyTaskResponse = {
      id: 't1',
      status: 'SUCCEEDED',
      progress: 100,
      model_urls: { glb: 'https://meshy.example/t1.glb' },
    };
    const fetchImpl = mockFetch([jsonResponse(task)]);
    const client = new MeshyClient({ apiKey: 'k', fetchImpl, pollIntervalMs: 1 });
    const result = await client.pollUntilDone('t1');
    expect(result.status).toBe('SUCCEEDED');
  });

  it('pollUntilDone throws on FAILED', async () => {
    const fetchImpl = mockFetch([
      jsonResponse({
        id: 't1',
        status: 'FAILED',
        progress: 0,
        task_error: { message: 'bad prompt' },
      }),
    ]);
    const client = new MeshyClient({ apiKey: 'k', fetchImpl, pollIntervalMs: 1 });
    await expect(client.pollUntilDone('t1')).rejects.toThrow(/bad prompt/);
  });

  it('pollUntilDone walks through IN_PROGRESS until SUCCEEDED', async () => {
    // Response objects are single-use; emit fresh ones per call.
    const fetchImpl = mockFetch([
      () => jsonResponse({ id: 't1', status: 'IN_PROGRESS', progress: 50 }),
      () => jsonResponse({ id: 't1', status: 'IN_PROGRESS', progress: 70 }),
      () =>
        jsonResponse({
          id: 't1',
          status: 'SUCCEEDED',
          progress: 100,
          model_urls: { glb: 'https://x/t1.glb' },
        }),
    ]);
    const client = new MeshyClient({ apiKey: 'k', fetchImpl, pollIntervalMs: 1 });
    const result = await client.pollUntilDone('t1');
    expect(result.status).toBe('SUCCEEDED');
  });
});
