import { useState } from 'react';
import { cook, RECIPES, type RecipeId } from '../systems/cooking/recipes';
import { useCookingStore } from '../systems/cooking/cookingStore';

export function CookingPanel() {
  const isOpen = useCookingStore((s) => s.isOpen);
  const close = useCookingStore((s) => s.close);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleCook(recipeId: RecipeId) {
    const result = cook(recipeId);
    if (result.success) {
      setMessage(`Cooked ${RECIPES[recipeId].name}!`);
    } else {
      setMessage(`Missing ingredients!`);
    }
    setTimeout(() => setMessage(null), 2500);
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur rounded-lg px-5 py-4 min-w-[260px] text-slate-200 text-sm shadow-xl border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base">Cozinha</h2>
          <button
            className="text-slate-400 hover:text-slate-100 text-lg leading-none"
            onClick={close}
          >
            ×
          </button>
        </div>

        <ul className="space-y-2">
          {(Object.values(RECIPES) as (typeof RECIPES)[RecipeId][]).map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center justify-between gap-3 bg-slate-800 rounded px-3 py-2"
            >
              <div>
                <div className="font-medium">{recipe.name}</div>
                <div className="text-slate-400 text-xs">
                  {recipe.ingredients.map((ing) => `${ing.qty}x ${ing.id}`).join(', ')}
                </div>
                <div className="text-amber-400 text-xs">{recipe.sellPrice}g</div>
              </div>
              <button
                className="shrink-0 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-semibold rounded px-3 py-1"
                onClick={() => handleCook(recipe.id)}
              >
                Cozinhar
              </button>
            </li>
          ))}
        </ul>

        {message && (
          <div className="mt-3 text-center text-xs font-medium text-amber-300">{message}</div>
        )}
      </div>
    </div>
  );
}
