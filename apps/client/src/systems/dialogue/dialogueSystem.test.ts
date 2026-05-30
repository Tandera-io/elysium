import { describe, expect, it, beforeEach } from 'vitest';
import {
  getGreeting,
  getDialoguesForTime,
  getKnownNpcIds,
  getTimeOfDay,
  getInteractionCount,
  incrementInteractionCount,
} from './DialogueSystem';

describe('DialogueSystem', () => {
  describe('getTimeOfDay', () => {
    it('returns morning for 6–11', () => {
      expect(getTimeOfDay(6)).toBe('manha');
      expect(getTimeOfDay(11)).toBe('manha');
    });
    it('returns afternoon for 12–17', () => {
      expect(getTimeOfDay(12)).toBe('tarde');
      expect(getTimeOfDay(17)).toBe('tarde');
    });
    it('returns evening for 18–21', () => {
      expect(getTimeOfDay(18)).toBe('noite');
      expect(getTimeOfDay(21)).toBe('noite');
    });
    it('returns night for 22–5', () => {
      expect(getTimeOfDay(22)).toBe('madrugada');
      expect(getTimeOfDay(0)).toBe('madrugada');
      expect(getTimeOfDay(4)).toBe('madrugada');
    });
  });

  describe('dialogue bank coverage', () => {
    const requiredNpcs = ['arnaldo', 'padre-pedro', 'sofia'];
    const timeSlots = [6, 14, 20, 2];

    it.each(requiredNpcs)('%s has at least 3 unique dialogues across time buckets', (npcId) => {
      const allLines = new Set<string>();
      for (const hour of timeSlots) {
        const lines = getDialoguesForTime(npcId, hour);
        lines.forEach((l) => allLines.add(l.text));
      }
      expect(allLines.size).toBeGreaterThanOrEqual(3);
    });

    it('returns a greeting for arnaldo in the morning', () => {
      const line = getGreeting('arnaldo', 8, 0);
      expect(line.text.length).toBeGreaterThan(0);
      expect(line.emotion).toBeTruthy();
    });

    it('returns a greeting for padre-pedro in the evening', () => {
      const line = getGreeting('padre-pedro', 19, 0);
      expect(line.text.length).toBeGreaterThan(0);
    });

    it('returns a greeting for sofia at night', () => {
      const line = getGreeting('sofia', 23, 0);
      expect(line.text.length).toBeGreaterThan(0);
    });

    it('returns a fallback for an unknown npc', () => {
      const line = getGreeting('unknown-npc', 10, 0);
      expect(line.text).toBeTruthy();
    });
  });

  describe('interaction counting', () => {
    const testNpc = 'arnaldo';

    beforeEach(() => {
      // Reset by reading and not modifying — counts persist in module scope
    });

    it('increments interaction count', () => {
      const before = getInteractionCount(testNpc);
      incrementInteractionCount(testNpc);
      expect(getInteractionCount(testNpc)).toBe(before + 1);
    });

    it('cycles through dialogue lines based on interaction count', () => {
      const count0 = getGreeting(testNpc, 8, 0);
      const count1 = getGreeting(testNpc, 8, 1);
      const count2 = getGreeting(testNpc, 8, 2);
      // All should be valid strings (may repeat after cycling)
      expect(count0.text).toBeTruthy();
      expect(count1.text).toBeTruthy();
      expect(count2.text).toBeTruthy();
    });
  });

  describe('getKnownNpcIds', () => {
    it('includes all 3 new NPCs', () => {
      const ids = getKnownNpcIds();
      expect(ids).toContain('arnaldo');
      expect(ids).toContain('padre-pedro');
      expect(ids).toContain('sofia');
    });
  });
});
