import { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { CRAFTING_RECIPES } from './craftingRecipes';
import { canCraft, craftItem } from './craftingActions';
import type { CraftingRecipe } from './craftingRecipes';

export function CraftingMenu() {
  const open = usePlayerStore((s) => s.craftingMenuOpen);
  const setCraftingMenuOpen = usePlayerStore((s) => s.setCraftingMenuOpen);
  const inventory = useInventoryStore();
  const [selected, setSelected] = useState<CraftingRecipe | null>(null);
  const [flash, setFlash] = useState<'ok' | 'fail' | null>(null);

  if (!open) return null;

  function handleCraft() {
    if (!selected) return;
    const ok = craftItem(selected.id, inventory);
    setFlash(ok ? 'ok' : 'fail');
    setTimeout(() => setFlash(null), 900);
    if (ok && !canCraft(selected, inventory)) {
      setSelected(null);
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[480px] max-w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-100">Artesanato</h2>
          <button
            onClick={() => setCraftingMenuOpen(false)}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
            aria-label="Fechar artesanato"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-4">
          <ul className="flex-1 space-y-1 min-w-0">
            {CRAFTING_RECIPES.map((recipe) => {
              const craftable = canCraft(recipe, inventory);
              const isSelected = selected?.id === recipe.id;
              return (
                <li key={recipe.id}>
                  <button
                    onClick={() => setSelected(recipe)}
                    className={[
                      'w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      isSelected
                        ? 'bg-slate-600 text-slate-100'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300',
                      !craftable && 'opacity-50',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="text-base">{recipe.icon}</span>
                    <span className="flex-1">{recipe.name}</span>
                    {craftable && <span className="text-emerald-400 text-xs">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="w-44 flex-shrink-0">
            {selected ? (
              <div className="bg-slate-800 rounded-lg p-3 h-full flex flex-col gap-3">
                <div className="text-center">
                  <span className="text-3xl">{selected.icon}</span>
                  <p className="text-slate-100 text-sm font-semibold mt-1">{selected.name}</p>
                  <p className="text-slate-400 text-xs">× {selected.outputQty}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">
                    Ingredientes
                  </p>
                  <ul className="space-y-1">
                    {selected.ingredients.map((ing) => {
                      const have = inventory.count(ing.id);
                      const enough = have >= ing.qty;
                      return (
                        <li
                          key={ing.id}
                          className={[
                            'text-xs flex justify-between',
                            enough ? 'text-slate-200' : 'text-rose-400',
                          ].join(' ')}
                        >
                          <span className="capitalize">{ing.id.replace(/_/g, ' ')}</span>
                          <span>
                            {have}/{ing.qty}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <button
                  onClick={handleCraft}
                  disabled={!canCraft(selected, inventory)}
                  className={[
                    'mt-auto w-full py-2 rounded-lg text-sm font-semibold transition-colors',
                    canCraft(selected, inventory)
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                    flash === 'ok' && 'ring-2 ring-emerald-300',
                    flash === 'fail' && 'ring-2 ring-rose-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  Fabricar
                </button>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg p-3 h-full flex items-center justify-center">
                <p className="text-slate-500 text-xs text-center">Selecione uma receita</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-slate-500 text-xs mt-4 text-center">
          Pressione <kbd className="bg-slate-700 px-1 rounded">C</kbd> para fechar
        </p>
      </div>
    </div>
  );
}
