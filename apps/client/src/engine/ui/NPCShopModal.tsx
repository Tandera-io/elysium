/**
 * NPCShopModal — full buy/sell overlay shown when the player presses G near a shopkeeper.
 * Dorinha: buy seeds (deduct gold), sell crops (gain gold).
 */
import { useState } from 'react';
import { useNPCShopStore } from '../../systems/npc/NPCShop';
import { useNpcStore } from '../../systems/npc/npcStore';
import { useInventoryStore, type ItemId } from '../../systems/inventory/inventoryStore';
import dorinhaShop from '../../data/shops/Dorinha.json';

type ShopTab = 'buy' | 'sell';

interface SeedItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  stock: number;
}

interface CropItem {
  id: string;
  name: string;
  icon: string;
  sellPrice: number;
}

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);
  const npcs = useNpcStore((s) => s.npcs);

  const gold = useInventoryStore((s) => s.gold);
  const addGold = useInventoryStore((s) => s.addGold);
  const removeGold = useInventoryStore((s) => s.removeGold);
  const addItem = useInventoryStore((s) => s.add);
  const removeItem = useInventoryStore((s) => s.remove);
  const countItem = useInventoryStore((s) => s.count);

  const [tab, setTab] = useState<ShopTab>('buy');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [buyQty, setBuyQty] = useState<Record<string, number>>({});
  const [sellQty, setSellQty] = useState<Record<string, number>>({});

  if (!openShopId) return null;

  const npc = npcs[openShopId];

  // For now only Dorinha has a shop; extend by shopId lookup later
  const seeds: SeedItem[] = dorinhaShop.seeds as SeedItem[];
  const crops: CropItem[] = dorinhaShop.crops as CropItem[];

  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2200);
  };

  const handleBuy = (seed: SeedItem) => {
    const qty = buyQty[seed.id] ?? 1;
    const total = seed.price * qty;
    if (gold < total) {
      showFeedback(`Ouro insuficiente! Precisa de ${total} moedas.`, false);
      return;
    }
    const ok = addItem(seed.id as ItemId, qty);
    if (!ok) {
      showFeedback('Inventário cheio!', false);
      return;
    }
    removeGold(total);
    showFeedback(`Comprou ${qty}× ${seed.name} por ${total} moedas!`, true);
    setBuyQty((prev) => ({ ...prev, [seed.id]: 1 }));
  };

  const handleSell = (crop: CropItem) => {
    const qty = sellQty[crop.id] ?? 1;
    const have = countItem(crop.id as ItemId);
    if (have < qty) {
      showFeedback(`Você só tem ${have}× ${crop.name}.`, false);
      return;
    }
    removeItem(crop.id as ItemId, qty);
    const earned = crop.sellPrice * qty;
    addGold(earned);
    showFeedback(`Vendeu ${qty}× ${crop.name} por ${earned} moedas!`, true);
    setSellQty((prev) => ({ ...prev, [crop.id]: 1 }));
  };

  const setQty = (
    record: Record<string, number>,
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    id: string,
    delta: number,
    max: number,
  ) => {
    const cur = record[id] ?? 1;
    const next = Math.max(1, Math.min(max, cur + delta));
    setter((prev) => ({ ...prev, [id]: next }));
  };

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-amber-600/40 rounded-2xl p-5 w-[420px] max-w-[95vw] shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-amber-300">{dorinhaShop.shopName}</h2>
            <p className="text-xs text-slate-400">{npc?.def.name ?? openShopId}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-400 font-semibold">Ouro: {gold}</span>
            <button
              onClick={closeShop}
              className="text-slate-400 hover:text-slate-100 text-xl leading-none"
              aria-label="Fechar loja"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-sm text-center font-medium ${
              feedback.ok
                ? 'bg-emerald-800/60 text-emerald-200 border border-emerald-600/40'
                : 'bg-rose-800/60 text-rose-200 border border-rose-600/40'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('buy')}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'buy'
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Comprar Sementes
          </button>
          <button
            onClick={() => setTab('sell')}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'sell'
                ? 'bg-emerald-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Vender Colheita
          </button>
        </div>

        {/* Buy tab */}
        {tab === 'buy' && (
          <ul className="space-y-2">
            {seeds.map((seed) => {
              const qty = buyQty[seed.id] ?? 1;
              const total = seed.price * qty;
              const canAfford = gold >= total;
              return (
                <li
                  key={seed.id}
                  className="flex items-center gap-3 bg-slate-800 px-3 py-2.5 rounded-xl"
                >
                  <span className="text-2xl leading-none">{seed.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-100">{seed.name}</div>
                    <div className="text-xs text-amber-400">{seed.price} moedas cada</div>
                  </div>
                  {/* Qty stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQty(buyQty, setBuyQty, seed.id, -1, seed.stock)}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm leading-none flex items-center justify-center"
                    >
                      –
                    </button>
                    <span className="w-6 text-center text-sm text-slate-100">{qty}</span>
                    <button
                      onClick={() => setQty(buyQty, setBuyQty, seed.id, +1, seed.stock)}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm leading-none flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleBuy(seed)}
                    disabled={!canAfford}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      canAfford
                        ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {total} moedas
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Sell tab */}
        {tab === 'sell' && (
          <ul className="space-y-2">
            {crops.map((crop) => {
              const qty = sellQty[crop.id] ?? 1;
              const have = countItem(crop.id as ItemId);
              const canSell = have >= qty;
              const earned = crop.sellPrice * qty;
              return (
                <li
                  key={crop.id}
                  className="flex items-center gap-3 bg-slate-800 px-3 py-2.5 rounded-xl"
                >
                  <span className="text-2xl leading-none">{crop.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-100">{crop.name}</div>
                    <div className="text-xs text-emerald-400">{crop.sellPrice} moedas cada</div>
                    <div className="text-xs text-slate-500">Você tem: {have}</div>
                  </div>
                  {/* Qty stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQty(sellQty, setSellQty, crop.id, -1, have)}
                      disabled={have === 0}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm leading-none flex items-center justify-center disabled:opacity-40"
                    >
                      –
                    </button>
                    <span className="w-6 text-center text-sm text-slate-100">{qty}</span>
                    <button
                      onClick={() => setQty(sellQty, setSellQty, crop.id, +1, have)}
                      disabled={have === 0}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm leading-none flex items-center justify-center disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleSell(crop)}
                    disabled={!canSell || have === 0}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      canSell && have > 0
                        ? 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    +{earned} moedas
                  </button>
                </li>
              );
            })}
            {crops.every((c) => countItem(c.id as ItemId) === 0) && (
              <li className="text-center text-slate-500 text-sm py-4">
                Você não tem colheita para vender.
              </li>
            )}
          </ul>
        )}

        <p className="text-slate-600 text-xs mt-4 text-center">
          Pressione <kbd className="bg-slate-700 px-1 rounded text-slate-400">G</kbd> ou clique ✕
          para fechar
        </p>
      </div>
    </div>
  );
}
