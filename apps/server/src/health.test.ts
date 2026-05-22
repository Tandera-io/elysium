import { describe, expect, it } from 'vitest';
import { env } from './lib/env.js';

describe('server sanity', () => {
  it('basic arithmetic works (environment runs)', () => {
    expect(1 + 1).toBe(2);
  });

  it('env loader exposes expected keys', () => {
    expect(typeof env.NPC_LLM_MODEL).toBe('string');
    expect(env.NPC_LLM_MODEL.length).toBeGreaterThan(0);
    expect(env.PORT).toBeGreaterThan(0);
  });

  it('env keys are strings (never undefined)', () => {
    expect(typeof env.MESHY_API_KEY).toBe('string');
    expect(typeof env.ANTHROPIC_API_KEY).toBe('string');
  });
});
