/**
 * CropDisplay — 2D React component for crop growth animation.
 *
 * Renders a crop at any growth stage with CSS keyframe animations.
 * Can be embedded in inventory panels, farm overlays, or tooltip UIs.
 *
 * Growth stages progress seed → sprout → growing → harvest-ready.
 * The "harvest-ready" stage pulses with a golden glow to attract the player.
 *
 * Props:
 *   cropId       — one of 'wheat'|'tomato'|'pumpkin'|'corn'|'strawberry'
 *   daysGrown    — how many days the crop has grown (maps to stage)
 *   daysToMature — total days until harvest (from CropDef.daysToMature)
 *   totalStages  — number of growth stages (from CropDef.stages.length)
 *   size         — pixel size of the rendered square (default 64)
 *   showLabel    — whether to show the stage label below the sprite (default false)
 *   animate      — play breathing/pulse CSS animation (default true)
 */

import { useMemo } from 'react';

// Inline styles are used to avoid requiring a CSS module or Tailwind for this
// standalone component. The keyframe rule is injected once into the document head.

const KEYFRAMES_ID = 'crop-display-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes cropBreath {
      0%, 100% { transform: scaleY(1.00) translateY(0px); }
      50%       { transform: scaleY(1.04) translateY(-1px); }
    }
    @keyframes cropPulseGlow {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(255, 210, 50, 0.6)); }
      50%       { filter: drop-shadow(0 0 8px rgba(255, 210, 50, 1.0)); }
    }
    @keyframes cropGrow {
      from { transform: scaleY(0.7) translateY(15%); opacity: 0.5; }
      to   { transform: scaleY(1.0) translateY(0%);  opacity: 1.0; }
    }
  `;
  document.head.appendChild(style);
}

// Stage label names
const STAGE_LABELS = ['Semente', 'Broto', 'Crescendo', 'Maduro', 'Pronto'];

/**
 * Compute which visual stage index (0..3) the crop is in, based on
 * daysGrown, daysToMature, and totalStages. Stage 0 = seed, last = harvest.
 */
function computeStageIndex(daysGrown, daysToMature, totalStages) {
  if (totalStages <= 1) return 0;
  if (daysGrown <= 0) return 0;
  if (daysGrown >= daysToMature) return totalStages - 1;
  return Math.min(Math.floor((daysGrown / daysToMature) * totalStages), totalStages - 1);
}

/** Map a crop + stage index to the public URL for the sprite. */
function spritePath(cropId, stageIndex) {
  return `/assets/crops/${cropId}_stage${stageIndex}.png`;
}

/** Vertical scale per stage — seed is tiny, mature is full-size. */
function heightForStage(stageIndex, totalStages) {
  const t = totalStages <= 1 ? 1 : stageIndex / (totalStages - 1);
  return 0.3 + 0.7 * t; // 30% at stage 0, 100% at last stage
}

export function CropDisplay({
  cropId,
  daysGrown = 0,
  daysToMature = 4,
  totalStages = 4,
  size = 64,
  showLabel = false,
  animate = true,
}) {
  // Inject CSS keyframes once
  useMemo(() => injectKeyframes(), []);

  const stageIndex = computeStageIndex(daysGrown, daysToMature, totalStages);
  const isHarvestReady = stageIndex >= totalStages - 1 && daysGrown >= daysToMature;
  const heightScale = heightForStage(stageIndex, totalStages);
  const imgSrc = spritePath(cropId, stageIndex);

  const containerStyle = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    width: size,
  };

  const imgWrapStyle = {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const imgStyle = {
    width: size * heightScale,
    height: size * heightScale,
    imageRendering: 'pixelated',
    // Use CSS variable so animation names can stack
    animation: animate
      ? isHarvestReady
        ? 'cropPulseGlow 1.4s ease-in-out infinite, cropBreath 2.0s ease-in-out infinite'
        : 'cropBreath 3.0s ease-in-out infinite'
      : 'none',
    // Entrance animation — trigger on stage change via key
    animationFillMode: 'both',
  };

  const labelStyle = {
    fontSize: 10,
    color: isHarvestReady ? '#f0c030' : '#a0b080',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 1,
  };

  const stageLabel = STAGE_LABELS[Math.min(stageIndex, STAGE_LABELS.length - 1)];

  return (
    <div
      style={containerStyle}
      aria-label={`Cultivo de ${cropId}, estágio ${stageIndex + 1} de ${totalStages}`}
    >
      <div style={imgWrapStyle}>
        {/* key on stageIndex triggers re-mount → CSS entrance animation replays */}
        <img
          key={`${cropId}-${stageIndex}`}
          src={imgSrc}
          alt={`${cropId} stage ${stageIndex}`}
          style={{
            ...imgStyle,
            animation: animate ? `cropGrow 0.4s ease-out, ${imgStyle.animation}` : 'none',
          }}
          draggable={false}
        />
      </div>
      {showLabel && <span style={labelStyle}>{stageLabel}</span>}
    </div>
  );
}

/**
 * CropGrowthBar — horizontal progress bar showing days grown vs. days to mature.
 * Optional companion to CropDisplay.
 */
export function CropGrowthBar({ daysGrown, daysToMature, width = 64 }) {
  const pct = Math.min(daysGrown / Math.max(daysToMature, 1), 1) * 100;
  const isReady = daysGrown >= daysToMature;

  const barStyle = {
    width,
    height: 5,
    background: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  };

  const fillStyle = {
    width: `${pct}%`,
    height: '100%',
    background: isReady ? '#f0c030' : '#60a840',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  };

  return (
    <div style={barStyle} title={`${daysGrown}/${daysToMature} dias`}>
      <div style={fillStyle} />
    </div>
  );
}

export default CropDisplay;
