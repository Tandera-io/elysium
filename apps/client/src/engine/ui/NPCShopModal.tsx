import {
  useNPCShopStore,
  DORINHA_BUY_LISTINGS,
  DORINHA_SELL_PRICES,
} from '../../systems/npc/NPCShop';
import { useInventoryStore, type ItemId } from '../../systems/inventory/inventoryStore';

const ITEM_ICON: Record<string, string> = {
  seed_wheat: '🌾',
  seed_tomato: '🍅',
  seed_corn: '🌽',
  wheat: '🌾',
  tomato: '🍅',
  corn: '🌽',
};

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const buyItem = useNPCShopStore((s) => s.buyItem);
  const sellItem = useNPCShopStore((s) => s.sellItem);
  const gold = useInventoryStore((s) => s.gold);
  const count = useInventoryStore((s) => s.count);

  if (!openShopId) return null;

  const sellListings = (Object.entries(DORINHA_SELL_PRICES) as [ItemId, number][]).filter(
    ([id]) => count(id) > 0,
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <aside className="pointer-events-auto bg-slate-900/95 backdrop-blur rounded-xl border border-amber-700/50 p-4 w-72 shadow-2xl">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-amber-200">🏪 Loja da Dorinha</h2>
          <button
            onClick={closeShop}
            className="text-slate-500 hover:text-slate-200 text-lg leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="text-xs text-amber-300 font-mono mb-3">🪙 {gold}g</div>

        <section className="mb-3">
          <h3 className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
            Comprar
          </h3>
          <ul className="space-y-1">
            {DORINHA_BUY_LISTINGS.map((listing) => (
              <li
                key={listing.itemId}
                className="flex items-center justify-between bg-slate-800/60 rounded px-2 py-1.5"
              >
                <span className="text-xs text-slate-200">
                  {ITEM_ICON[listing.itemId] ?? '?'} {listing.name}
                </span>
                <button
                  disabled={gold < listing.price}
                  onClick={() => buyItem(listing.itemId, listing.price)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    gold >= listing.price
                      ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {listing.price}g
                </button>
              </li>
            ))}
          </ul>
        </section>

        {sellListings.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Vender
            </h3>
            <ul className="space-y-1">
              {sellListings.map(([id, price]) => (
                <li
                  key={id}
                  className="flex items-center justify-between bg-slate-800/60 rounded px-2 py-1.5"
                >
                  <span className="text-xs text-slate-200">
                    {ITEM_ICON[id] ?? '?'} ×{count(id)}
                  </span>
                  <button
                    onClick={() => sellItem(id, 1, price)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
                  >
                    +{price}g
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[10px] text-slate-500 mt-3 text-center">G para fechar</p>
      </aside>
    </div>
  );
}
