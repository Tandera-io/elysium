import { beforeEach, describe, expect, it } from 'vitest';
import { FORAGE_DEFS } from './forageDefs';
import { useForageStore } from './forageStore';
import { useInventoryStore } from '../inventory/inventoryStore';

describe('forageDefs', () => {
  it('defines the four forage item types', () => {
    expect(FORAGE_DEFS.stick).toBeDefined();
    expect(FORAGE_DEFS.stone).toBeDefined();
    expect(FORAGE_DEFS.herb).toBeDefined();
    expect(FORAGE_DEFS.berry).toBeDefined();
  });

  it('each def has a label and sprite path', () => {
    for (const def of Object.values(FORAGE_DEFS)) {
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.sprite).toMatch(/sprites\/cache\//);
    }
  });
});

describe('forageStore', () => {
  beforeEach(() => {
    useForageStore.getState().reset();
    useInventoryStore.getState().reset();
  });

  it('starts with 5 spawns in floresta (all uncollected)', () => {
    const spawns = useForageStore.getState().spawns;
    expect(spawns).toHaveLength(5);
    expect(spawns.every((s) => !s.collected)).toBe(true);
  });

  it('collect marks the spawn as collected and adds to inventory', () => {
    const store = useForageStore.getState();
    const spawn = store.spawns[0];
    if (!spawn) throw new Error('no spawns');

    expect(store.collect(spawn.id)).toBe(true);
    expect(useForageStore.getState().spawns[0]?.collected).toBe(true);
    expect(useInventoryStore.getState().count(spawn.itemId)).toBe(1);
  });

  it('collecting all 5 spawns yields 5 items in inventory', () => {
    const store = useForageStore.getState();
    for (const s of store.spawns) {
      useForageStore.getState().collect(s.id);
    }
    const inv = useInventoryStore.getState();
    const total = ['stick', 'stone', 'herb', 'berry'].reduce(
      (acc, id) => acc + inv.count(id as Parameters<typeof inv.count>[0]),
      0,
    );
    expect(total).toBe(5);
  });

  it('collect returns false for an already-collected spawn', () => {
    const spawn = useForageStore.getState().spawns[0];
    if (!spawn) throw new Error('no spawns');
    useForageStore.getState().collect(spawn.id);
    expect(useForageStore.getState().collect(spawn.id)).toBe(false);
  });

  it('collect returns false for unknown spawn id', () => {
    expect(useForageStore.getState().collect('nonexistent')).toBe(false);
  });

  it('reset restores all spawns to uncollected', () => {
    const store = useForageStore.getState();
    for (const s of store.spawns) store.collect(s.id);
    useForageStore.getState().reset();
    expect(useForageStore.getState().spawns.every((s) => !s.collected)).toBe(true);
  });
});
