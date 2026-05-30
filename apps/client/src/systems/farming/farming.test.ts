import { beforeEach, describe, expect, it } from 'vitest';
import { CROPS, isMature, stageForDayCount } from './CropDefs';
import { useFarmStore } from './farmStore';
import { useInventoryStore } from '../inventory/inventoryStore';

describe('CropDefs', () => {
  it('wheat matures in 4 days', () => {
    expect(CROPS.wheat.daysToMature).toBe(4);
    expect(isMature(CROPS.wheat, 3)).toBe(false);
    expect(isMature(CROPS.wheat, 4)).toBe(true);
  });

  it('tomato matures in 5 days', () => {
    expect(CROPS.tomato.daysToMature).toBe(5);
    expect(isMature(CROPS.tomato, 4)).toBe(false);
    expect(isMature(CROPS.tomato, 5)).toBe(true);
  });

  it('stageForDayCount advances stage index over days', () => {
    expect(stageForDayCount(CROPS.wheat, 0).index).toBe(0);
    expect(stageForDayCount(CROPS.wheat, 1).index).toBe(1);
    expect(stageForDayCount(CROPS.wheat, 2).index).toBe(2);
    expect(stageForDayCount(CROPS.wheat, 3).index).toBe(3);
    expect(stageForDayCount(CROPS.wheat, 99).index).toBe(3);
  });
});

describe('farmStore', () => {
  beforeEach(() => {
    useFarmStore.getState().reset();
    useInventoryStore.getState().reset();
  });

  it('starts with no tiles and day=1', () => {
    expect(useFarmStore.getState().day).toBe(1);
    expect(useFarmStore.getState().getTile({ x: 0, z: 0 })).toEqual({ kind: 'empty' });
  });

  it('till transitions empty → tilled', () => {
    const t = { x: 5, z: 5 };
    expect(useFarmStore.getState().till(t)).toBe(true);
    expect(useFarmStore.getState().getTile(t).kind).toBe('tilled');
  });

  it('till on non-empty tile fails', () => {
    const t = { x: 5, z: 5 };
    useFarmStore.getState().till(t);
    expect(useFarmStore.getState().till(t)).toBe(false);
  });

  it('plant transitions tilled → planted', () => {
    const t = { x: 5, z: 5 };
    useFarmStore.getState().till(t);
    expect(useFarmStore.getState().plant(t, 'wheat')).toBe(true);
    const tile = useFarmStore.getState().getTile(t);
    expect(tile.kind).toBe('planted');
    if (tile.kind === 'planted') expect(tile.crop).toBe('wheat');
  });

  it('plant on empty fails', () => {
    expect(useFarmStore.getState().plant({ x: 0, z: 0 }, 'wheat')).toBe(false);
  });

  it('wheat full grow loop: till → water → plant → 4 advances → harvest', () => {
    const t = { x: 10, z: 10 };
    const farm = useFarmStore.getState();
    expect(farm.till(t)).toBe(true);
    expect(farm.water(t)).toBe(true);
    expect(farm.plant(t, 'wheat')).toBe(true);

    // Days 2, 3 → not mature
    farm.advanceDay();
    farm.advanceDay();
    expect(useFarmStore.getState().harvest(t)).toBeNull();

    // Day 4: still not — daysGrown=3 after 3 advances
    farm.advanceDay();
    expect(useFarmStore.getState().harvest(t)).toBeNull();

    // Day 5: daysGrown=4 → mature
    farm.advanceDay();
    const yieldVal = useFarmStore.getState().harvest(t);
    expect(yieldVal).toEqual({ crop: 'wheat', quantity: 2 });

    // After harvest, tile is tilled again (ready for replanting)
    expect(useFarmStore.getState().getTile(t).kind).toBe('tilled');
  });

  it('planted tile reaches mature in daysToMature advances', () => {
    const t = { x: 3, z: 3 };
    const farm = useFarmStore.getState();
    farm.till(t);
    farm.plant(t, 'tomato', 'summer'); // 5 days, tomato is a summer crop
    for (let i = 0; i < 4; i++) farm.advanceDay('summer');
    expect(useFarmStore.getState().harvest(t)).toBeNull();
    farm.advanceDay('summer');
    expect(useFarmStore.getState().harvest(t)).toEqual({ crop: 'tomato', quantity: 3 });
  });
});

describe('farmStore – season wilt', () => {
  beforeEach(() => {
    useFarmStore.getState().reset();
  });

  it('crop wilts when advanceDay called with an out-of-season season', () => {
    const t = { x: 1, z: 1 };
    const farm = useFarmStore.getState();
    farm.till(t);
    // plant wheat (spring/autumn crop) during spring
    farm.plant(t, 'wheat', 'spring');
    expect(farm.getTile(t).kind).toBe('planted');
    // advance day during summer → out of season → wilt
    useFarmStore.getState().advanceDay('summer');
    expect(useFarmStore.getState().getTile(t).kind).toBe('tilled');
  });

  it('crop survives when advanceDay called with an in-season season', () => {
    const t = { x: 2, z: 2 };
    const farm = useFarmStore.getState();
    farm.till(t);
    farm.plant(t, 'wheat', 'spring');
    useFarmStore.getState().advanceDay('spring');
    const tile = useFarmStore.getState().getTile(t);
    expect(tile.kind).toBe('planted');
    if (tile.kind === 'planted') expect(tile.daysGrown).toBe(1);
  });

  it('tomato grows in summer', () => {
    const t = { x: 3, z: 3 };
    const farm = useFarmStore.getState();
    farm.till(t);
    farm.plant(t, 'tomato', 'summer');
    useFarmStore.getState().advanceDay('summer');
    expect(useFarmStore.getState().getTile(t).kind).toBe('planted');
  });

  it('tomato wilts in spring', () => {
    const t = { x: 4, z: 4 };
    const farm = useFarmStore.getState();
    farm.till(t);
    farm.plant(t, 'tomato', 'spring');
    useFarmStore.getState().advanceDay('spring');
    expect(useFarmStore.getState().getTile(t).kind).toBe('tilled');
  });
});

describe('inventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.getState().reset();
  });

  it('starts with seeds', () => {
    expect(useInventoryStore.getState().count('seed_wheat')).toBeGreaterThan(0);
    expect(useInventoryStore.getState().count('seed_tomato')).toBeGreaterThan(0);
  });

  it('add accumulates quantity', () => {
    useInventoryStore.getState().add('wheat', 3);
    useInventoryStore.getState().add('wheat', 2);
    expect(useInventoryStore.getState().count('wheat')).toBe(5);
  });

  it('remove fails when underflow', () => {
    expect(useInventoryStore.getState().remove('tomato', 999)).toBe(false);
  });

  it('remove succeeds and decrements', () => {
    useInventoryStore.getState().add('tomato', 5);
    expect(useInventoryStore.getState().remove('tomato', 3)).toBe(true);
    expect(useInventoryStore.getState().count('tomato')).toBe(2);
  });
});
