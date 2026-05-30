/**
 * Crafting recipes and crafting logic for tools and equipment.
 * Recipes list required ingredients; craftItem consumes them from inventory.
 */

import { useInventoryStore } from '../systems/inventory/inventoryStore';
import type { ItemId } from '../systems/inventory/inventoryStore';

export type CraftItemId = 'shovel' | 'hoe' | 'bucket' | 'watering_can' | 'scythe' | 'pickaxe';

export type IngredientId =
  | 'lenha'
  | 'wheat'
  | 'tomato'
  | 'pumpkin'
  | 'corn'
  | 'strawberry'
  | 'seed_wheat'
  | 'seed_tomato'
  | 'seed_corn';

export interface Ingredient {
  id: IngredientId;
  qty: number;
}

export interface CraftRecipe {
  id: CraftItemId;
  name: string;
  description: string;
  ingredients: Ingredient[];
  /** Gold cost deducted from player wallet. */
  goldCost: number;
  outputQty: number;
}

export const CRAFT_RECIPES: Record<CraftItemId, CraftRecipe> = {
  shovel: {
    id: 'shovel',
    name: 'Pá',
    description: 'Escava a terra para plantar.',
    ingredients: [{ id: 'lenha', qty: 3 }],
    goldCost: 50,
    outputQty: 1,
  },
  hoe: {
    id: 'hoe',
    name: 'Enxada',
    description: 'Afia o solo para receber sementes.',
    ingredients: [{ id: 'lenha', qty: 2 }],
    goldCost: 30,
    outputQty: 1,
  },
  bucket: {
    id: 'bucket',
    name: 'Balde',
    description: 'Carrega água do rio.',
    ingredients: [{ id: 'lenha', qty: 2 }],
    goldCost: 5,
    outputQty: 1,
  },
  watering_can: {
    id: 'watering_can',
    name: 'Regador',
    description: 'Rega as plantas com facilidade.',
    ingredients: [{ id: 'lenha', qty: 3 }],
    goldCost: 20,
    outputQty: 1,
  },
  scythe: {
    id: 'scythe',
    name: 'Foice',
    description: 'Corta grãos maduros rapidamente.',
    ingredients: [{ id: 'lenha', qty: 4 }],
    goldCost: 60,
    outputQty: 1,
  },
  pickaxe: {
    id: 'pickaxe',
    name: 'Picareta',
    description: 'Quebra pedras e minerais.',
    ingredients: [{ id: 'lenha', qty: 5 }],
    goldCost: 80,
    outputQty: 1,
  },
};

export type CraftResult = { ok: true } | { ok: false; reason: string };

export function canCraft(recipeId: CraftItemId): boolean {
  const recipe = CRAFT_RECIPES[recipeId];
  const inv = useInventoryStore.getState();
  if (inv.gold < recipe.goldCost) return false;
  for (const ingredient of recipe.ingredients) {
    if (inv.count(ingredient.id as ItemId) < ingredient.qty) return false;
  }
  return true;
}

export function craftItem(recipeId: CraftItemId): CraftResult {
  if (!canCraft(recipeId)) {
    return { ok: false, reason: 'Ingredientes insuficientes' };
  }
  const recipe = CRAFT_RECIPES[recipeId];
  const inv = useInventoryStore.getState();
  for (const ingredient of recipe.ingredients) {
    inv.remove(ingredient.id as ItemId, ingredient.qty);
  }
  if (recipe.goldCost > 0) {
    inv.removeGold(recipe.goldCost);
  }
  inv.add(recipeId as ItemId, recipe.outputQty);
  return { ok: true };
}

export function getAllCraftableRecipes(): CraftRecipe[] {
  return Object.values(CRAFT_RECIPES);
}
