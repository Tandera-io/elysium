import { describe, expect, it } from 'vitest';
import {
  fogSettingsFor,
  environmentModifiersFor,
  isNpcAsleep,
  NPC_SLEEP_HOUR,
  NPC_WAKE_HOUR,
} from './EnvironmentSystem';

describe('fogSettingsFor', () => {
  it('returns day fog at noon', () => {
    const fog = fogSettingsFor(12);
    expect(fog.near).toBe(80);
    expect(fog.far).toBe(160);
  });

  it('returns night fog at 22:00', () => {
    const fog = fogSettingsFor(22);
    expect(fog.near).toBe(40);
    expect(fog.far).toBe(100);
  });

  it('returns dusk fog at 18:00', () => {
    const fog = fogSettingsFor(18);
    expect(fog.near).toBe(60);
    expect(fog.far).toBe(130);
  });

  it('returns dawn fog at 6:00', () => {
    const fog = fogSettingsFor(6);
    expect(fog.near).toBe(60);
    expect(fog.far).toBe(140);
  });
});

describe('environmentModifiersFor', () => {
  it('shopsOpen is true during the day', () => {
    expect(environmentModifiersFor(10).shopsOpen).toBe(true);
  });

  it('shopsOpen is false at night', () => {
    expect(environmentModifiersFor(22).shopsOpen).toBe(false);
  });

  it('shopsOpen is false before dawn', () => {
    expect(environmentModifiersFor(4).shopsOpen).toBe(false);
  });

  it('cropGrowthRate is reduced at night', () => {
    expect(environmentModifiersFor(2).cropGrowthRate).toBe(0.5);
  });

  it('cropGrowthRate is full during day', () => {
    expect(environmentModifiersFor(12).cropGrowthRate).toBe(1.0);
  });

  it('npcSpeedMultiplier is reduced at night', () => {
    expect(environmentModifiersFor(2).npcSpeedMultiplier).toBe(0.4);
  });

  it('nightOverlayOpacity is 0 at noon (full light)', () => {
    expect(environmentModifiersFor(12).nightOverlayOpacity).toBeCloseTo(0, 1);
  });

  it('nightOverlayOpacity is > 0 at night', () => {
    expect(environmentModifiersFor(2).nightOverlayOpacity).toBeGreaterThan(0);
  });
});

describe('isNpcAsleep', () => {
  it('NPCs are awake during day', () => {
    expect(isNpcAsleep(10)).toBe(false);
  });

  it('NPCs sleep after NPC_SLEEP_HOUR', () => {
    expect(isNpcAsleep(NPC_SLEEP_HOUR)).toBe(true);
    expect(isNpcAsleep(23)).toBe(true);
  });

  it('NPCs sleep before NPC_WAKE_HOUR', () => {
    expect(isNpcAsleep(3)).toBe(true);
    expect(isNpcAsleep(NPC_WAKE_HOUR - 1)).toBe(true);
  });

  it('NPCs are awake at NPC_WAKE_HOUR', () => {
    expect(isNpcAsleep(NPC_WAKE_HOUR)).toBe(false);
  });
});
