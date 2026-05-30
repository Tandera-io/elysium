import { describe, expect, it } from 'vitest';
import { INTERACT_RANGE, findInteractTarget } from './interaction';
import type { NpcStateEntry } from './npcStore';

const fakeNpc = (id: string, x: number, z: number): NpcStateEntry => ({
  def: {
    id,
    name: id,
    role: 'test',
    personality: { core_traits: [], speech_style: '', values: [], fears: [] },
  },
  worldPos: { x, z },
  conversation: { interactionCount: 0, heartLevel: 0 },
});

describe('findInteractTarget', () => {
  it('returns null when no NPC is in range', () => {
    const npcs = { far: fakeNpc('far', 100, 100) };
    expect(findInteractTarget({ x: 0, z: 0 }, npcs)).toBeNull();
  });

  it('returns the nearest NPC within range', () => {
    const npcs = {
      a: fakeNpc('a', 1.5, 0),
      b: fakeNpc('b', 0, 1.0),
      far: fakeNpc('far', 50, 0),
    };
    expect(findInteractTarget({ x: 0, z: 0 }, npcs)?.def.id).toBe('b');
  });

  it('respects INTERACT_RANGE boundary', () => {
    const justOut = fakeNpc('outer', INTERACT_RANGE + 0.1, 0);
    expect(findInteractTarget({ x: 0, z: 0 }, { outer: justOut })).toBeNull();
  });
});
