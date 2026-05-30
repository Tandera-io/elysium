import { beforeEach, describe, expect, it } from 'vitest';
import { CRAFT_RECIPES, craftItem, canCraft, getAllCraftableRecipes } from './crafts';
import { useInventoryStore } from '../systems/inventory/inventoryStore';

describe('CRAFT_RECIPES', () => {
  it('defines all expected tool recipes', () => {
    expect(Object.keys(CRAFT_RECIPES)).toContain('shovel');
    expect(Object.keys(CRAFT_RECIPES)).toContain('hoe');
    expect(Object.keys(CRAFT_RECIPES)).toContain('bucket');
    expect(Object.keys(CRAFT_RECIPES)).toContain('watering_can');
    expect(Object.keys(CRAFT_RECIPES)).toContain('scythe');
    expect(Object.keys(CRAFT_RECIPES)).toContain('pickaxe');
  });

  it('each recipe has a name, description, and at least one ingredient', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      expect(recipe.name.length).toBeGreaterThan(0);
      expect(recipe.description.length).toBeGreaterThan(0);
      expect(recipe.ingredients.length).toBeGreaterThan(0);
    }
  });

  it('each recipe outputs at least 1 item', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      expect(recipe.outputQty).toBeGreaterThanOrEqual(1);
    }
  });

  it('getAllCraftableRecipes returns all recipes', () => {
    const recipes = getAllCraftableRecipes();
    expect(recipes).toHaveLength(Object.keys(CRAFT_RECIPES).length);
  });
});

describe('canCraft', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('returns false when player lacks materials', () => {
    expect(canCraft('shovel')).toBe(false);
  });

  it('returns false when player lacks gold even with materials', () => {
    const inv = useInventoryStore.getState();
    inv.add('lenha', 10);
    // Remove all gold
    inv.removeGold(500);
    expect(canCraft('shovel')).toBe(false);
  });

  it('returns true when player has sufficient materials and gold', () => {
    const inv = useInventoryStore.getState();
    inv.add('lenha', 10); // shovel needs 3 lenha + 50 gold (default gold=500)
    expect(canCraft('shovel')).toBe(true);
  });
});

describe('craftItem', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('returns not-ok when player lacks materials', () => {
    const result = craftItem('shovel');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBeTruthy();
  });

  it('crafts shovel successfully when player has materials and gold', () => {
    const inv = useInventoryStore.getState();
    inv.add('lenha', 10);
    const result = craftItem('shovel');
    expect(result.ok).toBe(true);
    expect(inv.count('shovel')).toBe(1);
  });

  it('consumes the correct amount of lenha when crafting hoe', () => {
    const inv = useInventoryStore.getState();
    inv.add('lenha', 5);
    craftItem('hoe'); // costs 2 lenha + 30 gold
    expect(inv.count('lenha')).toBe(3);
  });

  it('deducts gold cost on successful craft', () => {
    const inv = useInventoryStore.getState();
    inv.add('lenha', 10);
    const goldBefore = useInventoryStore.getState().gold;
    craftItem('shovel'); // costs 50 gold
    expect(useInventoryStore.getState().gold).toBe(goldBefore - 50);
  });

  it('does not craft if gold is insufficient', () => {
    const inv = useInventoryStore.getState();
    inv.add('lenha', 10);
    inv.removeGold(500); // drain all gold
    const result = craftItem('pickaxe'); // costs 80 gold
    expect(result.ok).toBe(false);
    expect(inv.count('pickaxe')).toBe(0);
  });
});
