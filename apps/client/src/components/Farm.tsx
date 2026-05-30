import { useState } from 'react';
import { useFarmStore } from '../systems/farming/farmStore';
import { CROPS, stageForDayCount, isMature, type CropId } from '../systems/farming/CropDefs';

const GRID_COLS = 5;
const GRID_ROWS = 4;

const CROP_ICONS: Record<CropId, string> = {
  wheat: '🌾',
  tomato: '🍅',
  pumpkin: '🎃',
  corn: '🌽',
  strawberry: '🍓',
};

function plotCoord(col: number, row: number) {
  return { x: col, z: row };
}

interface CropPickerProps {
  onPick: (crop: CropId) => void;
  onCancel: () => void;
}

function CropPicker({ onPick, onCancel }: CropPickerProps) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-slate-900 border border-slate-600 rounded-lg p-2 shadow-xl min-w-[160px]">
      <p className="text-[10px] text-slate-400 mb-1 text-center">Escolha a semente</p>
      <div className="flex flex-col gap-1">
        {(Object.keys(CROPS) as CropId[]).map((id) => (
          <button
            key={id}
            onClick={() => onPick(id)}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 text-left text-xs text-slate-200"
          >
            <span>{CROP_ICONS[id]}</span>
            <span>{CROPS[id].name}</span>
            <span className="ml-auto text-slate-500">{CROPS[id].daysToMature}d</span>
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        className="mt-1 w-full text-[10px] text-slate-500 hover:text-slate-300 text-center"
      >
        cancelar
      </button>
    </div>
  );
}

interface PlotProps {
  col: number;
  row: number;
}

function Plot({ col, row }: PlotProps) {
  const coord = plotCoord(col, row);
  const [picking, setPicking] = useState(false);

  const tile = useFarmStore((s) => s.getTile(coord));
  const till = useFarmStore((s) => s.till);
  const plant = useFarmStore((s) => s.plant);
  const harvest = useFarmStore((s) => s.harvest);
  const water = useFarmStore((s) => s.water);

  const handleClick = () => {
    if (tile.kind === 'empty') {
      till(coord);
    } else if (tile.kind === 'tilled') {
      setPicking(true);
    } else if (tile.kind === 'planted') {
      const result = harvest(coord);
      if (!result) {
        water(coord);
      }
    }
  };

  const handlePick = (crop: CropId) => {
    plant(coord, crop);
    setPicking(false);
  };

  let bgColor = '';
  let label = '';
  let icon = '';
  let harvestable = false;

  if (tile.kind === 'empty') {
    bgColor = '#44403c';
    label = 'Terra';
  } else if (tile.kind === 'tilled') {
    bgColor = tile.watered ? '#7c5c2e' : '#92400e';
    label = tile.watered ? 'Molhado' : 'Arado';
  } else if (tile.kind === 'planted') {
    const def = CROPS[tile.crop];
    const stage = stageForDayCount(def, tile.daysGrown);
    bgColor = stage.color;
    harvestable = isMature(def, tile.daysGrown);
    icon = CROP_ICONS[tile.crop];
    label = harvestable ? 'Pronto!' : `${def.name} d${tile.daysGrown}`;
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        title={label}
        className={`relative w-12 h-12 rounded border-2 flex flex-col items-center justify-center text-base select-none transition-all hover:brightness-110 active:scale-95 ${
          harvestable
            ? 'border-amber-400 ring-1 ring-amber-400/50 animate-pulse'
            : 'border-stone-600'
        }`}
        style={{ backgroundColor: bgColor }}
      >
        {icon && <span className="text-lg leading-none">{icon}</span>}
        {harvestable && (
          <span className="absolute top-0 right-0 text-[8px] bg-amber-400 text-amber-950 rounded-bl px-0.5 font-bold leading-tight">
            ✓
          </span>
        )}
      </button>
      {picking && <CropPicker onPick={handlePick} onCancel={() => setPicking(false)} />}
    </div>
  );
}

export function Farm() {
  const day = useFarmStore((s) => s.day);
  const advanceDay = useFarmStore((s) => s.advanceDay);

  return (
    <section
      data-testid="farm-panel"
      className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur rounded-xl px-4 py-3 border border-slate-700"
    >
      <div className="flex items-center justify-between mb-2 gap-4">
        <h2 className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Fazenda</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">Dia {day}</span>
          <button
            onClick={advanceDay}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            title="Avançar dia"
          >
            +1 dia
          </button>
        </div>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: GRID_ROWS }, (_, row) =>
          Array.from({ length: GRID_COLS }, (_, col) => (
            <Plot key={`${col}-${row}`} col={col} row={row} />
          )),
        )}
      </div>
      <p className="mt-2 text-[9px] text-slate-600 text-center">
        Clique: arar · semear · colher/regar
      </p>
    </section>
  );
}
