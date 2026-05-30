// apps/client/src/hooks/useWeather.js
//
// Convenience hook that exposes the current weather state and derived helpers
// to React components.
//
// Returns:
//   weather              — WeatherType: 'sunny'|'cloudy'|'rainy'|'stormy'
//   weatherLabel         — Localised name (Portuguese)
//   weatherIcon          — Emoji icon
//   effects              — { cropGrowthMultiplier, playerSpeedMultiplier }
//   cropGrowthMultiplier — shorthand number
//   playerSpeedMultiplier — shorthand number
//   isRainy              — boolean; true for rainy or stormy
//   description          — Short effect description string for display

import {
  useLightingStore,
  WEATHER_LABEL,
  WEATHER_ICON,
  WEATHER_EFFECTS,
} from '../stores/timeStore';

export function useWeather() {
  const weather = useLightingStore((s) => s.weather);
  const effects = WEATHER_EFFECTS[weather] ?? WEATHER_EFFECTS.sunny;

  const isRainy = weather === 'rainy' || weather === 'stormy';
  const isStormy = weather === 'stormy';

  let description;
  if (isStormy) {
    description = 'Crescimento -20% · Velocidade -20%';
  } else if (weather === 'rainy') {
    description = 'Crescimento +20% · Velocidade -10%';
  } else {
    description = 'Condições normais';
  }

  return {
    weather,
    weatherLabel: WEATHER_LABEL[weather] ?? weather,
    weatherIcon: WEATHER_ICON[weather] ?? '?',
    effects,
    cropGrowthMultiplier: effects.cropGrowthMultiplier,
    playerSpeedMultiplier: effects.playerSpeedMultiplier,
    isRainy,
    isStormy,
    description,
  };
}
