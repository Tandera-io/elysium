// apps/client/src/features/farming/FarmPlot.jsx
//
// FarmPlot — React component that renders a single farm plot card.
//
// Props:
//   plot        {FarmPlot}   — plot object from useFarmStore
//   cropDefs    {Object}     — CROP_DEFS map (id → crop definition)
//   onPlant     {Function}   — (plotId, cropId) => void  — called when player plants a seed
//   onHarvest   {Function}   — (plotId) => void          — called when player harvests
//
// Usage (standalone, wired to the store):
//   import { FarmPlotPanel } from './FarmPlot';
//   <FarmPlotPanel />

import { useState } from 'react';
import { useFarmStore, CROP_DEFS } from '../../stores/farmStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';

// ─── Visual helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  empty: {
    bg: 'bg-amber-950',
    border: 'border-amber-800',
    label: 'Vazio',
    labelColor: 'text-amber-500',
  },
  growing: {
    bg: 'bg-green-950',
    border: 'border-green-800',
    label: 'Crescendo',
    labelColor: 'text-green-400',
  },
  ready: {
    bg: 'bg-yellow-950',
    border: 'border-yellow-600',
    label: 'Pronto!',
    labelColor: 'text-yellow-300',
  },
};

function GrowthBar({ daysGrown, growTime }) {
  const pct = growTime > 0 ? Math.min(100, Math.round((daysGrown / growTime) * 100)) : 0;
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden mt-1">
      <div
        className="h-full rounded-full bg-green-500 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Single plot card ──────────────────────────────────────────────────────────

function PlotCard({ plot, cropDefs, onPlant, onHarvest }) {
  const styles = STATUS_STYLES[plot.status] ?? STATUS_STYLES.empty;
  const def = plot.cropId ? cropDefs[plot.cropId] : null;

  return (
    <div
      className={[
        'relative rounded-xl border p-3 flex flex-col gap-2 select-none transition-all',
        styles.bg,
        styles.border,
        plot.status === 'ready' ? 'ring-2 ring-yellow-400 ring-opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-xs font-mono">
          {plot.id.replace('_', ' ').toUpperCase()}
        </span>
        <span className={['text-xs font-semibold', styles.labelColor].join(' ')}>
          {styles.label}
        </span>
      </div>

      {/* Crop icon + info */}
      <div className="flex items-center gap-2 min-h-[36px]">
        {def ? (
          <>
            <span className="text-2xl" role="img" aria-label={def.name}>
              {def.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-100 text-sm font-semibold leading-tight truncate">
                {def.name}
              </p>
              {plot.status === 'growing' && (
                <p className="text-slate-400 text-xs">
                  Dia {plot.daysGrown}/{def.growTime}
                </p>
              )}
              {plot.status === 'ready' && (
                <p className="text-yellow-300 text-xs font-semibold">Colher agora!</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-xs">Nenhum cultivo plantado</p>
        )}
      </div>

      {/* Progress bar (growing only) */}
      {plot.status === 'growing' && def && (
        <GrowthBar daysGrown={plot.daysGrown} growTime={def.growTime} />
      )}

      {/* Action button */}
      {plot.status === 'ready' && (
        <button
          onClick={() => onHarvest(plot.id)}
          className="w-full py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-bold transition-colors"
        >
          Colher
        </button>
      )}
      {plot.status === 'empty' && (
        <PlantPicker plotId={plot.id} cropDefs={cropDefs} onPlant={onPlant} />
      )}
    </div>
  );
}

// ─── Seed picker dropdown ──────────────────────────────────────────────────────

function PlantPicker({ plotId, cropDefs, onPlant }) {
  const [open, setOpen] = useState(false);
  const inventory = useInventoryStore();

  const availableSeeds = Object.values(cropDefs).filter((def) => {
    const seedId = def.seedId;
    return inventory.count(seedId) > 0;
  });

  if (availableSeeds.length === 0) {
    return <p className="text-slate-500 text-xs text-center py-1">Sem sementes no inventário</p>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-slate-100 text-xs font-semibold transition-colors"
      >
        Plantar sementes ▾
      </button>
      {open && (
        <ul className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden z-10 shadow-xl">
          {availableSeeds.map((def) => {
            const qty = inventory.count(def.seedId);
            return (
              <li key={def.id}>
                <button
                  onClick={() => {
                    onPlant(plotId, def.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  <span className="text-base">{def.icon}</span>
                  <span className="flex-1 text-left">{def.name}</span>
                  <span className="text-slate-400">×{qty}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Farm panel (standalone, store-wired) ─────────────────────────────────────

export function FarmPlotPanel() {
  const plots = useFarmStore((s) => s.plots);
  const currentDay = useFarmStore((s) => s.currentDay);
  const plant = useFarmStore((s) => s.plant);
  const harvest = useFarmStore((s) => s.harvest);
  const inventory = useInventoryStore();

  const [flash, setFlash] = useState(null);

  function handlePlant(plotId, cropId) {
    const def = CROP_DEFS[cropId];
    if (!def) return;
    const removed = inventory.remove(def.seedId, 1);
    if (!removed) {
      setFlash({ type: 'fail', msg: 'Sem sementes!' });
      setTimeout(() => setFlash(null), 1200);
      return;
    }
    const ok = plant(plotId, cropId, currentDay);
    if (!ok) {
      // Refund — shouldn't happen given UI gating, but be safe
      inventory.add(def.seedId, 1);
      setFlash({ type: 'fail', msg: 'Não foi possível plantar.' });
      setTimeout(() => setFlash(null), 1200);
    }
  }

  function handleHarvest(plotId) {
    const result = harvest(plotId);
    if (!result) return;
    const def = CROP_DEFS[result.cropId];
    inventory.addGold(def ? def.sellPrice * result.quantity : 0);
    inventory.add(result.cropId, result.quantity);
    setFlash({ type: 'ok', msg: `+${result.quantity} ${def?.name ?? result.cropId}` });
    setTimeout(() => setFlash(null), 1500);
  }

  const readyCount = plots.filter((p) => p.status === 'ready').length;
  const growingCount = plots.filter((p) => p.status === 'growing').length;

  return (
    <div className="pointer-events-auto p-4 select-none">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-100 text-base font-bold">Fazenda</h2>
        <div className="flex gap-3 text-xs">
          {readyCount > 0 && (
            <span className="text-yellow-300 font-semibold">
              {readyCount} pronto{readyCount > 1 ? 's' : ''}
            </span>
          )}
          {growingCount > 0 && <span className="text-green-400">{growingCount} crescendo</span>}
          <span className="text-slate-400">Dia {currentDay}</span>
        </div>
      </div>

      {/* Flash message */}
      {flash && (
        <div
          className={[
            'mb-3 text-center text-xs font-semibold py-1.5 rounded-lg',
            flash.type === 'ok' ? 'bg-emerald-800 text-emerald-200' : 'bg-rose-900 text-rose-300',
          ].join(' ')}
        >
          {flash.msg}
        </div>
      )}

      {/* Plot grid */}
      <div className="grid grid-cols-2 gap-3">
        {plots.map((plot) => (
          <PlotCard
            key={plot.id}
            plot={plot}
            cropDefs={CROP_DEFS}
            onPlant={handlePlant}
            onHarvest={handleHarvest}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Lower-level export for custom wiring ─────────────────────────────────────

export { PlotCard };
export default FarmPlotPanel;
