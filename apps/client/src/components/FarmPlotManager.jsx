// apps/client/src/components/FarmPlotManager.jsx
//
// Overlay UI for managing farm plots. Press F to open/close.
// Lets the player select plots on a visual grid, then till, water,
// plant seeds, and harvest — all wired through useFarmPlot.

import { useState, useEffect, useCallback } from 'react';
import { useFarmPlot } from '../hooks/useFarmPlot';
import { useFarmStore, CROPS, isMature, stageForDayCount } from '../stores/farmStore';

const PLOT_COLS = 5;
const PLOT_ROWS = 4;
// Farm tiles start at origin; manager shows tile coords 0..COLS-1, 0..ROWS-1
const FARM_TILES = Array.from({ length: PLOT_ROWS }, (_, z) =>
  Array.from({ length: PLOT_COLS }, (_, x) => ({ x, z })),
);

const SEED_LABEL = {
  seed_wheat: '🌾 Trigo',
  seed_tomato: '🍅 Tomate',
  seed_corn: '🌽 Milho',
};

const STAGE_LABEL = ['🌱 Semente', '🌿 Broto', '🌻 Crescendo', '✅ Maduro'];

function stageLabelFor(cropDef, daysGrown) {
  if (!cropDef) return '';
  if (isMature(cropDef, daysGrown)) return '✅ Pronto para colher';
  const stage = stageForDayCount(cropDef, daysGrown);
  return STAGE_LABEL[stage.index] ?? `Estágio ${stage.index}`;
}

function TileCell({ coord, tileState, isSelected, onClick }) {
  let bg = 'bg-slate-800';
  let label = '·';

  if (tileState) {
    if (tileState.kind === 'tilled') {
      bg = tileState.watered ? 'bg-blue-900/70' : 'bg-amber-950/70';
      label = tileState.watered ? '💧' : '▫';
    } else if (tileState.kind === 'planted') {
      const def = CROPS[tileState.crop];
      const mature = isMature(def, tileState.daysGrown);
      bg = mature ? 'bg-green-800/70' : 'bg-green-950/50';
      label = mature ? '🎉' : '🌱';
    }
  }

  return (
    <button
      onClick={() => onClick(coord)}
      className={`w-10 h-10 rounded border text-base flex items-center justify-center transition-colors
        ${isSelected ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-600 hover:border-slate-400'}
        ${bg}`}
      title={`Parcela (${coord.x},${coord.z})`}
      aria-pressed={isSelected}
    >
      {label}
    </button>
  );
}

function ActionBar({ tileState, isHarvestable, seeds, actions, onClose }) {
  const [plantingSeed, setPlantingSeed] = useState(null);

  const canTill = tileState?.kind === 'empty';
  const canWater = tileState?.kind === 'tilled' || tileState?.kind === 'planted';
  const canPlant = tileState?.kind === 'tilled' && seeds.length > 0;
  const canHarvest = isHarvestable;

  const handlePlant = () => {
    if (!plantingSeed) return;
    actions.plant(plantingSeed);
    setPlantingSeed(null);
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          disabled={!canTill}
          onClick={actions.till}
          className="px-3 py-1 rounded text-xs font-semibold bg-amber-800 text-amber-100 disabled:opacity-30 hover:bg-amber-700 disabled:cursor-not-allowed"
        >
          ⛏ Arar
        </button>
        <button
          disabled={!canWater}
          onClick={actions.water}
          className="px-3 py-1 rounded text-xs font-semibold bg-blue-700 text-blue-100 disabled:opacity-30 hover:bg-blue-600 disabled:cursor-not-allowed"
        >
          💧 Regar
        </button>
        <button
          disabled={!canHarvest}
          onClick={actions.harvest}
          className="px-3 py-1 rounded text-xs font-semibold bg-green-700 text-green-100 disabled:opacity-30 hover:bg-green-600 disabled:cursor-not-allowed"
        >
          🎉 Colher
        </button>
      </div>

      {canPlant && (
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={plantingSeed ?? ''}
            onChange={(e) => setPlantingSeed(e.target.value || null)}
            className="text-xs bg-slate-700 text-slate-200 rounded px-2 py-1 border border-slate-600"
          >
            <option value="">Escolha semente…</option>
            {seeds.map(({ seedId, qty }) => (
              <option key={seedId} value={seedId}>
                {SEED_LABEL[seedId] ?? seedId} (×{qty})
              </option>
            ))}
          </select>
          <button
            disabled={!plantingSeed}
            onClick={handlePlant}
            className="px-3 py-1 rounded text-xs font-semibold bg-emerald-700 text-emerald-100 disabled:opacity-30 hover:bg-emerald-600 disabled:cursor-not-allowed"
          >
            🌱 Plantar
          </button>
        </div>
      )}
    </div>
  );
}

