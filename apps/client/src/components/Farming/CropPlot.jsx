/**
 * CropPlot — multi-crop seasonal farming UI.
 *
 * Displays a grid of farm plots. Each plot cycles through:
 *   empty → planted → growing → ready → (harvest) → empty
 *
 * Clicking an empty plot opens a crop-picker modal.
 * Clicking a ready-to-harvest plot immediately harvests it.
 * Clicking a wilted plot clears it.
 * An "Advance Day" button drives the day/season cycle for testing.
 */

import { useState } from 'react';
import {
  useSeasonalFarmStore,
  CROP_CATALOGUE,
  SEASON_LABEL,
  DAYS_PER_SEASON,
  seasonFromDay,
  dayInSeason,
  yearFromDay,
} from '../../features/farming/farmStore.js';

// ─── Visual config ────────────────────────────────────────────────────────────

/** CSS background colours keyed by plot state. */
const STATE_BG = {
  empty: '#3b2f1e',
  planted: '#4a3b24',
  growing: '#4f5e25',
  ready: '#7a9e1a',
  wilted: '#5a3a2a',
};

/** Border accent keyed by plot state. */
const STATE_BORDER = {
  empty: '#5a4a2a',
  planted: '#7a6640',
  growing: '#8aab30',
  ready: '#aacc22',
  wilted: '#8b4513',
};

/** Growth-progress emoji indicators. */
function growthEmoji(plot) {
  if (plot.wilted) return '💀';
  if (!plot.cropType) return '';
  if (plot.readyToHarvest) return '✨';
  const def = CROP_CATALOGUE[plot.cropType];
  if (!def) return '?';
  const pct = plot.daysGrown / def.daysToMature;
  if (pct < 0.25) return '🌱';
  if (pct < 0.6) return '🌿';
  return '🌳';
}

