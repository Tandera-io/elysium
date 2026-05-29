import { useState } from 'react';
import { useFarmStore, type TileState } from '../systems/farming/farmStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { CROPS, isMature, stageForDayCount, type CropId } from '../systems/farming/CropDefs';
import { tileKey } from '../engine/world/pathfinding';
import type { TileCoord } from '../engine/world/WorldGrid';

// The farm uses a 3x3 grid of tiles in a fixed area.
// Tile coordinates correspond to the farm zone in the world.
const FARM_ORIGIN = { x: 22, z: 22 } as const;
const FARM_COLS = 3;
const FARM_ROWS = 3;

function farmTiles(): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let row = 0; row < FARM_ROWS; row++) {
    for (let col = 0; col < FARM_COLS; col++) {
      tiles.push({ x: FARM_ORIGIN.x + col, z: FARM_ORIGIN.z + row });
    }
  }
  return tiles;
}

const TILE_COORDS = farmTiles();

const CROP_ICONS: Record<CropId, string> = {
  wheat: '🌾',
  tomato: '🍅',
  pumpkin: '🎃',
  corn: '🌽',
  strawberry: '🍓',
};

const SEED_TO_CROP: Record<string, CropId> = {
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
  seed_corn: 'corn',
};

const SEED_ITEMS = [
  { seedId: 'seed_wheat' as const, cropId: 'wheat' as CropId, label: '🌾 Trigo' },
  { seedId: 'seed_tomato' as const, cropId: 'tomato' as CropId, label: '🍅 Tomate' },
  { seedId: 'seed_corn' as const, cropId: 'corn' as CropId, label: '🌽 Milho' },
];

function tileStatus(tile: TileState, day: number): string {
  if (tile.kind === 'empty') return 'Vazio';
  if (tile.kind === 'tilled') return tile.watered ? 'Preparado (molhado)' : 'Preparado';
  const def = CROPS[tile.crop];
  if (isMature(def, tile.daysGrown)) return `${CROP_ICONS[tile.crop]} Pronto para colher!`;
  const stage = stageForDayCount(def, tile.daysGrown);
  const daysLeft = def.daysToMature - tile.daysGrown;
  const wasWateredToday = tile.lastWateredOnDay === day;
  const waterIcon = wasWateredToday ? '💧' : '🏜️';
  return `${CROP_ICONS[tile.crop]} Estágio ${stage.index + 1}/${def.stages.length} · ${daysLeft}d ${waterIcon}`;
}

function tileColorClass(tile: TileState, day: number): string {
  if (tile.kind === 'empty') return 'bg-slate-800 border-slate-700 text-slate-500';
  if (tile.kind === 'tilled') {
    return tile.watered
      ? 'bg-blue-900/60 border-blue-600 text-blue-200'
      : 'bg-amber-900/60 border-amber-700 text-amber-200';
  }
  const def = CROPS[tile.crop];
  if (isMature(def, tile.daysGrown))
    return 'bg-emerald-700/60 border-emerald-400 text-emerald-100 animate-pulse';
  const wasWateredToday = tile.lastWateredOnDay === day;
  return wasWateredToday
    ? 'bg-green-800/60 border-green-600 text-green-200'
    : 'bg-yellow-900/60 border-yellow-600 text-yellow-200';
}

