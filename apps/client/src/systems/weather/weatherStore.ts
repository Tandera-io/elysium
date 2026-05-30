import { create } from 'zustand';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy';
type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const SEASON_WEIGHTS: Record<Season, [number, number, number, number]> = {
  spring: [0.4, 0.3, 0.3, 0.0],
  summer: [0.6, 0.25, 0.15, 0.0],
  autumn: [0.25, 0.4, 0.35, 0.0],
  winter: [0.2, 0.3, 0.1, 0.4],
};
const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy'];

export function pickWeather(season: Season): WeatherType {
  const weights = SEASON_WEIGHTS[season];
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return WEATHER_TYPES[i]!;
  }
  return 'sunny';
}

export const WEATHER_LABEL: Record<WeatherType, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧',
  snowy: '❄️',
};

export interface WeatherState {
  current: WeatherType;
}

export interface WeatherActions {
  advanceWeather: (season: Season) => void;
  reset: () => void;
}

export const useWeatherStore = create<WeatherState & WeatherActions>((set) => ({
  current: 'sunny',
  advanceWeather: (season) => set({ current: pickWeather(season) }),
  reset: () => set({ current: 'sunny' }),
}));

if (import.meta.env.DEV) {
  (window as unknown as { __weather: typeof useWeatherStore }).__weather = useWeatherStore;
}