function plotState(plot) {
  if (plot.wilted) return 'wilted';
  if (!plot.cropType) return 'empty';
  if (plot.readyToHarvest) return 'ready';
  if (plot.daysGrown === 0) return 'planted';
  return 'growing';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div
      style={{
        width: '100%',
        height: 6,
        background: '#2a2215',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 4,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: pct >= 100 ? '#aacc22' : '#6a9e20',
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

/** A single farm plot tile. */
function PlotTile({ plot, onClickEmpty, onClickReady, onClickWilted }) {
  const state = plotState(plot);
  const def = plot.cropType ? CROP_CATALOGUE[plot.cropType] : null;

  function handleClick() {
    if (state === 'empty') onClickEmpty(plot.id);
    else if (state === 'ready') onClickReady(plot.id);
    else if (state === 'wilted') onClickWilted(plot.id);
  }

  const clickable = state === 'empty' || state === 'ready' || state === 'wilted';

  return (
    <div
      onClick={handleClick}
      style={{
        background: STATE_BG[state],
        border: `2px solid ${STATE_BORDER[state]}`,
        borderRadius: 10,
        padding: '10px 8px 8px',
        cursor: clickable ? 'pointer' : 'default',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minHeight: 100,
        transition: 'transform 0.1s, box-shadow 0.1s',
        boxShadow: clickable ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.transform = 'scale(1.04)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = clickable ? '0 2px 8px rgba(0,0,0,0.4)' : 'none';
      }}
      title={
        state === 'empty'
          ? 'Click to plant a crop'
          : state === 'ready'
            ? 'Click to harvest!'
            : state === 'wilted'
              ? 'Click to clear wilted crop'
              : undefined
      }
    >
      {/* Main emoji */}
      <span style={{ fontSize: 28, lineHeight: 1 }}>
        {state === 'empty' ? '🟫' : (def?.emoji ?? '🌱')}
      </span>

      {/* Growth indicator */}
      {plot.cropType && <span style={{ fontSize: 16, lineHeight: 1 }}>{growthEmoji(plot)}</span>}

      {/* Crop name */}
      <span
        style={{
          fontSize: 11,
          color: state === 'wilted' ? '#c87a50' : '#d4c090',
          fontFamily: 'monospace',
          textAlign: 'center',
        }}
      >
        {state === 'empty'
          ? '+ plant'
          : state === 'wilted'
            ? `${def?.name ?? ''} (wilted)`
            : (def?.name ?? '')}
      </span>

      {/* Progress bar */}
      {plot.cropType && !plot.wilted && (
        <ProgressBar value={plot.daysGrown} max={def?.daysToMature ?? 1} />
      )}

      {/* Days info */}
      {plot.cropType && !plot.wilted && (
        <span style={{ fontSize: 10, color: '#8a7a50', fontFamily: 'monospace' }}>
          {plot.readyToHarvest ? 'Ready!' : `day ${plot.daysGrown}/${def?.daysToMature ?? '?'}`}
        </span>
      )}

      {/* Planted season badge */}
      {plot.plantedSeason && !plot.wilted && (
        <span style={{ fontSize: 9, color: '#6a5a30', fontFamily: 'monospace' }}>
          planted: {plot.plantedSeason}
        </span>
      )}
    </div>
  );
}

/** Crop-picker modal. */
function CropPickerModal({ currentSeason, onPick, onClose }) {
  const cropList = Object.values(CROP_CATALOGUE);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e1610',
          border: '2px solid #7a6030',
          borderRadius: 14,
          padding: 24,
          minWidth: 320,
          maxWidth: 480,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: '0 0 6px',
            color: '#e8c878',
            fontFamily: 'monospace',
            fontSize: 16,
          }}
        >
          Choose a crop to plant
        </h3>
        <p style={{ margin: '0 0 16px', color: '#8a7a50', fontFamily: 'monospace', fontSize: 12 }}>
          Current season:{' '}
          <strong style={{ color: '#c8a84a' }}>{SEASON_LABEL[currentSeason]}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {cropList.map((def) => {
            const inSeason = def.seasons.includes(currentSeason);
            return (
              <button
                key={def.id}
                onClick={() => inSeason && onPick(def.id)}
                disabled={!inSeason}
                style={{
                  background: inSeason ? '#2e2415' : '#1a1510',
                  border: `2px solid ${inSeason ? '#7a6030' : '#3a2e1a'}`,
                  borderRadius: 10,
                  padding: '10px 6px',
                  cursor: inSeason ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  opacity: inSeason ? 1 : 0.4,
                  color: inSeason ? '#d4c090' : '#5a4a2a',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 26 }}>{def.emoji}</span>
                <span style={{ fontWeight: 'bold' }}>{def.name}</span>
                <span style={{ color: '#8a7a50', fontSize: 10 }}>
                  {def.daysToMature}d · ×{def.yieldQuantity}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: inSeason ? '#6a9e20' : '#7a4a2a',
                  }}
                >
                  {def.seasons.join(', ')}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            background: '#2e2415',
            border: '1px solid #5a4a2a',
            borderRadius: 8,
            padding: '8px 0',
            color: '#8a7a50',
            fontFamily: 'monospace',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Harvest log ─────────────────────────────────────────────────────────────

function HarvestLog({ log }) {
  if (!log.length) return null;
  return (
    <div
      style={{
        marginTop: 12,
        background: '#1a1e0a',
        border: '1px solid #4a6010',
        borderRadius: 8,
        padding: '8px 12px',
        maxHeight: 100,
        overflowY: 'auto',
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          color: '#8aac20',
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 'bold',
        }}
      >
        Harvest log
      </p>
      {log
        .slice()
        .reverse()
        .map((entry, i) => (
          <div key={i} style={{ color: '#9ab840', fontFamily: 'monospace', fontSize: 11 }}>
            Day {entry.day} — {CROP_CATALOGUE[entry.cropType]?.emoji}{' '}
            {CROP_CATALOGUE[entry.cropType]?.name} ×{entry.quantity}
          </div>
        ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * CropPlot — renders the seasonal farming UI.
 *
 * Props:
 *   className  — optional extra CSS class for the outer wrapper
 *   style      — optional extra inline styles for the outer wrapper
 */
export default function CropPlot({ className, style }) {
  const day = useSeasonalFarmStore((s) => s.day);
  const plots = useSeasonalFarmStore((s) => s.plots);
  const plantCrop = useSeasonalFarmStore((s) => s.plantCrop);
  const harvestCrop = useSeasonalFarmStore((s) => s.harvestCrop);
  const clearPlot = useSeasonalFarmStore((s) => s.clearPlot);
  const advanceDay = useSeasonalFarmStore((s) => s.advanceDay);
  const addPlot = useSeasonalFarmStore((s) => s.addPlot);
  const reset = useSeasonalFarmStore((s) => s.reset);

  const currentSeason = seasonFromDay(day);
  const currentDayInSeason = dayInSeason(day);
  const currentYear = yearFromDay(day);

  const [pickerPlotId, setPickerPlotId] = useState(null);
  const [harvestLog, setHarvestLog] = useState([]);

  function handleEmptyClick(plotId) {
    setPickerPlotId(plotId);
  }

  function handleCropPick(cropType) {
    if (pickerPlotId) {
      plantCrop(pickerPlotId, cropType);
      setPickerPlotId(null);
    }
  }

  function handleReadyClick(plotId) {
    const result = harvestCrop(plotId);
    if (result) {
      setHarvestLog((prev) => [...prev, { ...result, day }]);
    }
  }

  function handleWiltedClick(plotId) {
    clearPlot(plotId);
  }

  const seasonBadgeColors = {
    spring: '#4a9e4a',
    summer: '#e8a020',
    fall: '#c85020',
    winter: '#4a7aaa',
  };

  return (
    <div
      className={className}
      style={{
        fontFamily: 'monospace',
        background: '#12100a',
        border: '2px solid #5a4a2a',
        borderRadius: 16,
        padding: 20,
        maxWidth: 600,
        margin: '0 auto',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#e8c878', fontSize: 18 }}>Farm Plots</h2>
          <div style={{ color: '#9a8a50', fontSize: 12, marginTop: 2 }}>
            Year {currentYear} · Day {currentDayInSeason}/{DAYS_PER_SEASON}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Season badge */}
          <span
            style={{
              background: seasonBadgeColors[currentSeason],
              color: '#fff',
              borderRadius: 20,
              padding: '3px 12px',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            {SEASON_LABEL[currentSeason]}
          </span>

          {/* Advance Day button */}
          <button
            onClick={advanceDay}
            style={{
              background: '#3a2e1a',
              border: '2px solid #7a6030',
              borderRadius: 8,
              padding: '5px 14px',
              color: '#e8c878',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#4e3e22')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#3a2e1a')}
            title="Advance one game day"
          >
            Next Day →
          </button>
        </div>
      </div>

      {/* Season progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#6a5a30',
            fontSize: 10,
            marginBottom: 3,
          }}
        >
          <span>Season progress</span>
          <span>
            {currentDayInSeason}/{DAYS_PER_SEASON} days
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: '#2a2010',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(currentDayInSeason / DAYS_PER_SEASON) * 100}%`,
              background: seasonBadgeColors[currentSeason],
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Plot grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {plots.map((plot) => (
          <PlotTile
            key={plot.id}
            plot={plot}
            onClickEmpty={handleEmptyClick}
            onClickReady={handleReadyClick}
            onClickWilted={handleWiltedClick}
          />
        ))}

        {/* Add plot button */}
        <button
          onClick={addPlot}
          style={{
            background: '#1e1a10',
            border: '2px dashed #4a3a1a',
            borderRadius: 10,
            padding: 10,
            cursor: 'pointer',
            color: '#5a4a2a',
            fontFamily: 'monospace',
            fontSize: 22,
            minHeight: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#7a6030';
            e.currentTarget.style.color = '#9a8040';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#4a3a1a';
            e.currentTarget.style.color = '#5a4a2a';
          }}
          title="Add a new plot"
        >
          +
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          fontSize: 10,
          color: '#6a5a30',
        }}
      >
        <span>🟫 empty</span>
        <span>🌱 planted</span>
        <span>🌿 growing</span>
        <span>✨ ready</span>
        <span>💀 wilted</span>
      </div>

      {/* Harvest log */}
      <HarvestLog log={harvestLog} />

      {/* Reset button */}
      <button
        onClick={() => {
          reset();
          setHarvestLog([]);
        }}
        style={{
          marginTop: 14,
          background: 'transparent',
          border: '1px solid #3a2e1a',
          borderRadius: 6,
          padding: '4px 10px',
          color: '#5a4a2a',
          fontFamily: 'monospace',
          fontSize: 10,
          cursor: 'pointer',
        }}
      >
        Reset farm
      </button>

      {/* Crop picker modal */}
      {pickerPlotId && (
        <CropPickerModal
          currentSeason={currentSeason}
          onPick={handleCropPick}
          onClose={() => setPickerPlotId(null)}
        />
      )}
    </div>
  );
}
