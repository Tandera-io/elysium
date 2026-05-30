/**
 * NPCShopModal — overlay shown when the player presses G near a shopkeeper.
 * Displays the NPC's shop inventory with buy buttons wired to the inventory store.
 */
import { useNPCShopStore } from '../../systems/npc/NPCShop';
import { useNpcStore } from '../../systems/npc/npcStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { DORINHA_SHOP } from '../../features/npc/shop/dorinha';
import { NINA_SHOP } from '../../features/npc/shop/nina';
import type { ItemId } from '../../systems/inventory/inventoryStore';

/** Minimal shape needed by the modal — compatible with both shop definitions. */
interface ShopEntry {
  item_id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
}

interface ShopDef {
  shopName: string;
  items: readonly ShopEntry[];
}

const SHOP_REGISTRY: Record<string, ShopDef> = {
  dorinha: DORINHA_SHOP as ShopDef,
  nina: NINA_SHOP as ShopDef,
};

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const npcs = useNpcStore((s) => s.npcs);
  const gold = useInventoryStore((s) => s.gold);
  const addItem = useInventoryStore((s) => s.add);
  const removeGold = useInventoryStore((s) => s.removeGold);

  if (!openShopId) return null;

  const npc = npcs[openShopId];
  const shopDef = SHOP_REGISTRY[openShopId];
  const shopItems = shopDef?.items ?? [];
  const shopName = shopDef?.shopName ?? `Loja de ${npc?.def.name ?? openShopId}`;

  function handleBuy(item: ShopEntry) {
    if (gold < item.price) return;
    const paid = removeGold(item.price);
    if (paid) {
      addItem(item.item_id as ItemId, 1);
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-w-80 max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-100">{shopName}</h2>
          <button
            onClick={closeShop}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
            aria-label="Fechar loja"
          >
            ✕
          </button>
        </div>

        <p className="text-amber-300 text-xs font-mono mb-3">Ouro disponível: {gold}g</p>

        {shopItems.length === 0 ? (
          <p className="text-slate-400 text-sm">Sem itens à venda no momento.</p>
        ) : (
          <ul className="space-y-2">
            {shopItems.map((item) => {
              const canAfford = gold >= item.price;
              return (
                <li
                  key={item.item_id}
                  className="flex justify-between items-center text-sm bg-slate-800 px-3 py-2 rounded-lg"
                >
                  <span className="text-slate-200">
                    {item.icon} {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-xs font-mono">{item.price}g</span>
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                      className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Comprar
                    </button>
                  </div>
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
