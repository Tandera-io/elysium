import type {
  InventoryState,
  InventoryActions,
  ItemId,
} from '../../systems/inventory/inventoryStore';
import { CRAFTING_RECIPES } from './craftingRecipes';
import type { CraftingRecipe } from './craftingRecipes';

type Inventory = InventoryState & InventoryActions;

export function canCraft(recipe: CraftingRecipe, inventory: Inventory): boolean {
  return recipe.ingredients.every((ing) => inventory.count(ing.id) >= ing.qty);
}

export function craftItem(recipeId: string, inventory: Inventory): boolean {
  const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;
  if (!canCraft(recipe, inventory)) return false;

  for (const ing of recipe.ingredients) {
    inventory.remove(ing.id, ing.qty);
  }

  inventory.add(recipe.outputId as ItemId, recipe.outputQty);
  return true;
}

export { CRAFTING_RECIPES };
export type { CraftingRecipe };
