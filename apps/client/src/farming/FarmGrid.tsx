/**
 * FarmGrid — interactive 2-D overlay showing farm plots.
 *
 * Each cell reflects the underlying farmStore tile state:
 *   - empty   → bare dirt; click to till
 *   - tilled  → tilled soil; click to plant the selected crop
 *   - growing → colored crop indicator with a progress bar
 *   - ready   → pulsing highlight; click to harvest
 *
 * The selected crop to plant is managed by local state (a mini toolbar inside
 * this component) so the grid is self-contained and can be dropped anywhere.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  useFarmState,
  FARM_GRID_COLS,
  type FarmPlot,
  type PlotStatus,
} from '../states/useFarmState';
import { CROPS } from '../systems/farming/CropDefs';
import type { CropId, CropDef } from '../systems/farming/CropDefs';
import { SEASON_LABEL } from '../systems/time/timeStore';
import type { TileCoord } from '../engine/world/WorldGrid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCropDef(id: CropId): CropDef {
  return CROPS[id] as CropDef;
}

function cropInSeason(_id: CropId, _season: string): boolean {
  return true;
}

const CROP_EMOJI: Record<CropId, string> = {
  wheat: '\u{1F33E}',
  tomato: '\u{1F345}',
  pumpkin: '\u{1F383}',
  corn: '\u{1F33D}',
  strawberry: '\u{1F353}',
};

const STATUS_LABEL: Record<PlotStatus, string> = {
  empty: 'Vazio',
  tilled: 'Arado',
  growing: 'Crescendo',
  ready: 'Pronto',
};

// ─── Cell ─────────────────────────────────────────────────────────────────────

interface CellProps {
  plot: FarmPlot;
  selected: boolean;
  onClickPlot: (coord: TileCoord) => void;
}

function PlotCell({ plot, selected, onClickPlot }: CellProps) {
  const { status, cropId, stageColor, growthProgress, daysGrown, daysToMature, watered } = plot;

  let bg = '#4a3728';
  if (status === 'tilled') bg = '#6b4f3a';
  if (status === 'growing' && stageColor) bg = stageColor;
  if (status === 'ready' && stageColor) bg = stageColor;

  const borderColor =
    status === 'ready'
      ? '#fcd34d'
      : selected
        ? '#6ee7b7'
        : status === 'tilled'
          ? '#a8714a'
          : '#3d2d1e';

  const cropName = cropId ? getCropDef(cropId).name : '';

  return (
    <button
      onClick={() => onClickPlot(plot.coord)}
      title={`[${plot.coord.x},${plot.coord.z}] ${STATUS_LABEL[status]}${cropName ? ` — ${cropName}` : ''}`}
      style={{
        width: 56,
        height: 56,
        background: bg,
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s',
        outline: 'none',
        boxShadow: status === 'ready' ? '0 0 8px 2px #fcd34d88' : 'none',
      }}
    >
      {status === 'empty' && <span style={{ fontSize: 18, opacity: 0.5 }}>&#x1F332;</span>}
      {status === 'tilled' && (
        <span style={{ fontSize: 18, opacity: watered ? 1 : 0.55 }}>
          {watered ? '\u{1F4A7}' : '\u{1F6A7}'}
        </span>
      )}
      {(status === 'growing' || status === 'ready') && cropId && (
        <span style={{ fontSize: 20 }}>{CROP_EMOJI[cropId]}</span>
      )}

      {(status === 'growing' || status === 'ready') && daysGrown !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 3,
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#fff',
            background: 'rgba(0,0,0,0.55)',
            borderRadius: 3,
            padding: '0 2px',
          }}
        >
          {daysGrown}/{daysToMature}
        </span>
      )}

      {status === 'growing' && growthProgress !== undefined && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 4,
            width: '100%',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.round(growthProgress * 100)}%`,
              background: '#86efac',
              transition: 'width 0.3s',
            }}
          />
        </div>
      )}

      {status === 'ready' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid #fcd34d',
            borderRadius: 4,
            pointerEvents: 'none',
            animation: 'farmReadyPulse 1.2s ease-in-out infinite',
          }}
        />
      )}
    </button>
  );
}

// ─── Crop picker toolbar ──────────────────────────────────────────────────────

interface CropPickerProps {
  selectedCrop: CropId;
  onSelect: (id: CropId) => void;
  currentSeason: string;
}

function CropPicker({ selectedCrop, onSelect, currentSeason }: CropPickerProps) {
  const allIds = Object.keys(CROPS) as CropId[];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {allIds.map((id) => {
        const def = getCropDef(id);
        const inSeason = cropInSeason(id, currentSeason);
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={def.name}
            style={{
              padding: '4px 8px',
              background: selectedCrop === id ? '#1e40af' : 'rgba(255,255,255,0.1)',
              border: selectedCrop === id ? '2px solid #60a5fa' : '2px solid transparent',
              borderRadius: 8,
              color: inSeason ? '#e2e8f0' : '#64748b',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: inSeason ? 'none' : 'line-through',
              outline: 'none',
            }}
          >
            <span>{CROP_EMOJI[id]}</span>
            <span>{def.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Action mode picker ───────────────────────────────────────────────────────

type ActionMode = 'plant' | 'water' | 'harvest';

interface ActionPickerProps {
  mode: ActionMode;
  onMode: (m: ActionMode) => void;
}

function ActionPicker({ mode, onMode }: ActionPickerProps) {
  const options: { id: ActionMode; label: string; icon: string }[] = [
    { id: 'plant', label: 'Plantar', icon: '\u{1F331}' },
    { id: 'water', label: 'Regar', icon: '\u{1F4A7}' },
    { id: 'harvest', label: 'Colher', icon: '\u{1FAB4}' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onMode(o.id)}
          style={{
            padding: '4px 10px',
            background: mode === o.id ? '#065f46' : 'rgba(255,255,255,0.08)',
            border: mode === o.id ? '2px solid #34d399' : '2px solid transparent',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            outline: 'none',
          }}
        >
          <span>{o.icon}</span>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        fontSize: 11,
        color: '#a3e635',
        fontFamily: 'monospace',
        padding: '2px 0',
        minHeight: 16,
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  );
}

// ─── FarmGrid ─────────────────────────────────────────────────────────────────

export interface FarmGridProps {
  asOverlay?: boolean;
  onClose?: () => void;
}

export function FarmGrid({ asOverlay = false, onClose }: FarmGridProps) {
  const [selectedCrop, setSelectedCrop] = useState<CropId>('wheat');
  const [mode, setMode] = useState<ActionMode>('plant');
  const [selectedCoord, setSelectedCoord] = useState<TileCoord | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const { plots, day, season, quickPlant, waterPlot, harvestPlot } = useFarmState();

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 2200);
  }

  function handleClickPlot(coord: TileCoord) {
    setSelectedCoord(coord);
    const plot = plots.find((p) => p.coord.x === coord.x && p.coord.z === coord.z);
    if (!plot) return;

    if (mode === 'plant') {
      if (plot.status === 'empty' || plot.status === 'tilled') {
        const ok = quickPlant(coord, selectedCrop);
        const name = getCropDef(selectedCrop).name;
        flash(ok ? `Plantou ${name} em [${coord.x},${coord.z}]` : `Sem sementes de ${name}`);
      } else if (plot.status === 'ready') {
        const result = harvestPlot(coord);
        if (result) flash(`Colheu ${result.quantity}x ${getCropDef(result.crop).name}!`);
      } else {
        flash('Parcela ja plantada');
      }
    } else if (mode === 'water') {
      const ok = waterPlot(coord);
      flash(ok ? `Regou [${coord.x},${coord.z}]` : 'Nao foi possivel regar');
    } else if (mode === 'harvest') {
      if (plot.status === 'ready') {
        const result = harvestPlot(coord);
        if (result) flash(`Colheu ${result.quantity}x ${getCropDef(result.crop).name}!`);
      } else {
        flash('Nenhuma cultura pronta aqui');
      }
    }
  }

  const seasonLabel = SEASON_LABEL[season as keyof typeof SEASON_LABEL] ?? season;

  const containerStyle: CSSProperties = asOverlay
    ? { position: 'fixed', bottom: 80, right: 16, zIndex: 50 }
    : { display: 'inline-block' };

  return (
    <>
      <style>{`@keyframes farmReadyPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div
        style={{
          ...containerStyle,
          background: 'rgba(15,23,42,0.88)',
          backdropFilter: 'blur(8px)',
          borderRadius: 14,
          padding: 12,
          color: '#e2e8f0',
          fontFamily: 'system-ui,sans-serif',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          minWidth: FARM_GRID_COLS * 64,
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24' }}>
            Fazenda — {seasonLabel}, Dia {day}
          </span>
          {asOverlay && onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 16,
                padding: 2,
              }}
            >
              &#x2715;
            </button>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <ActionPicker mode={mode} onMode={setMode} />
        </div>

        {mode === 'plant' && (
          <div style={{ marginBottom: 8 }}>
            <CropPicker
              selectedCrop={selectedCrop}
              onSelect={setSelectedCrop}
              currentSeason={season}
            />
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${FARM_GRID_COLS}, 56px)`,
            gap: 6,
            justifyContent: 'center',
          }}
        >
          {plots.map((plot) => (
            <PlotCell
              key={`${plot.coord.x}-${plot.coord.z}`}
              plot={plot}
              selected={selectedCoord?.x === plot.coord.x && selectedCoord?.z === plot.coord.z}
              onClickPlot={handleClickPlot}
            />
          ))}
        </div>

        <StatusBar message={statusMsg} />

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            fontSize: 10,
            color: '#64748b',
            flexWrap: 'wrap',
          }}
        >
          <span>&#x1F332; vazio</span>
          <span>&#x1F6A7; arado</span>
          <span>&#x1F4A7; regado</span>
          <span style={{ color: '#fcd34d' }}>&#x2728; pronto</span>
        </div>
      </div>
    </>
  );
}
