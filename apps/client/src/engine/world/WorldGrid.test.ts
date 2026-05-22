import { describe, expect, it } from 'vitest';
import { DEFAULT_GRID, clampToBounds, isInBounds, tileToWorld, worldToTile } from './WorldGrid';

describe('WorldGrid', () => {
  describe('tileToWorld / worldToTile', () => {
    it('center tile (25, 25) on a 50x50 grid sits near origin', () => {
      const w = tileToWorld({ x: 25, z: 25 });
      // Tile 25 starts at x=0 (since halfW=25), center at x=0.5
      expect(w.x).toBeCloseTo(0.5);
      expect(w.z).toBeCloseTo(0.5);
    });

    it('south-west corner tile (0, 0) maps to extreme negative', () => {
      const w = tileToWorld({ x: 0, z: 0 });
      expect(w.x).toBeCloseTo(-24.5);
      expect(w.z).toBeCloseTo(-24.5);
    });

    it('north-east corner tile (49, 49) maps to extreme positive', () => {
      const w = tileToWorld({ x: 49, z: 49 });
      expect(w.x).toBeCloseTo(24.5);
      expect(w.z).toBeCloseTo(24.5);
    });

    it('worldToTile reverses tileToWorld (roundtrip)', () => {
      for (const tile of [
        { x: 0, z: 0 },
        { x: 25, z: 30 },
        { x: 49, z: 49 },
        { x: 13, z: 7 },
      ]) {
        const w = tileToWorld(tile);
        const back = worldToTile(w);
        expect(back).toEqual(tile);
      }
    });
  });

  describe('isInBounds', () => {
    it('accepts coordinates within the grid', () => {
      expect(isInBounds({ x: 0, z: 0 })).toBe(true);
      expect(isInBounds({ x: 49, z: 49 })).toBe(true);
      expect(isInBounds({ x: 25, z: 25 })).toBe(true);
    });

    it('rejects coordinates outside the grid', () => {
      expect(isInBounds({ x: -1, z: 0 })).toBe(false);
      expect(isInBounds({ x: 50, z: 25 })).toBe(false);
      expect(isInBounds({ x: 0, z: -1 })).toBe(false);
      expect(isInBounds({ x: 25, z: 50 })).toBe(false);
    });
  });

  describe('clampToBounds', () => {
    it('clamps out-of-range tiles to the nearest edge', () => {
      expect(clampToBounds({ x: -5, z: 100 })).toEqual({ x: 0, z: 49 });
      expect(clampToBounds({ x: 60, z: -10 })).toEqual({ x: 49, z: 0 });
    });

    it('leaves in-range tiles untouched', () => {
      expect(clampToBounds({ x: 25, z: 25 })).toEqual({ x: 25, z: 25 });
    });
  });

  describe('DEFAULT_GRID', () => {
    it('is a 50x50 grid with unit tiles', () => {
      expect(DEFAULT_GRID.width).toBe(50);
      expect(DEFAULT_GRID.height).toBe(50);
      expect(DEFAULT_GRID.tileSize).toBe(1);
    });
  });
});
