import { beforeEach, describe, expect, it } from 'vitest';
import { INVENTORY_SIZE, useInventoryStore } from './inventoryStore';

describe('inventoryStore (slot-based)', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('starts with INVENTORY_SIZE slots, five filled (seasonal seeds)', () => {
    const slots = useInventoryStore.getState().slots;
    expect(slots).toHaveLength(INVENTORY_SIZE);
    expect(slots.filter((s) => s !== null)).toHaveLength(5);
  });

  it('add stacks into an existing slot of same id', () => {
    useInventoryStore.getState().add('seed_wheat', 3);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(9);
    // still 5 non-null slots (stacked, no new slot opened)
    expect(useInventoryStore.getState().slots.filter((s) => s !== null)).toHaveLength(5);
  });

  it('add a new id goes to the first empty slot', () => {
    useInventoryStore.getState().add('wheat', 5);
    const slots = useInventoryStore.getState().slots;
    // wheat in slot index 5 (after 5 seed slots: seed_wheat=0..seed_carrot=4)
    expect(slots[5]).toEqual({ id: 'wheat', qty: 5 });
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
    useInventoryStore.getState().add('wheat', 10); // slot 5
    useInventoryStore.getState().add('wheat', 5); // stacks into slot 5 — count 15
    // Manually create a second wheat stack by filling slot 5 to max first
    useInventoryStore.getState().reset();
    useInventoryStore.getState().add('wheat', 99); // slot 5 full
    useInventoryStore.getState().add('wheat', 30); // slot 6 with 30
    // Now swap slots 5 and 6 — same id, slot 5 already at max so 6 stays
    useInventoryStore.getState().swap(5, 6);
    const slots = useInventoryStore.getState().slots;
    const wheatTotal = slots
      .filter((s) => s?.id === 'wheat')
      .reduce((a, s) => a + (s?.qty ?? 0), 0);
    expect(wheatTotal).toBe(129);
  });
});
