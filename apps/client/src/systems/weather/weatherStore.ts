import { create } from 'zustand';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy';

export const WEATHER_META: Record<
  WeatherType,
  { label: string; emoji: string; growthMod: number }
> = {
  sunny: { label: 'Ensolarado', emoji: '☀️', growthMod: 1.0 },
  cloudy: { label: 'Nublado', emoji: '☁️', growthMod: 0.9 },
  rainy: { label: 'Chuvoso', emoji: '🌧️', growthMod: 1.2 },
  stormy: { label: 'Tempestade', emoji: '⛈️', growthMod: 0.7 },
};

export interface WeatherState {
  today: WeatherType;
  tomorrow: WeatherType;
}

export interface WeatherActions {
  advanceDay: (seed: number, seasonIndex: number) => void;
  reset: () => void;
}

export function pickWeather(seed: number, seasonIndex: number): WeatherType {
  const hash = (seed * 1103515245 + 12345) & 0x7fffffff;
  const tables: WeatherType[][] = [
    ['sunny', 'sunny', 'sunny', 'cloudy', 'cloudy', 'rainy', 'rainy'],
    ['sunny', 'sunny', 'sunny', 'sunny', 'cloudy', 'cloudy', 'rainy'],
    ['cloudy', 'cloudy', 'cloudy', 'rainy', 'rainy', 'rainy', 'stormy'],
    ['cloudy', 'rainy', 'rainy', 'stormy', 'stormy', 'stormy', 'stormy'],
  ];
  const idx = ((seasonIndex % 4) + 4) % 4;
  const weights: WeatherType[] = tables[idx] ?? ['sunny'];
  return weights[hash % weights.length] ?? 'sunny';
}

export const useWeatherStore = create<WeatherState & WeatherActions>((set) => ({
  today: 'sunny',
  tomorrow: 'sunny',
  advanceDay: (seed: number, seasonIndex: number) =>
    set((state) => ({
      today: state.tomorrow,
      tomorrow: pickWeather(seed + 1, seasonIndex),
    })),
  reset: () => set({ today: 'sunny', tomorrow: 'sunny' }),
}));

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__weather = useWeatherStore;
}
