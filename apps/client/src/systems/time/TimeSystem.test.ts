import { describe, expect, it } from 'vitest';
import {
  phaseFor,
  isDaytime,
  lightLevelFor,
  currentNpcActivity,
  isNpcActive,
  npcTimeGreeting,
  type ScheduleEntry,
} from './TimeSystem';

describe('phaseFor', () => {
  it('returns night for hour 0', () => expect(phaseFor(0)).toBe('night'));
  it('returns dawn for hour 5', () => expect(phaseFor(5)).toBe('dawn'));
  it('returns dawn for hour 6.5', () => expect(phaseFor(6.5)).toBe('dawn'));
  it('returns day for hour 7', () => expect(phaseFor(7)).toBe('day'));
  it('returns day for hour 12', () => expect(phaseFor(12)).toBe('day'));
  it('returns day for hour 16.9', () => expect(phaseFor(16.9)).toBe('day'));
  it('returns dusk for hour 17', () => expect(phaseFor(17)).toBe('dusk'));
  it('returns dusk for hour 19.5', () => expect(phaseFor(19.5)).toBe('dusk'));
  it('returns night for hour 20', () => expect(phaseFor(20)).toBe('night'));
  it('returns night for hour 23', () => expect(phaseFor(23)).toBe('night'));
});

describe('isDaytime', () => {
  it('returns true at hour 5 (dawn start)', () => expect(isDaytime(5)).toBe(true));
  it('returns true at noon', () => expect(isDaytime(12)).toBe(true));
  it('returns true at hour 19.9', () => expect(isDaytime(19.9)).toBe(true));
  it('returns false at hour 20 (night)', () => expect(isDaytime(20)).toBe(false));
  it('returns false at hour 3 (deep night)', () => expect(isDaytime(3)).toBe(false));
});

describe('lightLevelFor', () => {
  it('is low at midnight (hour 0)', () => expect(lightLevelFor(0)).toBeCloseTo(0.05, 1));
  it('is maximum at noon', () => expect(lightLevelFor(12)).toBeCloseTo(1.0, 1));
  it('is between dawn and noon at hour 7', () => {
    const v = lightLevelFor(7);
    expect(v).toBeGreaterThan(0.25);
    expect(v).toBeLessThan(1.0);
  });
  it('decreases after noon (hour 20 < hour 12)', () => {
    expect(lightLevelFor(20)).toBeLessThan(lightLevelFor(12));
  });
});

describe('NPC schedule helpers', () => {
  const schedule: ScheduleEntry[] = [
    { from: '05:00', to: '11:00', location: 'padaria', activity: 'assar' },
    { from: '11:00', to: '14:00', location: 'padaria', activity: 'atender' },
    { from: '18:00', to: '21:00', location: 'praca', activity: 'socializar' },
  ];

  it('currentNpcActivity returns matching entry', () => {
    const entry = currentNpcActivity(schedule, 6);
    expect(entry?.activity).toBe('assar');
  });

  it('currentNpcActivity returns null when no entry matches', () => {
    expect(currentNpcActivity(schedule, 15)).toBeNull();
  });

  it('isNpcActive returns true when in schedule', () => {
    expect(isNpcActive(schedule, 12)).toBe(true);
  });

  it('isNpcActive returns false when outside schedule', () => {
    expect(isNpcActive(schedule, 3)).toBe(false);
  });

  it('currentNpcActivity uses 11:00 boundary correctly (from=11 covers 11)', () => {
    expect(currentNpcActivity(schedule, 11)?.activity).toBe('atender');
  });
});

describe('npcTimeGreeting', () => {
  it('returns night greeting at hour 22', () => {
    expect(npcTimeGreeting(22)).toContain('noite');
  });
  it('returns day greeting at noon', () => {
    const greeting = npcTimeGreeting(12);
    expect(greeting.length).toBeGreaterThan(0);
  });
  it('returns dusk greeting at hour 18', () => {
    expect(npcTimeGreeting(18)).toContain('tarde');
  });
});
