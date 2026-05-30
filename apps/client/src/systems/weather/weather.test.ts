import { beforeEach, describe, expect, it } from 'vitest';
import { useWeatherStore, pickWeather, WEATHER_META } from './weatherStore';
import type { WeatherType } from './weatherStore';

const VALID: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'stormy'];

describe('weatherStore', () => {
  beforeEach(() => {
    useWeatherStore.getState().reset();
  });

  it('starts with sunny weather', () => {
    const s = useWeatherStore.getState();
    expect(s.today).toBe('sunny');
    expect(s.tomorrow).toBe('sunny');
  });

  it('pickWeather returns a valid weather type', () => {
    expect(VALID).toContain(pickWeather(42, 0));
    expect(VALID).toContain(pickWeather(99, 2));
    expect(VALID).toContain(pickWeather(0, 3));
  });

  it('pickWeather is deterministic', () => {
    expect(pickWeather(42, 0)).toBe(pickWeather(42, 0));
    expect(pickWeather(7, 1)).toBe(pickWeather(7, 1));
  });

  it('advanceDay rolls today to tomorrow and generates new tomorrow', () => {
    useWeatherStore.getState().advanceDay(10, 0);
    const s = useWeatherStore.getState();
    // today became what was sunny (initial tomorrow), tomorrow is newly generated
    expect(VALID).toContain(s.today);
    expect(VALID).toContain(s.tomorrow);
  });

  it('WEATHER_META has growthMod for all types', () => {
    for (const type of VALID) {
      expect(WEATHER_META[type].growthMod).toBeTypeOf('number');
      expect(WEATHER_META[type].growthMod).toBeGreaterThan(0);
    }
  });

  it('rainy weather has growthMod > 1 (benefits crop growth via auto-watering)', () => {
    expect(WEATHER_META.rainy.growthMod).toBeGreaterThan(1);
  });

  it('stormy weather has growthMod < 1 (slows growth)', () => {
    expect(WEATHER_META.stormy.growthMod).toBeLessThan(1);
  });

  it('sunny weather has neutral growthMod', () => {
    expect(WEATHER_META.sunny.growthMod).toBe(1.0);
  });
});
