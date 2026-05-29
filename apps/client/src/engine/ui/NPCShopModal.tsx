/**
 * NPCShopModal — overlay shown when the player presses G near a shopkeeper.
 */
import { useNPCShopStore } from '../../systems/npc/NPCShop';
import { useNpcStore } from '../../systems/npc/npcStore';

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const npcs = useNpcStore((s) => s.npcs);

  if (!openShopId) return null;

  const npc = npcs[openShopId];
  const shopItems = npc?.def.economy_role?.shop_inventory ?? [];

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-w-72 max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-100">
            Loja de {npc?.def.name ?? openShopId}
          </h2>
          <button
            onClick={closeShop}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
            aria-label="Fechar loja"
          >
            ✕
          </button>
        </div>

        {shopItems.length === 0 ? (
          <p className="text-slate-400 text-sm">Sem itens à venda no momento.</p>
        ) : (
          <ul className="space-y-2">
            {shopItems.map((item) => (
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
      </div>
    </div>
  );
}
