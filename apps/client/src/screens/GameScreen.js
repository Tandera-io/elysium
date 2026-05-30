// /Users/ngs/Desktop/NGS 2.0/elysium/apps/client/src/screens/GameScreen.js
//
// GameScreen — wraps the R3F Scene canvas and applies a full-screen DOM
// lighting overlay that shifts colour and opacity based on the current game
// time (day/night cycle).
//
// Rendering layers (bottom → top):
//   1. <Scene />            — R3F canvas (position:absolute, inset:0)
//   2. Lighting overlay div — full-screen tinted transparent div (z-index 10)
//   3. Children / HUD       — interactive UI passed as props.children (z-index 20+)
//
// The overlay is pointer-events:none so it never blocks mouse/touch input.

import React from 'react';
import { Scene } from '../engine/scene/Scene';
import { useLightingOverlay } from '../stores/timeStore';
import { NPCDialog } from '../components/NPCDialog';

/**
 * GameScreen
 *
 * Props:
 *   children — optional HUD/overlay React nodes rendered above the lighting
 *              overlay (e.g. Hotbar, DialogueBox, etc.)
 *   style    — optional additional styles for the root container
 *   className — optional additional class names for the root container
 */
export function GameScreen({ children, style, className }) {
  const { color, opacity } = useLightingOverlay();

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Layer 1 — Three.js canvas (rendered by Scene, position:absolute inset:0) */}
      <Scene />

      {/* Layer 2 — Day/night lighting overlay */}
      <div
        aria-hidden="true"
        data-testid="lighting-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          backgroundColor: color,
          opacity: opacity,
          pointerEvents: 'none',
          // Smooth the colour/opacity transition so rapid time-skips don't
          // produce jarring flashes.  The CSS transition is intentionally short
          // (0.3 s) so it looks responsive during normal play.
          transition: 'background-color 0.3s ease, opacity 0.3s ease',
        }}
      />

      {/* Layer 3 — NPC dialogue overlay */}
      <NPCDialog />

      {/* Layer 4 — HUD / UI children sit above the lighting tint */}
      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            pointerEvents: 'none', // children that need interaction must set their own pointer-events
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default GameScreen;
