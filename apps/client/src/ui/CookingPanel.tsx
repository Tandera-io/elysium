import { RECIPES, useCookingStore } from '../systems/cooking/cookingStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';

const ITEM_ICON: Record<string, string> = {
  wheat: '🌾',
  tomato: '🍅',
  corn: '🌽',
  flour: '🫙',
  bread: '🍞',
  spaghetti: '🍝',
  corn_soup: '🍲',
};

const ITEM_NAME: Record<string, string> = {
  wheat: 'Trigo',
  tomato: 'Tomate',
  corn: 'Milho',
  flour: 'Farinha',
  bread: 'Pão',
  spaghetti: 'Espaguete',
  corn_soup: 'Sopa de Milho',
};

interface CookingPanelProps {
  open: boolean;
  onClose: () => void;
}

export function CookingPanel({ open, onClose }: CookingPanelProps) {
  const canCook = useCookingStore((s) => s.canCook);
  const cook = useCookingStore((s) => s.cook);
  const cooking = useCookingStore((s) => s.cooking);
  const cookingRecipeId = useCookingStore((s) => s.cookingRecipeId);
  const gold = useInventoryStore((s) => s.gold);
  const count = useInventoryStore((s) => s.count);

  if (!open) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <aside className="pointer-events-auto bg-slate-900/95 backdrop-blur rounded-xl border border-slate-700 p-4 w-80 shadow-2xl">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200">🍳 Cozinha</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-lg leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="text-xs text-amber-300 font-mono mb-3">🪙 {gold}g disponível</div>

        <ul className="space-y-2">
          {RECIPES.map((recipe) => {
            const affordable = canCook(recipe.id);
            const isBusy = cooking && cookingRecipeId !== recipe.id;
            const isCooking = cooking && cookingRecipeId === recipe.id;

            return (
              <li
                key={recipe.id}
                className={`rounded-lg border p-2.5 ${
                  isCooking
                    ? 'border-amber-500 bg-amber-900/30'
                    : affordable && !isBusy
                      ? 'border-slate-600 bg-slate-800/60'
                      : 'border-slate-800 bg-slate-900/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-100">
                    {ITEM_ICON[recipe.resultItemId] ?? '?'} {recipe.name}
                  </span>
                  <span className="text-xs text-amber-300 font-mono">
                    {recipe.goldCost}g · {recipe.timeMs / 1000}s
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {recipe.ingredients.map((ing) => {
                    const have = count(ing.itemId);
                    const enough = have >= ing.qty;
                    return (
                      <span
                        key={ing.itemId}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          enough
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-rose-900/60 text-rose-300'
                        }`}
                      >
                        {ITEM_ICON[ing.itemId] ?? '?'} {ITEM_NAME[ing.itemId] ?? ing.itemId} {have}/
                        {ing.qty}
                      </span>
                    );
                  })}
                </div>

                <button
                  disabled={!affordable || isBusy || isCooking}
                  onClick={() => cook(recipe.id)}
                  className={`w-full text-xs rounded py-1 font-semibold transition-colors ${
                    isCooking
                      ? 'bg-amber-700 text-amber-200 cursor-wait'
                      : affordable && !isBusy
                        ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isCooking
                    ? '⏳ Cozinhando…'
                    : `Cozinhar → ${ITEM_ICON[recipe.resultItemId] ?? '?'} ${ITEM_NAME[recipe.resultItemId] ?? recipe.resultItemId}`}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-[10px] text-slate-500 mt-3 text-center">Pressione C para fechar</p>
      </aside>
    </div>
  );
}
