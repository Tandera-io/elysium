/**
 * NPCShopModal — overlay shown when the player presses G near a shopkeeper.
 * Ferraz's shop supports full buy/sell transactions via the economy layer.
 */
import { useState } from 'react';
import { useNPCShopStore, FERRAZ_SHOP_ID } from '../../systems/npc/NPCShop';
import { useNpcStore } from '../../systems/npc/npcStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { FERRAZ_SHOP_ITEMS, FERRAZ_BUY_PRICES } from '../../features/npc/shop/ferraz';
import { buyItem, sellItem } from '../../systems/economy/transactions';

const PLAYER_ID = 'player';

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const npcs = useNpcStore((s) => s.npcs);
  const gold = useInventoryStore((s) => s.gold);
  const [notice, setNotice] = useState<string | null>(null);

  if (!openShopId) return null;

  const npc = npcs[openShopId];
  const isFerraz = openShopId === FERRAZ_SHOP_ID;

  const handleBuy = (itemId: string, price: number, name: string) => {
    const result = buyItem(PLAYER_ID, itemId, 1, { price, npcId: 'ferraz' });
    setNotice(result.ok ? `Comprado: ${name}` : result.reason);
  };

  const handleSell = (itemId: string, name: string) => {
    const sellPrice = FERRAZ_BUY_PRICES[itemId];
    if (!sellPrice) {
      setNotice(`Ferraz não compra ${name}`);
      return;
    }
    const result = sellItem(PLAYER_ID, itemId, 1, { price: sellPrice, npcId: 'ferraz' });
    setNotice(result.ok ? `Vendido: ${name} (+${sellPrice}g)` : result.reason);
  };

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-w-80 max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold text-slate-100">
            {isFerraz ? 'Ferraria do Ferraz' : `Loja de ${npc?.def.name ?? openShopId}`}
          </h2>
          <button
            onClick={closeShop}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
            aria-label="Fechar loja"
          >
            ✕
          </button>
        </div>

        {isFerraz && (
          <p className="text-amber-400 text-sm mb-2">
            Ouro: <span className="font-bold">{gold}</span>g
          </p>
        )}

        {notice && <p className="text-green-400 text-xs mb-2 text-center">{notice}</p>}

        {isFerraz ? (
          <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {FERRAZ_SHOP_ITEMS.map((item) => {
              const canSell = item.item_id in FERRAZ_BUY_PRICES;
              return (
                <li
                  key={item.item_id}
                  className="flex items-center gap-2 text-sm bg-slate-800 px-3 py-2 rounded-lg"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-slate-200 flex-1">{item.name}</span>
                  <button
                    onClick={() => handleBuy(item.item_id, item.price, item.name)}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-2 py-1 rounded transition-colors"
                  >
                    Comprar {item.price}g
                  </button>
                  {canSell && (
                    <button
                      onClick={() => handleSell(item.item_id, item.name)}
                      className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-2 py-1 rounded transition-colors"
                    >
                      Vender {FERRAZ_BUY_PRICES[item.item_id]}g
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="space-y-2">
            {(npc?.def.economy_role?.shop_inventory ?? []).map((item) => (
              <li
                key={item}
                className="flex justify-between items-center text-sm bg-slate-800 px-3 py-2 rounded-lg"
              >
                <span className="text-slate-200 capitalize">{item.replace(/_/g, ' ')}</span>
                <span className="text-amber-400 text-xs">(em breve)</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-slate-500 text-xs mt-4 text-center">
          Pressione <kbd className="bg-slate-700 px-1 rounded">G</kbd> ou clique ✕ para fechar
        </p>
      </div>
    </div>
  );
}
