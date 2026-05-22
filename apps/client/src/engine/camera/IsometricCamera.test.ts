import { describe, expect, it } from 'vitest';
import { buildIsometricTransform } from './IsometricCamera';

describe('buildIsometricTransform', () => {
  it('produces equal x and z components (45° azimuth)', () => {
    const { position } = buildIsometricTransform(60);
    expect(position[0]).toBeCloseTo(position[2]);
  });

  it('looks at the origin', () => {
    const { target } = buildIsometricTransform();
    expect(target).toEqual([0, 0, 0]);
  });

  it('places the camera at the requested distance from origin', () => {
    const distance = 60;
    const { position } = buildIsometricTransform(distance);
    const len = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
    expect(len).toBeCloseTo(distance);
  });

  it('elevation gives the canonical isometric look (≈35.264°)', () => {
    const { position } = buildIsometricTransform(1);
    // sin(elevation) = y / distance
    const elev = Math.asin(position[1]);
    expect(elev).toBeCloseTo(Math.atan(1 / Math.sqrt(2)));
  });

  it('scales linearly with distance', () => {
    const a = buildIsometricTransform(10);
    const b = buildIsometricTransform(20);
    expect(b.position[0]).toBeCloseTo(a.position[0] * 2);
    expect(b.position[1]).toBeCloseTo(a.position[1] * 2);
    expect(b.position[2]).toBeCloseTo(a.position[2] * 2);
  });
});
