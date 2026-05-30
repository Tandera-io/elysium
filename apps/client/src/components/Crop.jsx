/**
 * Crop — animated crop tile for the farming UI.
 *
 * Renders a single crop plot tile with a CSS animation keyed to its current
 * growth stage.  Stage transitions trigger a brief flash so the change is
 * immediately legible.
 *
 * Stages (matching cropGrowth.js):
 *   0 = seed         → pulse
 *   1 = sprout       → sway (small)
 *   2 = young        → sway (wider)
 *   3 = mature       → bob
 *   4 = harvestable  → golden glow
 *   wilted           → droop
 *
 * Props:
 *   emoji          string   — crop emoji character
 *   name           string   — display name
 *   stage          0-4      — current growth stage index
 *   stageName      string   — 'seed'|'sprout'|'young'|'mature'|'harvestable'
 *   daysGrown      number
 *   daysToMature   number
 *   wilted         boolean
 *   wateredToday   boolean
 *   readyToHarvest boolean
 *   onClick        () => void (optional)
 *   compact        boolean  — smaller size for sidebars
 *   stageColor     string   — hex fill for progress bar
 */

import { useEffect, useRef, useState } from 'react';
import '../styles/Crop.css';

// ─── Stage colours (border + progress bar) ────────────────────────────────────

const STAGE_COLORS = {
  0: '#5a4a2a',
  1: '#7caf3e',
  2: '#5e9b2e',
  3: '#c2c44a',
  4: '#aacc22',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Crop({
  emoji,
  name,
  stage = 0,
  stageName: stageLabel = 'seed',
  daysGrown = 0,
  daysToMature = 1,
  wilted = false,
  wateredToday = false,
  readyToHarvest = false,
  onClick,
  compact = false,
  stageColor,
}) {
  const prevStage = useRef(stage);
  const [advancing, setAdvancing] = useState(false);

  // Flash the emoji when the stage index increases (growth advance).
  useEffect(() => {
    if (stage > prevStage.current) {
      setAdvancing(true);
      const id = setTimeout(() => setAdvancing(false), 520);
      prevStage.current = stage;
      return () => clearTimeout(id);
    }
    prevStage.current = stage;
  }, [stage]);

  const isInteractive = Boolean(onClick);
  const barColor = wilted
    ? '#8b4513'
    : readyToHarvest
      ? '#aacc22'
      : (stageColor ?? STAGE_COLORS[stage] ?? '#6a9e20');

  const borderColor = wilted
    ? '#8b4513'
    : readyToHarvest
      ? '#aacc22'
      : wateredToday
        ? '#4a8aaa'
        : (STAGE_COLORS[stage] ?? '#5a4a2a');

  const bgColor = wilted ? '#2a1510' : readyToHarvest ? '#1e2a08' : '#1a1610';

  const pct = Math.min(
    100,
    Math.round((Math.min(daysGrown, daysToMature) / Math.max(1, daysToMature)) * 100),
  );
  const emojiSize = compact ? 22 : 26;
  const stageClass = wilted ? 'crop-tile--wilted' : `crop-tile--${stageLabel}`;

  return (
    <div
      className={[
        'crop-tile',
        stageClass,
        isInteractive ? 'crop-tile--interactive' : '',
        compact ? 'crop-tile--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      title={
        readyToHarvest
          ? 'Click to harvest!'
          : wilted
            ? 'Click to clear'
            : wateredToday
              ? 'Watered today'
              : undefined
      }
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        minHeight: compact ? 80 : 100,
      }}
    >
      {/* Watered indicator */}
      {wateredToday && !wilted && <div className="crop-water-dot" title="Watered today" />}

      {/* Animated crop emoji */}
      <span
        className={['crop-emoji', advancing ? 'crop-tile--advancing' : '']
          .filter(Boolean)
          .join(' ')}
        style={{ fontSize: emojiSize }}
      >
        {wilted ? '💀' : emoji}
      </span>

      {/* Crop name */}
      <span
        className="crop-name"
        style={{
          fontSize: 10,
          color: wilted ? '#c87a50' : '#d4c090',
        }}
      >
        {wilted ? `${name} (wilted)` : name}
      </span>

      {/* Stage label (full mode only) */}
      {!compact && !wilted && <span className="crop-stage-label">{stageLabel}</span>}

      {/* Growth bar */}
      {!wilted && (
        <div className="crop-bar-track">
          <div className="crop-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      )}

      {/* Days info */}
      {!wilted && (
        <span className="crop-days">
          {readyToHarvest ? 'Ready!' : `${daysGrown.toFixed(1)}/${daysToMature}d`}
        </span>
      )}
    </div>
  );
}
