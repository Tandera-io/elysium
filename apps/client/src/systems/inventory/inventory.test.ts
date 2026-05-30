import { beforeEach, describe, expect, it } from 'vitest';
import { INVENTORY_SIZE, useInventoryStore } from './inventoryStore';

describe('inventoryStore (slot-based)', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('starts with INVENTORY_SIZE slots, three filled', () => {
    const slots = useInventoryStore.getState().slots;
    expect(slots).toHaveLength(INVENTORY_SIZE);
    expect(slots.filter((s) => s !== null)).toHaveLength(3);
  });

  it('add stacks into an existing slot of same id', () => {
    useInventoryStore.getState().add('seed_wheat', 3);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(9);
    // still 3 non-null slots (hoe + two seed types)
    expect(useInventoryStore.getState().slots.filter((s) => s !== null)).toHaveLength(3);
  });

  it('add a new id goes to the first empty slot', () => {
    useInventoryStore.getState().add('wheat', 5);
    const slots = useInventoryStore.getState().slots;
    // wheat in slot index 3 (after hoe=0, seed_wheat=1, seed_tomato=2)
    expect(slots[3]).toEqual({ id: 'wheat', qty: 5 });
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
    // slots start as: [hoe, seed_wheat, seed_tomato, ...]
    useInventoryStore.getState().swap(1, 2);
    const slots = useInventoryStore.getState().slots;
    expect(slots[1]?.id).toBe('seed_tomato');
    expect(slots[2]?.id).toBe('seed_wheat');
  });

  it('swap merges same-id stacks', () => {
    useInventoryStore.getState().add('wheat', 10); // slot 3
    useInventoryStore.getState().add('wheat', 5); // stacks into slot 3 — count 15
    // Manually create a second wheat stack by filling slot 3 to max first
    useInventoryStore.getState().reset();
    useInventoryStore.getState().add('wheat', 99); // slot 3 full
    useInventoryStore.getState().add('wheat', 30); // slot 4 with 30
    // Now swap slots 3 and 4 — same id, slot 3 already at max so 4 stays
    useInventoryStore.getState().swap(3, 4);
    const slots = useInventoryStore.getState().slots;
    const wheatTotal = slots
      .filter((s) => s?.id === 'wheat')
      .reduce((a, s) => a + (s?.qty ?? 0), 0);
    expect(wheatTotal).toBe(129);
  });
});
