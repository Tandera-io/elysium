import { create } from 'zustand';
import type { ItemId } from '../inventory/inventoryStore';
import { useInventoryStore } from '../inventory/inventoryStore';

export interface Ingredient {
  itemId: ItemId;
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  resultItemId: ItemId;
  resultQty: number;
  goldCost: number;
  timeMs: number;
}

export const RECIPES: Recipe[] = [
  {
    id: 'bread',
    name: 'Pão',
    ingredients: [
      { itemId: 'wheat', qty: 2 },
      { itemId: 'flour', qty: 1 },
    ],
    resultItemId: 'bread',
    resultQty: 1,
    goldCost: 5,
    timeMs: 3000,
  },
  {
    id: 'spaghetti',
    name: 'Espaguete',
    ingredients: [
      { itemId: 'wheat', qty: 3 },
      { itemId: 'tomato', qty: 2 },
    ],
    resultItemId: 'spaghetti',
    resultQty: 1,
    goldCost: 10,
    timeMs: 5000,
  },
  {
    id: 'corn_soup',
    name: 'Sopa de Milho',
    ingredients: [{ itemId: 'corn', qty: 3 }],
    resultItemId: 'corn_soup',
    resultQty: 1,
    goldCost: 3,
    timeMs: 2000,
  },
];

export interface CookingState {
  cooking: boolean;
  cookingRecipeId: string | null;
  cookingStartMs: number | null;
}

export interface CookingActions {
  canCook: (recipeId: string) => boolean;
  cook: (recipeId: string) => boolean;
}

export const useCookingStore = create<CookingState & CookingActions>((set, get) => ({
  cooking: false,
  cookingRecipeId: null,
  cookingStartMs: null,

  canCook: (recipeId) => {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    const inv = useInventoryStore.getState();
    if (inv.gold < recipe.goldCost) return false;
    return recipe.ingredients.every((ing) => inv.count(ing.itemId) >= ing.qty);
  },

  cook: (recipeId) => {
    if (get().cooking) return false;
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    if (!get().canCook(recipeId)) return false;

    const inv = useInventoryStore.getState();
    for (const ing of recipe.ingredients) {
      inv.remove(ing.itemId, ing.qty);
    }
    inv.removeGold(recipe.goldCost);

    set({ cooking: true, cookingRecipeId: recipeId, cookingStartMs: Date.now() });

    setTimeout(() => {
      useInventoryStore.getState().add(recipe.resultItemId, recipe.resultQty);
      set({ cooking: false, cookingRecipeId: null, cookingStartMs: null });
    }, recipe.timeMs);

    return true;
  },
}));
