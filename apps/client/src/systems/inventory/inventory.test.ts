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

  it('useSlot consumes one unit from an occupied slot', () => {
    useInventoryStore.getState().add('wheat', 3);
    const slotIdx = useInventoryStore.getState().slots.findIndex((s) => s?.id === 'wheat');
    expect(slotIdx).toBeGreaterThanOrEqual(0);
    expect(useInventoryStore.getState().useSlot(slotIdx)).toBe(true);
    expect(useInventoryStore.getState().count('wheat')).toBe(2);
  });

  it('useSlot clears slot to null when last unit is consumed', () => {
    useInventoryStore.getState().add('wheat', 1);
    const slotIdx = useInventoryStore.getState().slots.findIndex((s) => s?.id === 'wheat');
    useInventoryStore.getState().useSlot(slotIdx);
    expect(useInventoryStore.getState().slots[slotIdx]).toBeNull();
  });

  it('useSlot returns false for an empty slot', () => {
    const emptyIdx = useInventoryStore.getState().slots.findIndex((s) => s === null);
    expect(useInventoryStore.getState().useSlot(emptyIdx)).toBe(false);
  });

  it('useSlot returns false for out-of-bounds index', () => {
    expect(useInventoryStore.getState().useSlot(-1)).toBe(false);
    expect(useInventoryStore.getState().useSlot(9999)).toBe(false);
  });
});
