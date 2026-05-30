import { beforeEach, describe, expect, it } from 'vitest';
import { useWeatherStore, pickWeather } from './weatherStore';

describe('weatherStore', () => {
  beforeEach(() => {
    useWeatherStore.getState().reset();
  });

  it('starts as sunny', () => {
    expect(useWeatherStore.getState().current).toBe('sunny');
  });

  it('advanceWeather sets a valid weather type', () => {
    const validTypes = ['sunny', 'cloudy', 'rainy', 'snowy'];
    useWeatherStore.getState().advanceWeather('spring');
    expect(validTypes).toContain(useWeatherStore.getState().current);
  });

  it('winter produces all four weather types over many trials', () => {
    const results = new Set<string>();
    for (let i = 0; i < 500; i++) {
      results.add(pickWeather('winter'));
    }
    expect(results.has('snowy')).toBe(true);
    expect(results.has('sunny')).toBe(true);
  });

  it('spring and summer never produce snowy weather', () => {
    for (let i = 0; i < 200; i++) {
      expect(pickWeather('spring')).not.toBe('snowy');
      expect(pickWeather('summer')).not.toBe('snowy');
    }
  });

  it('reset returns to sunny', () => {
    useWeatherStore.getState().advanceWeather('winter');
    useWeatherStore.getState().reset();
    expect(useWeatherStore.getState().current).toBe('sunny');
  });
});
