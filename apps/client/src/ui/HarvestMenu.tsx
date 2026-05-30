import { useFarmStore } from '../systems/farming/farmStore';
import { useToolStore } from '../store/toolStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { CROPS, isMature } from '../systems/farming/CropDefs';
import type { CropId } from '../systems/farming/CropDefs';

export function HarvestMenu() {
  const current = useToolStore((s) => s.current);
  const tiles = useFarmStore((s) => s.tiles);
  const harvestAll = useFarmStore((s) => s.harvestAll);
  const addItem = useInventoryStore((s) => s.add);

  if (current !== 'harvest') return null;

  const counts: Record<string, { name: string; tileCount: number; totalYield: number }> = {};
  let harvestableCount = 0;

  for (const tile of Object.values(tiles)) {
    if (tile.kind !== 'planted') continue;
    const def = CROPS[tile.crop];
    if (!isMature(def, tile.daysGrown)) continue;
    harvestableCount++;
    if (!counts[tile.crop]) {
      counts[tile.crop] = { name: def.name, tileCount: 0, totalYield: 0 };
    }
    counts[tile.crop]!.tileCount++;
    counts[tile.crop]!.totalYield += def.yieldQuantity;
  }

  if (harvestableCount === 0) return null;

  const handleHarvestAll = () => {
    const yields = harvestAll();
    for (const y of yields) {
      addItem(y.crop as CropId, y.quantity);
    }
  };

  return (
    <div className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 backdrop-blur rounded-xl px-4 py-3 text-slate-100 text-sm font-mono flex flex-col gap-2 min-w-[180px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">Colheita</span>
        <span className="bg-amber-500 text-slate-900 text-xs font-bold rounded-full px-2 py-0.5">
          {harvestableCount}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(counts).map(([crop, info]) => (
          <div key={crop} className="flex items-center justify-between text-xs text-slate-300">
            <span>{info.name}</span>
            <span className="text-amber-300">×{info.totalYield}</span>
          </div>
        ))}
      </div>
      <button
        onClick={handleHarvestAll}
        className="mt-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs rounded-lg py-1.5 px-3 transition-colors"
      >
        Colher tudo
      </button>
      <span className="text-[10px] text-slate-500 text-center">ou clique em cada tile</span>
    </div>
  );
}