export function FarmPlotManager() {
  const [open, setOpen] = useState(false);
  const tiles = useFarmStore((s) => s.tiles);

  const { selectedCoord, selectTile, tileState, isHarvestable, cropDef, seeds, day, actions } =
    useFarmPlot();

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Ignore if focused on an input/textarea
        if (
          document.activeElement &&
          (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.tagName === 'SELECT')
        )
          return;
        setOpen((v) => !v);
      }
      if (e.code === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute bottom-16 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-300 text-xs px-3 py-1 rounded-lg hover:border-amber-400 hover:text-amber-300"
        title="Abrir gerenciador de parcelas (F)"
      >
        🌾 Fazenda <kbd className="ml-1 bg-slate-700 px-1 rounded text-[10px]">F</kbd>
      </button>
    );
  }

  const tileKey = selectedCoord ? `${selectedCoord.x},${selectedCoord.z}` : null;
  const selectedTileState = tileKey ? (tiles[tileKey] ?? { kind: 'empty' }) : null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-4 shadow-2xl w-80 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Gerenciar Parcelas</h2>
          <p className="text-xs text-slate-400">Dia {day}</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={actions.advanceDay}
            className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded"
            title="Avançar dia (para testes)"
          >
            +Dia
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-100 text-lg leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Plot grid */}
      <div className="space-y-1">
        {FARM_TILES.map((row, z) => (
          <div key={z} className="flex gap-1 justify-center">
            {row.map((coord) => {
              const key = `${coord.x},${coord.z}`;
              const state = tiles[key] ?? { kind: 'empty' };
              const isSel = selectedCoord?.x === coord.x && selectedCoord?.z === coord.z;
              return (
                <TileCell
                  key={key}
                  coord={coord}
                  tileState={state}
                  isSelected={isSel}
                  onClick={selectTile}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-[10px] text-slate-500 flex-wrap">
        <span>▫ Arado</span>
        <span>💧 Regado</span>
        <span>🌱 Plantado</span>
        <span>🎉 Pronto</span>
      </div>

      {/* Selected tile info + actions */}
      {selectedCoord ? (
        <div className="mt-3 border-t border-slate-700 pt-3">
          <p className="text-xs font-semibold text-slate-300 mb-1">
            Parcela ({selectedCoord.x}, {selectedCoord.z})
          </p>
          <p className="text-xs text-slate-400">
            {selectedTileState?.kind === 'empty' && 'Sem uso — are para cultivar'}
            {selectedTileState?.kind === 'tilled' &&
              (selectedTileState.watered ? 'Arada e regada' : 'Arada — regue ou plante')}
            {selectedTileState?.kind === 'planted' &&
              `${CROPS[selectedTileState.crop]?.name ?? selectedTileState.crop} · ${stageLabelFor(
                CROPS[selectedTileState.crop],
                selectedTileState.daysGrown,
              )} · ${selectedTileState.daysGrown}d`}
          </p>
          <ActionBar
            tileState={selectedTileState}
            isHarvestable={isHarvestable}
            seeds={seeds}
            actions={actions}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500 text-center">
          Clique numa parcela para selecioná-la
        </p>
      )}
    </div>
  );
}
