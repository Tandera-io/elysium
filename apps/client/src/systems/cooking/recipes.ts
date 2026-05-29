/**
 * Cooking system — recipe definitions and the cook() function.
 */

import { useInventoryStore } from '../inventory/inventoryStore';
import type { ItemId } from '../inventory/inventoryStore';

export type CookedItemId = 'mushroom_soup_cooked';

export type RecipeId = 'mushroom_soup';

export interface Ingredient {
  id: ItemId;
  qty: number;
}

export interface Recipe {
  id: RecipeId;
  name: string;
  ingredients: Ingredient[];
  output: CookedItemId;
  outputQty: number;
  /** Gold value when sold */
  sellPrice: number;
}

export const RECIPES: Record<RecipeId, Recipe> = {
  mushroom_soup: {
    id: 'mushroom_soup',
    name: 'Sopa de cogumelo',
    ingredients: [
      { id: 'mushroom', qty: 2 },
      { id: 'wheat', qty: 1 },
    ],
    output: 'mushroom_soup_cooked',
    outputQty: 1,
    sellPrice: 45,
  },
};

export type CookResult =
  | { success: true; item: CookedItemId; qty: number }
  | { success: false; reason: string };

export function cook(recipeId: RecipeId): CookResult {
  const recipe = RECIPES[recipeId];
  if (!recipe) {
    return { success: false, reason: `Unknown recipe: ${recipeId}` };
  }

  const inv = useInventoryStore.getState();

  // Validate all ingredients are present
  for (const ingredient of recipe.ingredients) {
    const have = inv.count(ingredient.id);
    if (have < ingredient.qty) {
      return {
        success: false,
        reason: `Missing ingredients! Need ${ingredient.qty}x ${ingredient.id} (have ${have})`,
      };
    }
  }

  // Consume ingredients
  for (const ingredient of recipe.ingredients) {
    inv.remove(ingredient.id, ingredient.qty);
  }

  // Add cooked output
  inv.add(recipe.output as unknown as ItemId, recipe.outputQty);

  return { success: true, item: recipe.output, qty: recipe.outputQty };
}
