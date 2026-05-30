import { beforeEach, describe, expect, it } from 'vitest';
import { INVENTORY_SIZE, useInventoryStore } from './inventoryStore';

describe('inventoryStore (slot-based)', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('starts with INVENTORY_SIZE slots, two filled', () => {
    const slots = useInventoryStore.getState().slots;
    expect(slots).toHaveLength(INVENTORY_SIZE);
    expect(slots.filter((s) => s !== null)).toHaveLength(2);
  });

  it('add stacks into an existing slot of same id', () => {
    useInventoryStore.getState().add('seed_wheat', 3);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(9);
    // still 2 non-null slots
    expect(useInventoryStore.getState().slots.filter((s) => s !== null)).toHaveLength(2);
  });

  it('add a new id goes to the first empty slot', () => {
    useInventoryStore.getState().add('wheat', 5);
    const slots = useInventoryStore.getState().slots;
    // wheat in slot index 2 (after seed_wheat=0, seed_tomato=1)
    expect(slots[2]).toEqual({ id: 'wheat', qty: 5 });
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
    useInventoryStore.getState().add('wheat', 10); // slot 2
    useInventoryStore.getState().add('wheat', 5); // stacks into slot 2 — count 15
    // Manually create a second wheat stack by filling slot 2 to max first
    useInventoryStore.getState().reset();
    useInventoryStore.getState().add('wheat', 99); // slot 2 full
    useInventoryStore.getState().add('wheat', 30); // slot 3 with 30
    // Now swap slots 2 and 3 — same id, slot 2 already at max so 3 stays
    useInventoryStore.getState().swap(2, 3);
    const slots = useInventoryStore.getState().slots;
    const wheatTotal = slots
      .filter((s) => s?.id === 'wheat')
      .reduce((a, s) => a + (s?.qty ?? 0), 0);
    expect(wheatTotal).toBe(129);
  });

  it('dropSlot removes all items from a slot and returns dropped item', () => {
    const dropped = useInventoryStore.getState().dropSlot(0);
    expect(dropped).toEqual({ id: 'seed_wheat', qty: 6 });
    expect(useInventoryStore.getState().slots[0]).toBeNull();
  });

  it('dropSlot on empty slot returns null', () => {
    const dropped = useInventoryStore.getState().dropSlot(5);
    expect(dropped).toBeNull();
  });

  it('dropSlot out of bounds returns null', () => {
    expect(useInventoryStore.getState().dropSlot(-1)).toBeNull();
    expect(useInventoryStore.getState().dropSlot(INVENTORY_SIZE)).toBeNull();
  });

  it('useItem consumes qty from inventory', () => {
    expect(useInventoryStore.getState().useItem('seed_wheat', 2)).toBe(true);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(4);
  });

  it('useItem returns false when not enough', () => {
    expect(useInventoryStore.getState().useItem('seed_wheat', 99)).toBe(false);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(6);
  });

  it('useItem defaults to qty=1', () => {
    expect(useInventoryStore.getState().useItem('seed_wheat')).toBe(true);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(5);
  });

  it('pickup adds items and returns true when space available', () => {
    expect(useInventoryStore.getState().pickup('wheat', 5)).toBe(true);
    expect(useInventoryStore.getState().count('wheat')).toBe(5);
  });

  it('pickup returns false when inventory is full', () => {
    // fill all slots
    for (let i = 2; i < INVENTORY_SIZE; i++) {
      useInventoryStore.getState().add('wheat', 99);
    }
    const result = useInventoryStore.getState().pickup('tomato', 1);
    expect(result).toBe(false);
  });
});
