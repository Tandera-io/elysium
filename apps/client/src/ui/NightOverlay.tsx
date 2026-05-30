/**
 * NightOverlay — a full-screen CSS div that darkens the game world at night.
 *
 * Uses useEnvironmentSystem() to derive the current nightOverlayOpacity from
 * the in-game hour. Fades smoothly from 0 (day) to ~0.55 opacity (deep night).
 * The overlay is pointer-events:none so it never blocks interaction.
 */
import { useEnvironmentSystem } from '../systems/environment/EnvironmentSystem';

export function NightOverlay() {
  const { modifiers, phase } = useEnvironmentSystem();
  const opacity = modifiers.nightOverlayOpacity;

  if (opacity <= 0.01) return null;

  // During dusk, tint is warm amber; during night it's cold blue-black.
  const color = phase === 'dusk' ? '30, 15, 5' : '5, 10, 25';

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `rgba(${color}, ${opacity})`,
        pointerEvents: 'none',
        transition: 'background 2s ease',
        zIndex: 10,
      }}
    />
  );
}
