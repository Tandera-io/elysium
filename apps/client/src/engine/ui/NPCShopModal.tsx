import { useEffect } from 'react';
import { useNPCShopStore, DORINHA_SHOP_ID } from '../../systems/npc/NPCShop';
import { useNpcStore } from '../../systems/npc/npcStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import type { ItemId } from '../../systems/inventory/inventoryStore';

interface ShopItem {
  id: ItemId;
  label: string;
  price: number;
}

const SHOP_STOCK: Record<string, ShopItem[]> = {
  [DORINHA_SHOP_ID]: [
    { id: 'seed_wheat', label: 'Semente de Trigo', price: 12 },
    { id: 'seed_tomato', label: 'Semente de Tomate', price: 15 },
    { id: 'seed_corn', label: 'Semente de Milho', price: 18 },
  ],
};

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const npcs = useNpcStore((s) => s.npcs);
  const gold = useInventoryStore((s) => s.gold);
  const removeGold = useInventoryStore((s) => s.removeGold);
  const addItem = useInventoryStore((s) => s.add);

  useEffect(() => {
    if (!openShopId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeShop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openShopId, closeShop]);

  if (!openShopId) return null;

  const npc = npcs[openShopId];
  const stock = SHOP_STOCK[openShopId] ?? [];

  const handleBuy = (item: ShopItem) => {
    const success = removeGold(item.price);
    if (success) {
      addItem(item.id, 1);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[400px] max-w-[92vw] text-slate-100">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold">{npc?.def.name ?? openShopId}</h2>
            <p className="text-xs text-slate-400">Loja</p>
          </div>
          <button
            onClick={closeShop}
            className="text-slate-400 hover:text-slate-200 text-sm"
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </header>
        <div className="px-4 py-3 text-xs text-amber-300 font-mono border-b border-slate-700">
          Ouro: {gold}g
        </div>
        <ul className="divide-y divide-slate-800">
          {stock.map((item) => {
            const canAfford = gold >= item.price;
            return (
              <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{item.label}</span>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  className="bg-amber-500 text-slate-900 px-3 py-1 rounded font-semibold disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                >
                  {item.price}g
                </button>
              </li>
            );
          })}
          {stock.length === 0 && (
            <li className="px-4 py-3 text-slate-500 text-sm italic">Sem estoque disponível.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
