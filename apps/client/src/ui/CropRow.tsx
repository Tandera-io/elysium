/**
 * CropRow — HUD panel that lists every planted tile with a visual growth-stage
 * progress bar and a per-tile harvest button. Displayed as an overlay in the
 * lower-left corner of the screen.
 *
 * Data comes from useFarmStore (tiles, day) and CROPS defs; harvested items are
 * forwarded to useInventoryStore.add(), matching the same logic in Floor.tsx.
 */

import { useFarmStore } from '../systems/farming/farmStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { CROPS, isMature, stageForDayCount } from '../systems/farming/CropDefs';

const CROP_ICON: Record<string, string> = {
  wheat: '🌾',
  tomato: '🍅',
  pumpkin: '🎃',
  corn: '🌽',
  strawberry: '🍓',
};

const STAGE_LABEL: Record<number, string> = {
  0: 'semente',
  1: 'broto',
  2: 'crescendo',
  3: 'maduro',
  4: 'pronto',
};

function stageLabel(stageIndex: number): string {
  return STAGE_LABEL[stageIndex] ?? 'pronto';
}

export function CropRow() {
  const tiles = useFarmStore((s) => s.tiles);
  const harvestFarm = useFarmStore((s) => s.harvest);
  const addToInventory = useInventoryStore((s) => s.add);

  const plantedEntries = Object.entries(tiles).filter(([, tile]) => tile.kind === 'planted');

  if (plantedEntries.length === 0) return null;

  return (
    <aside
      className="pointer-events-auto absolute bottom-24 left-4 flex flex-col gap-1 max-h-64 overflow-y-auto"
      aria-label="Cultivos plantados"
    >
      {plantedEntries.map(([key, tile]) => {
        if (tile.kind !== 'planted') return null;

        const def = CROPS[tile.crop];
        const mature = isMature(def, tile.daysGrown);
        const stage = stageForDayCount(def, tile.daysGrown);
        const progress = Math.min(tile.daysGrown / def.daysToMature, 1);
        const progressPct = Math.round(progress * 100);
        const icon = CROP_ICON[tile.crop] ?? '🌱';

        // Derive a short readable tile label from the key (e.g. "12,14" → "12,14")
        const tileLabel = key;

        function handleHarvest() {
          // Parse tile coord from key "x,z"
          const [xStr, zStr] = key.split(',');
          const x = Number(xStr);
          const z = Number(zStr);
          if (Number.isNaN(x) || Number.isNaN(z)) return;
          const result = harvestFarm({ x, z });
          if (result) {
            addToInventory(result.crop, result.quantity);
          }
        }

        return (
          <div
            key={key}
            className="bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-mono min-w-[200px]"
          >
            {/* Crop icon + name */}
            <span className="text-base leading-none" aria-hidden>
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-200 truncate">{def.name}</span>
                <span className="text-slate-500 text-[10px] shrink-0">{tileLabel}</span>
              </div>
              {/* Growth progress bar */}
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      mature ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] shrink-0 ${mature ? 'text-amber-300' : 'text-slate-400'}`}
                >
                  {mature ? 'pronto!' : stageLabel(stage.index)}
                </span>
              </div>
              {/* Days grown counter */}
              <div className="text-[9px] text-slate-600 mt-0.5">
                dia {tile.daysGrown}/{def.daysToMature}
                {!mature && ` · +${def.daysToMature - tile.daysGrown}d`}
              </div>
            </div>
            {/* Harvest button — only visible when mature */}
            {mature && (
              <button
                onClick={handleHarvest}
                className="ml-1 shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] font-semibold rounded px-2 py-1 transition"
                title={`Colher ${def.name} (yield ×${def.yieldQuantity})`}
              >
                colher
              </button>
            )}
          </div>
        );
      })}
    </aside>
  );
}
