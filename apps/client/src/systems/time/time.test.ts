import { beforeEach, describe, expect, it } from 'vitest';
import {
  DAYS_PER_SEASON,
  SECONDS_PER_REAL_DAY_DEFAULT,
  currentSeason,
  formatClock,
  useTimeStore,
} from './timeStore';
import { useFarmStore } from '../farming/farmStore';

describe('timeStore', () => {
  beforeEach(() => {
    useTimeStore.getState().reset();
    useFarmStore.getState().reset();
  });

  it('starts at hour 6 of day 1, season 0 (spring), year 1', () => {
    const s = useTimeStore.getState();
    expect(s.hour).toBe(6);
    expect(s.dayInSeason).toBe(1);
    expect(s.seasonIndex).toBe(0);
    expect(s.year).toBe(1);
    expect(currentSeason(s)).toBe('spring');
  });

  it('tick advances hour proportionally', () => {
    const s = useTimeStore.getState();
    // realSecondsPerDay default = 900; tick(900) = +24h
    s.tick(450); // half day = +12h
    expect(useTimeStore.getState().hour).toBeCloseTo(18);
  });

  it('rolls hour over to next day and advances farm day', () => {
    const initialFarmDay = useFarmStore.getState().day;
    // Start at hour 6, tick 18h to reach 24h → day rolls to 2
    useTimeStore.getState().tick(18 * (SECONDS_PER_REAL_DAY_DEFAULT / 24));
    expect(useTimeStore.getState().dayInSeason).toBe(2);
    expect(useFarmStore.getState().day).toBe(initialFarmDay + 1);
  });

  it('rolls 7 days into next season', () => {
    // 7 full days
    useTimeStore.getState().tick(7 * SECONDS_PER_REAL_DAY_DEFAULT);
    const s = useTimeStore.getState();
    expect(s.dayInSeason).toBe(1);
    expect(s.seasonIndex).toBe(1); // summer
    expect(currentSeason(s)).toBe('summer');
  });

  it('rolls 4 seasons into next year', () => {
    // 4 seasons × 7 days = 28 days
    const secs = 28 * SECONDS_PER_REAL_DAY_DEFAULT;
    useTimeStore.getState().tick(secs);
    const s = useTimeStore.getState();
    expect(s.year).toBe(2);
    expect(s.seasonIndex).toBe(0);
    expect(currentSeason(s)).toBe('spring');
  });

  it('paused tick is a no-op', () => {
    useTimeStore.getState().setPaused(true);
    useTimeStore.getState().tick(SECONDS_PER_REAL_DAY_DEFAULT);
    expect(useTimeStore.getState().hour).toBe(6);
  });

  it('setRealSecondsPerDay clamps to >= 10', () => {
    useTimeStore.getState().setRealSecondsPerDay(2);
    expect(useTimeStore.getState().realSecondsPerDay).toBe(10);
  });

  it('formatClock zero-pads hh:mm', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(6.5)).toBe('06:30');
    expect(formatClock(13.25)).toBe('13:15');
    expect(formatClock(23.999)).toBe('23:59');
  });

  it('14 day jump skips two whole seasons', () => {
    useTimeStore.getState().tick(2 * DAYS_PER_SEASON * SECONDS_PER_REAL_DAY_DEFAULT);
    expect(useTimeStore.getState().seasonIndex).toBe(2);
    expect(currentSeason(useTimeStore.getState())).toBe('autumn');
  });
});
