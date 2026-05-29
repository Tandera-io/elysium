import { useEffect, useState } from 'react';
import { useFarmStore } from '../systems/farming/farmStore';
import { useToolStore } from '../store/toolStore';
import { CROPS, isMature, stageForDayCount } from '../data/crops';
import { applyToolToTile } from '../systems/farming/farmSaga';
import { tileKey } from '../engine/world/pathfinding';
import type { TileCoord } from '../engine/world/WorldGrid';
import type { TileState } from '../systems/farming/farmStore';

// 4 × 4 farm area — matches the FarmField 3-D render region.
const FARM_COLS = 4;
const FARM_ROWS = 4;
const FARM_ORIGIN: TileCoord = { x: 21, z: 21 };

function buildFarmCoords(): TileCoord[] {
  const coords: TileCoord[] = [];
  for (let row = 0; row < FARM_ROWS; row++) {
    for (let col = 0; col < FARM_COLS; col++) {
      coords.push({ x: FARM_ORIGIN.x + col, z: FARM_ORIGIN.z + row });
    }
  }
  return coords;
}

const FARM_COORDS = buildFarmCoords();

function tileEmoji(tile: TileState): string {
  if (tile.kind === 'empty') return '🟫';
  if (tile.kind === 'tilled') return tile.watered ? '💧' : '🟤';
  const def = CROPS[tile.crop];
  if (isMature(def, tile.daysGrown)) return '🌾';
  const stage = stageForDayCount(def, tile.daysGrown);
  if (stage.index === 0) return '🌰';
  if (stage.index === 1) return '🌱';
  return '🌿';
}

function tileTooltip(tile: TileState, day: number): string {
  if (tile.kind === 'empty') return 'Vazio — arar com enxada [2]';
  if (tile.kind === 'tilled') {
    return tile.watered
      ? 'Arado e regado — plante uma semente [4/5]'
      : 'Arado — regue [3] ou plante [4/5]';
  }
  const def = CROPS[tile.crop];
  const mature = isMature(def, tile.daysGrown);
  if (mature) return `${def.name} — PRONTO! Colher [6]`;
  const wateredToday = tile.lastWateredOnDay >= day;
  return `${def.name} — dia ${tile.daysGrown}/${def.daysToMature}${wateredToday ? ' 💧' : ' (regue!)'}`;
}

function tileClass(tile: TileState): string {
  const base = 'w-10 h-10 rounded-md border text-xl flex items-center justify-center transition';
  if (tile.kind === 'empty')
    return `${base} border-slate-700 bg-slate-800/40 hover:bg-slate-700/60`;
  if (tile.kind === 'tilled') {
    return tile.watered
      ? `${base} border-blue-600 bg-blue-900/40 hover:bg-blue-800/60`
      : `${base} border-stone-600 bg-stone-900/40 hover:bg-stone-800/60`;
  }
  const def = CROPS[tile.crop];
  if (isMature(def, tile.daysGrown)) {
    return `${base} border-amber-400 bg-amber-500/20 hover:bg-amber-500/40 animate-pulse`;
  }
  return `${base} border-green-700 bg-green-900/40 hover:bg-green-800/60`;
}

export function FarmPanel() {
  const [open, setOpen] = useState(false);
  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);
  const currentTool = useToolStore((s) => s.current);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyB' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const matureCount = FARM_COORDS.filter((c) => {
    const t = tiles[tileKey(c)];
    return t?.kind === 'planted' && isMature(CROPS[t.crop], t.daysGrown);
  }).length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`pointer-events-auto absolute bottom-24 right-4 backdrop-blur rounded-lg px-3 py-1.5 text-xs hover:text-slate-100 transition ${
          matureCount > 0
            ? 'bg-amber-600/80 text-white animate-pulse'
            : 'bg-slate-900/80 text-slate-300'
        }`}
      >
        🌾 Roça [B]{matureCount > 0 ? ` — ${matureCount} pronto!` : ''}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur rounded-xl px-4 py-3 text-xs text-slate-200 select-none">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-amber-300">🌾 Roça — dia {day}</h2>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-200 ml-6">
          ✕
        </button>
      </div>
      <p className="text-slate-500 mb-2 font-mono text-[10px]">
        ferramenta: <span className="text-amber-300 font-semibold">{currentTool}</span> — clique
        numa parcela
      </p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${FARM_COLS}, 2.5rem)` }}>
        {FARM_COORDS.map((coord) => {
          const key = tileKey(coord);
          const tile: TileState = tiles[key] ?? { kind: 'empty' };
          return (
            <button
              key={key}
              title={tileTooltip(tile, day)}
              onClick={() => applyToolToTile(coord, currentTool)}
              className={tileClass(tile)}
            >
              {tileEmoji(tile)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] text-slate-500 leading-relaxed">
        <span>🟫 vazio → enxada [2]</span>
        <span>🟤 arado → regar [3] / semear</span>
        <span>💧 regado → semear [4/5]</span>
        <span>🌰🌱🌿 crescendo…</span>
        <span>🌾 pronto → colher [6]</span>
        <span className="text-slate-600">[B] fecha painel</span>
      </div>
    </div>
  );
}
