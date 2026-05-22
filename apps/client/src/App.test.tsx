import { describe, expect, it } from 'vitest';

describe('client sanity', () => {
  it('basic arithmetic works (jsdom env)', () => {
    expect(1 + 1).toBe(2);
  });

  it('jsdom provides document', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div')).toBeDefined();
  });
});
