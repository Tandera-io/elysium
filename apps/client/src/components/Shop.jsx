import { useState } from 'react';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { SHOP_CATALOG } from '../data/shopItems';

/** Renders buy/sell tabs for a given shopId. */
export function Shop({ shopId }) {
  const [tab, setTab] = useState('buy');
  const gold = useInventoryStore((s) => s.gold);
  const count = useInventoryStore((s) => s.count);
  const add = useInventoryStore((s) => s.add);
  const remove = useInventoryStore((s) => s.remove);
  const addGold = useInventoryStore((s) => s.addGold);
  const removeGold = useInventoryStore((s) => s.removeGold);

  const catalog = SHOP_CATALOG[shopId];
  if (!catalog) return <p className="text-slate-400 text-sm">Sem itens disponíveis.</p>;

  const handleBuy = (item) => {
    if (gold < item.price) return;
    const added = add(item.id, 1);
    if (added) removeGold(item.price);
  };

  const handleSell = (item) => {
    const qty = count(item.id);
    if (qty < 1) return;
    remove(item.id, 1);
    addGold(item.sellPrice);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        <TabButton active={tab === 'buy'} onClick={() => setTab('buy')}>
          Comprar
        </TabButton>
        <TabButton active={tab === 'sell'} onClick={() => setTab('sell')}>
          Vender
        </TabButton>
      </div>

      {tab === 'buy' && (
        <ul className="space-y-2">
          {catalog.buy.map((item) => {
            const canAfford = gold >= item.price;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-2 rounded-lg"
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-100 truncate">{item.name}</p>
                  <p className="text-xs text-amber-400">🪙 {item.price}g</p>
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  className="text-xs px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Comprar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'sell' && (
        <ul className="space-y-2">
          {catalog.sell.map((item) => {
            const qty = count(item.id);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-2 rounded-lg"
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-100 truncate">{item.name}</p>
                  <p className="text-xs text-emerald-400">+🪙 {item.sellPrice}g por unidade</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">×{qty}</span>
                  <button
                    onClick={() => handleSell(item)}
                    disabled={qty < 1}
                    className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Vender
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 text-sm rounded-lg font-semibold transition-colors ${
        active ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
