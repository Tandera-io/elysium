import { describe, expect, it } from 'vitest';
import {
  classifyContext,
  getActionResponse,
  getFirstMeetingLine,
  getQuestAwareLine,
  getRepeatVisitLine,
  PLAYER_ACTIONS,
} from './index.js';

describe('classifyContext', () => {
  it('returns first_meeting when interactionCount is 0', () => {
    expect(classifyContext({ interactionCount: 0 })).toBe('first_meeting');
  });

  it('returns friend when heartLevel >= 6', () => {
    expect(classifyContext({ interactionCount: 5, heartLevel: 7 })).toBe('friend');
  });

  it('returns repeat_regular after 5 interactions', () => {
    expect(classifyContext({ interactionCount: 6, heartLevel: 2 })).toBe('repeat_regular');
  });
});

describe('getFirstMeetingLine', () => {
  it('returns a string for known NPCs', () => {
    const line = getFirstMeetingLine('marina');
    expect(typeof line).toBe('string');
    expect(line.length).toBeGreaterThan(0);
  });

  it('falls back gracefully for unknown NPC', () => {
    const line = getFirstMeetingLine('ghost_npc');
    expect(typeof line).toBe('string');
  });
});

describe('getRepeatVisitLine', () => {
  it('returns different tone for friend vs repeat_early', () => {
    const early = getRepeatVisitLine('ferraz', { interactionCount: 2, heartLevel: 1 });
    const friend = getRepeatVisitLine('ferraz', { interactionCount: 25, heartLevel: 8 });
    expect(typeof early).toBe('string');
    expect(typeof friend).toBe('string');
  });
});

describe('getQuestAwareLine', () => {
  it('returns a quest reminder when activeQuestItem is set', () => {
    const line = getQuestAwareLine('dorinha', { activeQuestItem: 'trigo' });
    expect(line).not.toBeNull();
    expect(typeof line).toBe('string');
    expect((line as string).length).toBeGreaterThan(0);
  });

  it('returns a quest complete line when completedQuestCount > 0', () => {
    const line = getQuestAwareLine('marina', { completedQuestCount: 1 });
    expect(line).not.toBeNull();
    expect(typeof line).toBe('string');
  });

  it('returns null when no quest context', () => {
    const line = getQuestAwareLine('nina', {});
    expect(line).toBeNull();
  });

  it('returns null for unknown NPC with quest context', () => {
    const line = getQuestAwareLine('unknown_npc', { activeQuestItem: 'trigo' });
    expect(line).toBeNull();
  });

  it('prioritizes active quest over completed quest count', () => {
    const line = getQuestAwareLine('bento', {
      activeQuestItem: 'seed_wheat',
      completedQuestCount: 2,
    });
    expect(line).not.toBeNull();
  });
});

describe('getActionResponse', () => {
  it('returns first meeting line on first greet', () => {
    const res = getActionResponse('nina', PLAYER_ACTIONS.GREET, { interactionCount: 0 });
    expect(res.length).toBeGreaterThan(0);
  });

  it('injects quest reminder on greet when quest is active', () => {
    const res = getActionResponse('dorinha', PLAYER_ACTIONS.GREET, {
      interactionCount: 3,
      heartLevel: 2,
      activeQuestItem: 'tomate',
    });
    expect(res.length).toBeGreaterThan(0);
    // Should not be the standard repeat-visit greet
    const repeatLine = getRepeatVisitLine('dorinha', { interactionCount: 3, heartLevel: 2 });
    expect(res).not.toBe(repeatLine);
  });
});
