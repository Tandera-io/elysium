import { useState } from 'react';
import { useNPCShopStore, DORINHA_SHOP_ID } from '../../systems/npc/NPCShop';
import { useNpcStore } from '../../systems/npc/npcStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { DORINHA_SEEDS, DORINHA_CROPS } from '../../features/npc/shop/dorinha';

type Tab = 'buy' | 'sell';

function DorinhaShop({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('buy');
  const gold = useInventoryStore((s) => s.gold);
  const { add, remove, count, addGold, removeGold } = useInventoryStore.getState();

  const handleBuy = (id: (typeof DORINHA_SEEDS)[0]['id'], price: number) => {
    if (!removeGold(price)) return;
    add(id, 1);
  };

  const handleSell = (id: (typeof DORINHA_CROPS)[0]['id'], sellPrice: number) => {
    if (!remove(id, 1)) return;
    addGold(sellPrice);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-w-80 max-w-md shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-100">Quitanda da Dorinha</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 text-xl leading-none"
          aria-label="Fechar loja"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('buy')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'buy' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          Comprar Sementes
        </button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'sell' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          Vender Colheita
        </button>
      </div>

      {tab === 'buy' && (
        <ul className="space-y-2">
          {DORINHA_SEEDS.map((item) => {
            const canAfford = gold >= item.price;
            return (
              <li
                key={item.id}
                className="flex justify-between items-center text-sm bg-slate-800 px-3 py-2 rounded-lg"
              >
                <span className="text-slate-200">
                  {item.icon} {item.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-xs">{item.price}g</span>
                  <button
                    onClick={() => handleBuy(item.id, item.price)}
                    disabled={!canAfford}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-2 py-0.5 rounded"
                  >
                    Comprar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'sell' && (
        <ul className="space-y-2">
          {DORINHA_CROPS.map((item) => {
            const qty = count(item.id);
            return (
              <li
                key={item.id}
                className="flex justify-between items-center text-sm bg-slate-800 px-3 py-2 rounded-lg"
              >
                <span className="text-slate-200">
                  {item.icon} {item.name}
                  <span className="text-slate-500 ml-1 text-xs">({qty} und.)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-xs">{item.sellPrice}g</span>
                  <button
                    onClick={() => handleSell(item.id, item.sellPrice)}
                    disabled={qty === 0}
                    className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-2 py-0.5 rounded"
                  >
                    Vender
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
        <span>
          Saldo: <span className="text-amber-300 font-mono">{gold}g</span>
        </span>
        <span>
          Pressione <kbd className="bg-slate-700 px-1 rounded">G</kbd> para fechar
        </span>
      </div>
    </div>
  );
}

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const npcs = useNpcStore((s) => s.npcs);

  if (!openShopId) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
      {openShopId === DORINHA_SHOP_ID ? (
        <DorinhaShop onClose={closeShop} />
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-w-72 max-w-md shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-100">
              Loja de {npcs[openShopId]?.def.name ?? openShopId}
            </h2>
            <button
              onClick={closeShop}
              className="text-slate-400 hover:text-slate-100 text-xl leading-none"
              aria-label="Fechar loja"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-400 text-sm">Sem itens à venda no momento.</p>
        </div>
      )}
    </div>
  );
}
