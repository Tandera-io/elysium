/**
 * Hoe tool components:
 * - `Hoe`: a compact 2D slot icon for the inventory panel
 * - `HoeOverlay`: a 3D R3F component that shows the hoe in the world scene
 *   when the player has the hoe selected (currently a no-op placeholder).
 */

interface HoeProps {
  /** When true, renders a small icon suitable for a 40×40 inventory slot. */
  compact?: boolean;
}

export function Hoe({ compact }: HoeProps) {
  if (compact) {
    return (
      <span
        aria-label="Enxada"
        role="img"
        style={{ fontSize: '1.25rem', lineHeight: 1, userSelect: 'none' }}
      >
        ⛏️
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span aria-label="Enxada" role="img" className="text-3xl">
        ⛏️
      </span>
      <span className="text-xs text-slate-300">Enxada</span>
    </div>
  );
}

/**
 * Renders nothing in the 3D scene for now — placeholder for future hoe
 * world-space animation (e.g., a swinging sprite overlay).
 */
export function HoeOverlay() {
  return null;
}