interface FarmPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FarmPanel({ open, onClose }: FarmPanelProps) {
  const [selectedSeedId, setSelectedSeedId] = useState<string>('seed_wheat');

  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);
  const till = useFarmStore((s) => s.till);
  const water = useFarmStore((s) => s.water);
  const plant = useFarmStore((s) => s.plant);
  const harvest = useFarmStore((s) => s.harvest);
  const advanceDay = useFarmStore((s) => s.advanceDay);

  const add = useInventoryStore((s) => s.add);
  const remove = useInventoryStore((s) => s.remove);
  const count = useInventoryStore((s) => s.count);

  if (!open) return null;

  const handleTileClick = (coord: TileCoord) => {
    const key = tileKey(coord);
    const tile = tiles[key] ?? { kind: 'empty' as const };

    if (tile.kind === 'empty') {
      till(coord);
      return;
    }

    if (tile.kind === 'tilled') {
      const cropId = SEED_TO_CROP[selectedSeedId];
      if (!cropId) return;
      const seedId = selectedSeedId as Parameters<typeof remove>[0];
      const hasSeeds = count(seedId) > 0;
      if (!hasSeeds) return;
      remove(seedId, 1);
      plant(coord, cropId);
      return;
    }

    if (tile.kind === 'planted') {
      const def = CROPS[tile.crop];
      if (isMature(def, tile.daysGrown)) {
        const result = harvest(coord);
        if (result) {
          add(result.crop, result.quantity);
        }
        return;
      }
      // Not ready — water it
      water(coord);
    }
  };

  const handleWaterAll = () => {
    TILE_COORDS.forEach((coord) => {
      const key = tileKey(coord);
      const tile = tiles[key];
      if (tile && (tile.kind === 'tilled' || tile.kind === 'planted')) {
        water(coord);
      }
    });
  };

  const handleHarvestAll = () => {
    TILE_COORDS.forEach((coord) => {
      const key = tileKey(coord);
      const tile = tiles[key];
      if (tile && tile.kind === 'planted') {
        const def = CROPS[tile.crop];
        if (isMature(def, tile.daysGrown)) {
          const result = harvest(coord);
          if (result) add(result.crop, result.quantity);
        }
      }
    });
  };

  const readyCount = TILE_COORDS.filter((coord) => {
    const tile = tiles[tileKey(coord)];
    if (!tile || tile.kind !== 'planted') return false;
    return isMature(CROPS[tile.crop], tile.daysGrown);
  }).length;

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-[460px] max-w-[95vw]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Fazenda</h2>
            <p className="text-xs text-slate-400 font-mono">Dia {day}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-2xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        {/* Seed selector */}
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-1.5">Semente selecionada:</p>
          <div className="flex flex-wrap gap-1.5">
            {SEED_ITEMS.map(({ seedId, label }) => {
              const qty = count(seedId);
              const isActive = selectedSeedId === seedId;
              return (
                <button
                  key={seedId}
                  onClick={() => setSelectedSeedId(seedId)}
                  disabled={qty === 0}
                  className={`px-2 py-1 rounded text-xs font-mono transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-900 font-bold'
                      : qty > 0
                        ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {label} ×{qty}
                </button>
              );
            })}
          </div>
        </div>

        {/* Farm grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {TILE_COORDS.map((coord) => {
            const key = tileKey(coord);
            const tile = tiles[key] ?? { kind: 'empty' as const };
            const status = tileStatus(tile, day);
            const colorClass = tileColorClass(tile, day);
            const isReady = tile.kind === 'planted' && isMature(CROPS[tile.crop], tile.daysGrown);

            return (
              <button
                key={key}
                onClick={() => handleTileClick(coord)}
                className={`relative h-16 rounded-lg border-2 text-xs text-center px-1 flex flex-col items-center justify-center gap-0.5 transition hover:brightness-125 ${colorClass}`}
                title={`Tile (${coord.x}, ${coord.z})\n${status}`}
              >
                {tile.kind === 'empty' && <span className="text-slate-600 text-base">⬜</span>}
                {tile.kind === 'tilled' && (
                  <>
                    <span className="text-base">{tile.watered ? '💧' : '🟫'}</span>
                    <span className="text-[10px] opacity-70">
                      {tile.watered ? 'Molhado' : 'Preparado'}
                    </span>
                    <span className="text-[9px] text-amber-400 opacity-80">
                      Plantar: {SEED_ITEMS.find((s) => s.seedId === selectedSeedId)?.label ?? '?'}
                    </span>
                  </>
                )}
                {tile.kind === 'planted' && (
                  <>
                    <span className="text-base">{CROP_ICONS[tile.crop]}</span>
                    {isReady ? (
                      <span className="text-[10px] font-bold text-emerald-300">Colher!</span>
                    ) : (
                      <>
                        <span className="text-[10px]">
                          {stageForDayCount(CROPS[tile.crop], tile.daysGrown).index + 1}/
                          {CROPS[tile.crop].stages.length}
                        </span>
                        <span className="text-[9px] opacity-70">
                          {tile.lastWateredOnDay === day ? '💧' : '🏜️'}{' '}
                          {CROPS[tile.crop].daysToMature - tile.daysGrown}d
                        </span>
                      </>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="text-[10px] text-slate-500 mb-3 space-y-0.5">
          <p>Clique em vazio → preparar solo · preparado → plantar · plantado → regar / colher</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleWaterAll}
            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg"
          >
            💧 Regar Tudo
          </button>
          {readyCount > 0 && (
            <button
              onClick={handleHarvestAll}
              className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              ✂️ Colher Tudo ({readyCount})
            </button>
          )}
          <button
            onClick={advanceDay}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg"
            title="Avança 1 dia (debug)"
          >
            ⏩ Dia +1
          </button>
        </div>
      </div>
    </div>
  );
}
