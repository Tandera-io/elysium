import {
  useNPCShopStore,
  DORINHA_BUY,
  DORINHA_SELL,
  DORINHA_SHOP_ID,
} from '../../systems/npc/NPCShop';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { useEffect } from 'react';

/** Modal shown when the player opens Dorinha's shop via the G key. */
export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const gold = useInventoryStore((s) => s.gold);
  const count = useInventoryStore((s) => s.count);
  const add = useInventoryStore((s) => s.add);
  const remove = useInventoryStore((s) => s.remove);
  const addGold = useInventoryStore((s) => s.addGold);
  const removeGold = useInventoryStore((s) => s.removeGold);

  useEffect(() => {
    if (!openShopId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyG') closeShop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openShopId, closeShop]);

  if (openShopId !== DORINHA_SHOP_ID) return null;

  const handleSell = (id: Parameters<typeof remove>[0], price: number) => {
    const qty = count(id);
    if (qty <= 0) return;
    remove(id, qty);
    addGold(qty * price);
  };

  const handleBuy = (id: Parameters<typeof add>[0], price: number) => {
    if (gold < price) return;
    const ok = removeGold(price);
    if (ok) add(id, 1);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-[480px] max-w-[95vw] text-slate-100">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Loja da Dorinha</h2>
            <p className="text-xs text-slate-400">Sementes e colheitas</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-amber-300 font-mono text-sm">🪙 {gold}g</span>
            <button
              onClick={closeShop}
              className="text-slate-400 hover:text-slate-200 text-sm"
              title="Fechar (Esc)"
            >
              ✕
            </button>
          </div>
        </header>

        <section className="mb-4">
          <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">
            Vender colheita (venda tudo)
          </h3>
          <div className="space-y-1">
            {DORINHA_BUY.map((entry) => {
              const qty = count(entry.id);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 text-sm"
                >
                  <span>
                    {entry.label} <span className="text-slate-400">({qty} un.)</span>
                  </span>
                  <button
                    onClick={() => handleSell(entry.id, entry.price)}
                    disabled={qty === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3 py-1 rounded text-xs font-semibold"
                  >
                    Vender tudo · 🪙{qty * entry.price}g
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">
            Comprar sementes (1 un.)
          </h3>
          <div className="space-y-1">
            {DORINHA_SELL.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 text-sm"
              >
                <span>{entry.label}</span>
                <button
                  onClick={() => handleBuy(entry.id, entry.price)}
                  disabled={gold < entry.price}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 px-3 py-1 rounded text-xs font-semibold"
                >
                  Comprar · 🪙{entry.price}g
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
