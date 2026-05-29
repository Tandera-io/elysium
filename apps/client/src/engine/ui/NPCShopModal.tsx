/**
 * NPCShopModal — overlay shown when the player presses G near a shopkeeper.
 * Renders Dorinha's shop: seeds for purchase and crops for sale.
 */
import { useEffect } from 'react';
import { useNPCShopStore } from '../../systems/npc/NPCShop';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import type { ItemId } from '../../systems/inventory/inventoryStore';
import dorinhaShop from '../../data/shops/Dorinha.json';

interface SeedEntry {
  id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
}

interface CropEntry {
  id: string;
  name: string;
  icon: string;
  sellPrice: number;
}

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const gold = useInventoryStore((s) => s.gold);
  const addGold = useInventoryStore((s) => s.addGold);
  const removeGold = useInventoryStore((s) => s.removeGold);
  const addItem = useInventoryStore((s) => s.add);
  const removeItem = useInventoryStore((s) => s.remove);
  const countItem = useInventoryStore((s) => s.count);

  useEffect(() => {
    if (!openShopId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyG') closeShop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openShopId, closeShop]);

  if (!openShopId) return null;

  // Only Dorinha's shop is supported for now; expand as new shopkeepers are added.
  if (openShopId !== dorinhaShop.shopId) return null;

  const seeds: SeedEntry[] = dorinhaShop.seeds as SeedEntry[];
  const crops: CropEntry[] = dorinhaShop.crops as CropEntry[];

  function buySeed(seed: SeedEntry) {
    if (gold < seed.price) return;
    const ok = removeGold(seed.price);
    if (ok) addItem(seed.id as ItemId, 1);
  }

  function sellCrop(crop: CropEntry) {
    const have = countItem(crop.id as ItemId);
    if (have < 1) return;
    const removed = removeItem(crop.id as ItemId, 1);
    if (removed) addGold(crop.sellPrice);
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[480px] max-w-[96vw] shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{dorinhaShop.shopName}</h2>
            <p className="text-xs text-amber-300 font-mono mt-0.5">🪙 {gold}g disponível</p>
          </div>
          <button
            onClick={closeShop}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
            aria-label="Fechar loja"
          >
            ✕
          </button>
        </div>

        {/* Seeds for purchase */}
        <section className="mb-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">
            Sementes à venda
          </h3>
          <ul className="space-y-2">
            {seeds.map((seed) => {
              const canBuy = gold >= seed.price;
              return (
                <li
                  key={seed.id}
                  className="flex justify-between items-center bg-slate-800 px-3 py-2 rounded-lg"
                >
                  <span className="text-slate-200 text-sm">
                    {seed.icon} {seed.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 text-xs font-mono">{seed.price}g</span>
                    <button
                      onClick={() => buySeed(seed)}
                      disabled={!canBuy}
                      className="bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 text-xs font-semibold px-2 py-1 rounded hover:bg-amber-400 transition-colors"
                    >
                      Comprar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Crops for sale */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">
            Vender colheita
          </h3>
          <ul className="space-y-2">
            {crops.map((crop) => {
              const have = countItem(crop.id as ItemId);
              const canSell = have > 0;
              return (
                <li
                  key={crop.id}
                  className="flex justify-between items-center bg-slate-800 px-3 py-2 rounded-lg"
                >
                  <span className="text-slate-200 text-sm">
                    {crop.icon} {crop.name}
                    {have > 0 && (
                      <span className="ml-2 text-slate-400 text-xs">({have} no inventário)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 text-xs font-mono">+{crop.sellPrice}g</span>
                    <button
                      onClick={() => sellCrop(crop)}
                      disabled={!canSell}
                      className="bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-100 text-xs font-semibold px-2 py-1 rounded hover:bg-emerald-500 transition-colors"
                    >
                      Vender
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="text-slate-500 text-xs mt-5 text-center">
          Pressione <kbd className="bg-slate-700 px-1 rounded">G</kbd> ou{' '}
          <kbd className="bg-slate-700 px-1 rounded">Esc</kbd> para fechar
        </p>
      </div>
    </div>
  );
}
