import { useFarmStore } from '../systems/farming/farmStore';
import { useToolStore } from '../store/toolStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';
import { CROPS, isMature, isInSeason } from '../systems/farming/CropDefs';
import { effectiveSellPrice, sellAllOfCrop } from '../systems/farming/cropSelling';
import type { CropId } from '../systems/farming/CropDefs';

interface MatureGroup {
  crop: CropId;
  tileCount: number;
  totalYield: number;
  /** Whether this crop is in-season — out-of-season crops will wilt next day. */
  inSeason: boolean;
  /** Gold per unit at current season price. */
  unitPrice: number;
}

/**
 * Side panel visible only when the harvest tool is active. Lists all mature
 * crops grouped by type with their tile count, total yield, and sell price.
 * Out-of-season crops show a wilt warning.
 * Provides "Colher tudo" and per-crop "Vender" buttons.
 * Returns null when the harvest tool is not selected or there are no
 * harvestable tiles.
 */
export function HarvestMenu() {
  const current = useToolStore((s) => s.current);
  const tiles = useFarmStore((s) => s.tiles);
  const harvestAll = useFarmStore((s) => s.harvestAll);
  const addItem = useInventoryStore((s) => s.add);
  const inventoryStore = useInventoryStore();
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const season = currentSeason({ seasonIndex } as Parameters<typeof currentSeason>[0]);

  if (current !== 'harvest') return null;

  // Aggregate mature tiles by crop
  const groups: Record<CropId, MatureGroup> = {} as Record<CropId, MatureGroup>;
  for (const t of Object.values(tiles)) {
    if (t.kind !== 'planted') continue;
    const def = CROPS[t.crop];
    if (!isMature(def, t.daysGrown)) continue;
    const existing = groups[t.crop];
    const inSeason = isInSeason(def, season);
    const unitPrice = effectiveSellPrice(t.crop, season);
    if (existing) {
      existing.tileCount += 1;
      existing.totalYield += def.yieldQuantity;
    } else {
      groups[t.crop] = {
        crop: t.crop,
        tileCount: 1,
        totalYield: def.yieldQuantity,
        inSeason,
        unitPrice,
      };
    }
  }

  const matureGroups = Object.values(groups);
  if (matureGroups.length === 0) return null;

  const handleHarvestAll = () => {
    const yields = harvestAll();
    for (const y of yields) {
      addItem(y.crop, y.quantity);
    }
  };

  const handleSellAll = (cropId: CropId) => {
    sellAllOfCrop(cropId, inventoryStore, season);
  };

  return (
    <div className="absolute bottom-24 right-4 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-xl text-slate-100 w-64">
      <header className="px-3 py-2 border-b border-slate-700">
        <h2 className="text-sm font-bold text-amber-400">Colheita disponível</h2>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Estação atual: <span className="text-slate-300 capitalize">{season}</span>
        </p>
      </header>
      <ul className="px-3 py-2 space-y-2 text-xs">
        {matureGroups.map((g) => {
          const harvestedQty = inventoryStore.count(g.crop);
          return (
            <li key={g.crop} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={`font-medium ${g.inSeason ? 'text-slate-200' : 'text-amber-400'}`}>
                  {CROPS[g.crop].name}
                  {!g.inSeason && (
                    <span className="ml-1 text-[10px] text-amber-500" title="Murcha no próximo dia">
                      ⚠ fora de estação
                    </span>
                  )}
                </span>
                <span className="text-slate-400">
                  {g.tileCount} tile{g.tileCount !== 1 ? 's' : ''} · +{g.totalYield}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  Venda: <span className="text-amber-300">{g.unitPrice}g/un</span>
                </span>
                {harvestedQty > 0 && (
                  <button
                    onClick={() => handleSellAll(g.crop)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    title={`Vender ${harvestedQty}x ${CROPS[g.crop].name} por ${g.unitPrice * harvestedQty}g`}
                  >
                    Vender {harvestedQty}x ({g.unitPrice * harvestedQty}g)
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-2 border-t border-slate-700">
        <button
          onClick={handleHarvestAll}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
        >
          Colher tudo
        </button>
      </div>
    </div>
  );
}
