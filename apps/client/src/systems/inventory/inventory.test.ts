import { beforeEach, describe, expect, it } from 'vitest';
import { INVENTORY_SIZE, useInventoryStore } from './inventoryStore';

describe('inventoryStore (slot-based)', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('starts with INVENTORY_SIZE slots, four filled', () => {
    const slots = useInventoryStore.getState().slots;
    expect(slots).toHaveLength(INVENTORY_SIZE);
    expect(slots.filter((s) => s !== null)).toHaveLength(4);
  });

  it('add stacks into an existing slot of same id', () => {
    useInventoryStore.getState().add('seed_wheat', 3);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(9);
    // still 4 non-null slots (wheat stacked, no new slot used)
    expect(useInventoryStore.getState().slots.filter((s) => s !== null)).toHaveLength(4);
  });

  it('add a new id goes to the first empty slot', () => {
    useInventoryStore.getState().add('wheat', 5);
    const slots = useInventoryStore.getState().slots;
    // wheat in slot index 4 (after seed_wheat=0, seed_tomato=1, seed_corn=2, hoe=3)
    expect(slots[4]).toEqual({ id: 'wheat', qty: 5 });
  });

  it('add up to STACK_MAX then spills into next empty', () => {
    useInventoryStore.getState().add('wheat', 99); // fill new stack
    useInventoryStore.getState().add('wheat', 50); // should spill
    expect(useInventoryStore.getState().count('wheat')).toBe(149);
    const wheatSlots = useInventoryStore.getState().slots.filter((s) => s?.id === 'wheat');
    expect(wheatSlots).toHaveLength(2);
  });

  it('remove succeeds when total qty is enough', () => {
    useInventoryStore.getState().add('wheat', 10);
    expect(useInventoryStore.getState().remove('wheat', 7)).toBe(true);
    expect(useInventoryStore.getState().count('wheat')).toBe(3);
  });

  it('remove fails when not enough', () => {
    expect(useInventoryStore.getState().remove('wheat', 1)).toBe(false);
  });

  it('remove clears slot to null when qty hits 0', () => {
    useInventoryStore.getState().add('wheat', 5);
    useInventoryStore.getState().remove('wheat', 5);
    expect(useInventoryStore.getState().count('wheat')).toBe(0);
    // The slot the wheat occupied should be null again
    const hasWheat = useInventoryStore.getState().slots.some((s) => s?.id === 'wheat');
    expect(hasWheat).toBe(false);
  });

  it('swap exchanges two slots', () => {
    useInventoryStore.getState().swap(0, 1);
    const slots = useInventoryStore.getState().slots;
    expect(slots[0]?.id).toBe('seed_tomato');
    expect(slots[1]?.id).toBe('seed_wheat');
  });

  it('swap merges same-id stacks', () => {
    // Reset to clean state; slots 0-3 pre-filled by makeInitial
    useInventoryStore.getState().reset();
    useInventoryStore.getState().add('wheat', 99); // slot 4 full
    useInventoryStore.getState().add('wheat', 30); // slot 5 with 30
    // Now swap slots 4 and 5 — same id, slot 4 already at max so 5 stays
    useInventoryStore.getState().swap(4, 5);
    const slots = useInventoryStore.getState().slots;
    const wheatTotal = slots
      .filter((s) => s?.id === 'wheat')
      .reduce((a, s) => a + (s?.qty ?? 0), 0);
    expect(wheatTotal).toBe(129);
  });

  it('non-stackable hoe occupies its own slot and does not stack', () => {
    useInventoryStore.getState().reset();
    // Try adding another hoe — it should go to a new slot, not stack on slot 3
    useInventoryStore.getState().add('hoe', 1);
    const hoeSlots = useInventoryStore.getState().slots.filter((s) => s?.id === 'hoe');
    // Initial hoe (slot 3) + new hoe in slot 4 = 2 slots, each qty 1
    expect(hoeSlots).toHaveLength(2);
    expect(hoeSlots[0]?.qty).toBe(1);
    expect(hoeSlots[1]?.qty).toBe(1);
  });
});
