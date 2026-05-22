import { describe, expect, it } from 'vitest';
import { findPath, tileKey } from './pathfinding';

describe('pathfinding', () => {
  it('returns the start tile alone when start equals goal', () => {
    const path = findPath({ x: 5, z: 5 }, { x: 5, z: 5 });
    expect(path).toEqual([{ x: 5, z: 5 }]);
  });

  it('finds a direct path with no obstacles', () => {
    const path = findPath({ x: 0, z: 0 }, { x: 3, z: 0 });
    // Manhattan distance 3 → path length 4 (inclusive)
    expect(path).toHaveLength(4);
    expect(path[0]).toEqual({ x: 0, z: 0 });
    expect(path[path.length - 1]).toEqual({ x: 3, z: 0 });
  });

  it('returns empty when goal is out of bounds', () => {
    expect(findPath({ x: 0, z: 0 }, { x: 100, z: 0 })).toEqual([]);
  });

  it('returns empty when goal is blocked', () => {
    const blocked = new Set([tileKey({ x: 5, z: 5 })]);
    expect(findPath({ x: 0, z: 0 }, { x: 5, z: 5 }, { blocked })).toEqual([]);
  });

  it('routes around a wall', () => {
    // Build a vertical wall at x=2 between z=-10..z=10 except z=5 leaves a gap.
    const blocked = new Set<string>();
    for (let z = 0; z < 50; z++) {
      if (z !== 5) blocked.add(tileKey({ x: 2, z }));
    }
    const path = findPath({ x: 0, z: 0 }, { x: 4, z: 0 }, { blocked });
    expect(path.length).toBeGreaterThan(0);
    // Must traverse the gap at z=5
    const passesGap = path.some((t) => t.x === 2 && t.z === 5);
    expect(passesGap).toBe(true);
  });

  it('path is contiguous (each step is a 4-neighbor)', () => {
    const path = findPath({ x: 0, z: 0 }, { x: 6, z: 4 });
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      const dist = Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
      expect(dist).toBe(1);
    }
  });

  it('respects bounds on the configured grid', () => {
    const tinyGrid = { width: 5, height: 5, tileSize: 1 };
    // goal out of tinyGrid
    expect(findPath({ x: 0, z: 0 }, { x: 7, z: 7 }, { grid: tinyGrid })).toEqual([]);
    // goal in tinyGrid
    const path = findPath({ x: 0, z: 0 }, { x: 4, z: 4 }, { grid: tinyGrid });
    expect(path[path.length - 1]).toEqual({ x: 4, z: 4 });
  });
});
