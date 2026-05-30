import { useState } from 'react';
import { useNPCShopStore } from '../../systems/npc/NPCShop';
import { useNpcStore } from '../../systems/npc/npcStore';
import { useInventoryStore, type ItemId } from '../../systems/inventory/inventoryStore';
import { DORINHA_SHOP } from '../../features/npc/shop/dorinha';
import { NINA_SHOP } from '../../features/npc/shop/nina';

interface ShopItem {
  item_id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
  category: string;
}

const SHOP_BY_ID: Record<string, { shopName: string; items: ShopItem[] }> = {
  [DORINHA_SHOP.shopId]: DORINHA_SHOP as { shopName: string; items: ShopItem[] },
  [NINA_SHOP.shopId]: NINA_SHOP as unknown as { shopName: string; items: ShopItem[] },
};

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const npcs = useNpcStore((s) => s.npcs);
  const gold = useInventoryStore((s) => s.gold);
  const count = useInventoryStore((s) => s.count);
  const add = useInventoryStore((s) => s.add);
  const remove = useInventoryStore((s) => s.remove);
  const addGold = useInventoryStore((s) => s.addGold);
  const removeGold = useInventoryStore((s) => s.removeGold);
  const [flash, setFlash] = useState<string | null>(null);

  if (!openShopId) return null;

  const npc = npcs[openShopId];
  const shop = SHOP_BY_ID[openShopId];
  const shopName = shop?.shopName ?? npc?.def.name ?? openShopId;
  const shopItems: ShopItem[] = shop?.items ?? [];

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  }

  function handleBuy(item: ShopItem) {
    const ok = removeGold(item.price);
    if (!ok) {
      showFlash('Ouro insuficiente!');
      return;
    }
    add(item.item_id as ItemId, 1);
    showFlash(`Comprou ${item.name}!`);
  }

  function handleSell(item: ShopItem) {
    const qty = count(item.item_id as ItemId);
    if (qty <= 0) return;
    remove(item.item_id as ItemId, 1);
    addGold(item.price);
    showFlash(`Vendeu ${item.name} por ${item.price}g!`);
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-w-80 max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold text-slate-100">{shopName}</h2>
          <button
            onClick={closeShop}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
            aria-label="Fechar loja"
          >
            ✕
          </button>
        </div>

        <div className="text-amber-300 text-sm font-mono mb-4">🪙 {gold}g</div>

        {flash && (
          <div className="mb-3 text-center text-xs bg-slate-800 text-amber-300 rounded px-3 py-1">
            {flash}
          </div>
        )}

        {shopItems.length === 0 ? (
          <p className="text-slate-400 text-sm">Sem itens à venda no momento.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {shopItems.map((item) => {
              const playerQty = count(item.item_id as ItemId);
              const isCrop = item.category === 'crop';
              const canSell = isCrop && playerQty > 0;
              const canBuy = !isCrop && gold >= item.price;

              return (
                <li
                  key={item.item_id}
                  className="flex justify-between items-center text-sm bg-slate-800 px-3 py-2 rounded-lg gap-2"
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span className="flex-1 text-slate-200">{item.name}</span>
                  <span className="text-amber-400 text-xs font-mono">{item.price}g</span>
                  {playerQty > 0 && (
                    <span className="text-slate-400 text-xs font-mono">×{playerQty}</span>
                  )}
                  {isCrop ? (
                    <button
                      onClick={() => handleSell(item)}
                      disabled={!canSell}
                      className={`text-xs px-2 py-1 rounded font-semibold transition ${
                        canSell
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Vender
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canBuy}
                      className={`text-xs px-2 py-1 rounded font-semibold transition ${
                        canBuy
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Comprar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-slate-500 text-xs mt-4 text-center">
          Pressione <kbd className="bg-slate-700 px-1 rounded">G</kbd> ou clique ✕ para fechar
        </p>
      </div>
    </div>
  );
}
