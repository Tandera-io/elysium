import { beforeEach, describe, expect, it } from 'vitest';
import {
  INVENTORY_SIZE,
  useInventoryStore,
  USABLE_ITEMS,
  isSeedItem,
  SEED_TO_CROP,
} from './inventoryStore';

describe('inventoryStore (slot-based)', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('starts with INVENTORY_SIZE slots, three filled', () => {
    const slots = useInventoryStore.getState().slots;
    expect(slots).toHaveLength(INVENTORY_SIZE);
    // slot 0: seed_wheat, slot 1: seed_tomato, slot 2: watering_can
    expect(slots.filter((s) => s !== null)).toHaveLength(3);
  });

  it('add stacks into an existing slot of same id', () => {
    useInventoryStore.getState().add('seed_wheat', 3);
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(9);
    // still 3 non-null slots (seed_wheat=0, seed_tomato=1, watering_can=2) — no new slot added
    expect(useInventoryStore.getState().slots.filter((s) => s !== null)).toHaveLength(3);
  });

  it('add a new id goes to the first empty slot', () => {
    useInventoryStore.getState().add('wheat', 5);
    const slots = useInventoryStore.getState().slots;
    // wheat in slot index 3 (after seed_wheat=0, seed_tomato=1, watering_can=2)
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
    useInventoryStore.getState().swap(0, 1);
    const slots = useInventoryStore.getState().slots;
    expect(slots[0]?.id).toBe('seed_tomato');
    expect(slots[1]?.id).toBe('seed_wheat');
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

describe('inventoryStore — item selection and use', () => {
  beforeEach(() => useInventoryStore.getState().reset());

  it('starts with no slot selected', () => {
    expect(useInventoryStore.getState().selectedSlot).toBeNull();
  });

  it('initial state includes watering_can in slot 2', () => {
    const slots = useInventoryStore.getState().slots;
    expect(slots[2]).toEqual({ id: 'watering_can', qty: 1 });
  });

  it('selectSlot sets selectedSlot', () => {
    useInventoryStore.getState().selectSlot(0);
    expect(useInventoryStore.getState().selectedSlot).toBe(0);
  });

  it('selectSlot toggles off when same index passed twice', () => {
    useInventoryStore.getState().selectSlot(0);
    useInventoryStore.getState().selectSlot(0);
    expect(useInventoryStore.getState().selectedSlot).toBeNull();
  });

  it('selectSlot(null) deselects', () => {
    useInventoryStore.getState().selectSlot(1);
    useInventoryStore.getState().selectSlot(null);
    expect(useInventoryStore.getState().selectedSlot).toBeNull();
  });

  it('selectedItem returns null when nothing selected', () => {
    expect(useInventoryStore.getState().selectedItem()).toBeNull();
  });

  it('selectedItem returns the slot item when a slot is selected', () => {
    useInventoryStore.getState().selectSlot(0);
    const item = useInventoryStore.getState().selectedItem();
    expect(item).toEqual({ id: 'seed_wheat', qty: 6 });
  });

  it('selectedItem returns null for an empty selected slot', () => {
    useInventoryStore.getState().selectSlot(5); // empty slot
    expect(useInventoryStore.getState().selectedItem()).toBeNull();
  });

  it('useItem on watering_can returns item but does not consume it', () => {
    useInventoryStore.getState().selectSlot(2); // watering_can
    const result = useInventoryStore.getState().useItem();
    expect(result?.id).toBe('watering_can');
    // still in inventory
    expect(useInventoryStore.getState().count('watering_can')).toBe(1);
    // slot still selected
    expect(useInventoryStore.getState().selectedSlot).toBe(2);
  });

  it('useItem on seed decrements qty by 1', () => {
    useInventoryStore.getState().selectSlot(0); // seed_wheat qty=6
    const result = useInventoryStore.getState().useItem();
    expect(result?.id).toBe('seed_wheat');
    expect(useInventoryStore.getState().count('seed_wheat')).toBe(5);
  });

  it('useItem on seed removes slot and deselects when last seed consumed', () => {
    useInventoryStore.getState().reset();
    // Place exactly 1 wheat seed in slot 5
    const store = useInventoryStore.getState();
    store.add('seed_wheat', 1);
    // Set qty to 1 by resetting and adding 1
    useInventoryStore.getState().reset();
    // slots[0] = seed_wheat qty 6 from makeInitial — we use it 6 times
    useInventoryStore.getState().selectSlot(0);
    for (let i = 0; i < 6; i++) useInventoryStore.getState().useItem();
    // slot 0 should now be null and selected should be null
    expect(useInventoryStore.getState().slots[0]).toBeNull();
    expect(useInventoryStore.getState().selectedSlot).toBeNull();
  });

  it('useItem returns null when nothing is selected', () => {
    expect(useInventoryStore.getState().useItem()).toBeNull();
  });

  it('useItem returns null for non-usable item (harvested crop)', () => {
    useInventoryStore.getState().add('wheat', 3);
    const idx = useInventoryStore.getState().slots.findIndex((s) => s?.id === 'wheat');
    useInventoryStore.getState().selectSlot(idx);
    expect(useInventoryStore.getState().useItem()).toBeNull();
  });
});

describe('inventoryStore — item helpers', () => {
  it('USABLE_ITEMS contains watering_can, seed_wheat, seed_tomato, seed_corn', () => {
    expect(USABLE_ITEMS.has('watering_can')).toBe(true);
    expect(USABLE_ITEMS.has('seed_wheat')).toBe(true);
    expect(USABLE_ITEMS.has('seed_tomato')).toBe(true);
    expect(USABLE_ITEMS.has('seed_corn')).toBe(true);
  });

  it('isSeedItem identifies seeds correctly', () => {
    expect(isSeedItem('seed_wheat')).toBe(true);
    expect(isSeedItem('seed_tomato')).toBe(true);
    expect(isSeedItem('seed_corn')).toBe(true);
    expect(isSeedItem('watering_can')).toBe(false);
    expect(isSeedItem('wheat')).toBe(false);
  });

  it('SEED_TO_CROP maps seed ids to crop ids', () => {
    expect(SEED_TO_CROP['seed_wheat']).toBe('wheat');
    expect(SEED_TO_CROP['seed_tomato']).toBe('tomato');
    expect(SEED_TO_CROP['seed_corn']).toBe('corn');
  });
});
