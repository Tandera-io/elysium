import { describe, expect, it } from 'vitest';
import { createMovementState, tickMovement, type NpcMovementState } from './npcMovement';

const FIXED_RNG = () => 0.5;

describe('createMovementState', () => {
  it('sets anchor equal to the supplied position', () => {
    const state = createMovementState({ x: 4, z: -6 }, FIXED_RNG);
    expect(state.anchor).toEqual({ x: 4, z: -6 });
  });

  it('sets target equal to anchor initially', () => {
    const state = createMovementState({ x: 2, z: 3 }, FIXED_RNG);
    expect(state.target).toEqual({ x: 2, z: 3 });
  });

  it('speed is within [0.6, 1.2]', () => {
    for (let i = 0; i < 20; i++) {
      const s = createMovementState({ x: 0, z: 0 });
      expect(s.speed).toBeGreaterThanOrEqual(0.6);
      expect(s.speed).toBeLessThanOrEqual(1.2 + 1e-9);
    }
  });
});

describe('tickMovement — pause countdown', () => {
  it('does not move while pauseTimer > 0', () => {
    const state: NpcMovementState = {
      anchor: { x: 0, z: 0 },
      target: { x: 10, z: 0 },
      speed: 1,
      wanderRadius: 5,
      pauseTimer: 3,
    };
    const { newPos } = tickMovement(0.016, { x: 0, z: 0 }, state, FIXED_RNG);
    expect(newPos).toEqual({ x: 0, z: 0 });
  });

  it('decrements pauseTimer by delta', () => {
    const state: NpcMovementState = {
      anchor: { x: 0, z: 0 },
      target: { x: 10, z: 0 },
      speed: 1,
      wanderRadius: 5,
      pauseTimer: 2,
    };
    const { newState } = tickMovement(0.5, { x: 0, z: 0 }, state, FIXED_RNG);
    expect(newState.pauseTimer).toBeCloseTo(1.5);
  });

  it('clamps pauseTimer to 0, not negative', () => {
    const state: NpcMovementState = {
      anchor: { x: 0, z: 0 },
      target: { x: 0, z: 0 },
      speed: 1,
      wanderRadius: 5,
      pauseTimer: 0.1,
    };
    const { newState } = tickMovement(1, { x: 0, z: 0 }, state, FIXED_RNG);
    expect(newState.pauseTimer).toBe(0);
  });
});

describe('tickMovement — walking', () => {
  const movingState: NpcMovementState = {
    anchor: { x: 0, z: 0 },
    target: { x: 5, z: 0 },
    speed: 2,
    wanderRadius: 5,
    pauseTimer: 0,
  };

  it('moves NPC toward target', () => {
    const { newPos } = tickMovement(1, { x: 0, z: 0 }, movingState, FIXED_RNG);
    expect(newPos.x).toBeCloseTo(2);
    expect(newPos.z).toBeCloseTo(0);
  });

  it('does not overshoot target', () => {
    const { newPos } = tickMovement(100, { x: 0, z: 0 }, movingState, FIXED_RNG);
    expect(newPos.x).toBeLessThanOrEqual(5 + 0.001);
  });

  it('moves along both axes proportionally', () => {
    const diagState: NpcMovementState = { ...movingState, target: { x: 3, z: 4 } };
    const { newPos } = tickMovement(1, { x: 0, z: 0 }, diagState, FIXED_RNG);
    // Direction should be (3,4)/5 = (0.6, 0.8), step = 2 → (1.2, 1.6)
    expect(newPos.x).toBeCloseTo(1.2);
    expect(newPos.z).toBeCloseTo(1.6);
  });
});

describe('tickMovement — target reached', () => {
  it('picks a new target within wanderRadius of anchor', () => {
    const state: NpcMovementState = {
      anchor: { x: 10, z: 10 },
      target: { x: 10, z: 10 },
      speed: 1,
      wanderRadius: 4,
      pauseTimer: 0,
    };
    const { newState } = tickMovement(0.016, { x: 10, z: 10 }, state, FIXED_RNG);
    const dx = newState.target.x - 10;
    const dz = newState.target.z - 10;
    expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(4 + 1e-9);
  });

  it('sets pauseTimer between 2 and 6 seconds', () => {
    const state: NpcMovementState = {
      anchor: { x: 0, z: 0 },
      target: { x: 0, z: 0 },
      speed: 1,
      wanderRadius: 5,
      pauseTimer: 0,
    };
    for (let i = 0; i < 30; i++) {
      const { newState } = tickMovement(0.016, { x: 0, z: 0 }, state);
      expect(newState.pauseTimer).toBeGreaterThanOrEqual(2 - 1e-9);
      expect(newState.pauseTimer).toBeLessThanOrEqual(6 + 1e-9);
    }
  });

  it('uses FIXED_RNG to produce deterministic new target', () => {
    const state: NpcMovementState = {
      anchor: { x: 0, z: 0 },
      target: { x: 0, z: 0 },
      speed: 1,
      wanderRadius: 5,
      pauseTimer: 0,
    };
    const r1 = tickMovement(0.016, { x: 0, z: 0 }, state, FIXED_RNG);
    const r2 = tickMovement(0.016, { x: 0, z: 0 }, state, FIXED_RNG);
    expect(r1.newState.target).toEqual(r2.newState.target);
  });
});
