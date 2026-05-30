import { beforeEach, describe, expect, it } from 'vitest';
import { CROPS, isMature, isInSeason, stageForDayCount } from './CropDefs';
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

  it('carrot is in-season in spring and autumn', () => {
    expect(isInSeason(CROPS.carrot, 'spring')).toBe(true);
    expect(isInSeason(CROPS.carrot, 'autumn')).toBe(true);
    expect(isInSeason(CROPS.carrot, 'summer')).toBe(false);
    expect(isInSeason(CROPS.carrot, 'winter')).toBe(false);
  });

  it('pumpkin is in-season only in autumn', () => {
    expect(isInSeason(CROPS.pumpkin, 'autumn')).toBe(true);
    expect(isInSeason(CROPS.pumpkin, 'spring')).toBe(false);
  });

  it('strawberry is in-season only in spring', () => {
    expect(isInSeason(CROPS.strawberry, 'spring')).toBe(true);
    expect(isInSeason(CROPS.strawberry, 'summer')).toBe(false);
  });

  it('all crops have a positive sellPrice', () => {
    for (const crop of Object.values(CROPS)) {
      expect(crop.sellPrice).toBeGreaterThan(0);
    }
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
    expect(useFarmStore.getState().plant(t, 'wheat', 'spring')).toBe(true);
    const tile = useFarmStore.getState().getTile(t);
    expect(tile.kind).toBe('planted');
    if (tile.kind === 'planted') expect(tile.crop).toBe('wheat');
  });

  it('plant on empty fails', () => {
    expect(useFarmStore.getState().plant({ x: 0, z: 0 }, 'wheat', 'spring')).toBe(false);
  });

  it('plant fails if crop is out of season', () => {
    const t = { x: 5, z: 5 };
    useFarmStore.getState().till(t);
    // pumpkin is autumn-only; trying to plant in spring should fail
    expect(useFarmStore.getState().plant(t, 'pumpkin', 'spring')).toBe(false);
  });

  it('plant succeeds when crop is in-season', () => {
    const t = { x: 5, z: 5 };
    useFarmStore.getState().till(t);
    expect(useFarmStore.getState().plant(t, 'pumpkin', 'autumn')).toBe(true);
  });

  it('wheat full grow loop: till → water → plant → 4 rainy advances → harvest', () => {
    const t = { x: 10, z: 10 };
    const farm = useFarmStore.getState();
    expect(farm.till(t)).toBe(true);
    expect(farm.water(t)).toBe(true);
    expect(farm.plant(t, 'wheat', 'spring')).toBe(true);

    // Use rainy weather so tiles are auto-watered each day
    // Days 2, 3 → not mature
    farm.advanceDay('spring', 'rainy');
    farm.advanceDay('spring', 'rainy');
    expect(useFarmStore.getState().harvest(t)).toBeNull();

    // Day 4: still not — daysGrown=3 after 3 advances
    farm.advanceDay('spring', 'rainy');
    expect(useFarmStore.getState().harvest(t)).toBeNull();

    // Day 5: daysGrown=4 → mature
    farm.advanceDay('spring', 'rainy');
    const yieldVal = useFarmStore.getState().harvest(t);
    expect(yieldVal).toEqual({ crop: 'wheat', quantity: 2 });

    // After harvest, tile is tilled again (ready for replanting)
    expect(useFarmStore.getState().getTile(t).kind).toBe('tilled');
  });

  it('planted tile reaches mature in daysToMature advances', () => {
    const t = { x: 3, z: 3 };
    const farm = useFarmStore.getState();
    farm.till(t);
    farm.plant(t, 'tomato', 'summer'); // 5 days
    // Use rainy weather so tiles water automatically each day
    for (let i = 0; i < 4; i++) farm.advanceDay('summer', 'rainy');
    expect(useFarmStore.getState().harvest(t)).toBeNull();
    farm.advanceDay('summer', 'rainy');
    expect(useFarmStore.getState().harvest(t)).toEqual({ crop: 'tomato', quantity: 3 });
  });

  it('out-of-season crop wilts on advanceDay (tile reverts to tilled)', () => {
    const t = { x: 7, z: 7 };
    const farm = useFarmStore.getState();
    farm.till(t);
    // Plant strawberry in spring
    farm.plant(t, 'strawberry', 'spring');
    // Grow a couple days in spring
    farm.advanceDay('spring');
    farm.advanceDay('spring');
    expect(useFarmStore.getState().getTile(t).kind).toBe('planted');
    // Summer arrives — strawberry out of season, should wilt
    farm.advanceDay('summer');
    const tile = useFarmStore.getState().getTile(t);
    expect(tile.kind).toBe('tilled');
  });

  it('rainy weather auto-waters planted tiles', () => {
    const t = { x: 2, z: 2 };
    const farm = useFarmStore.getState();
    farm.till(t);
    farm.plant(t, 'wheat', 'spring');
    // Advance with rainy weather — crop should grow even without manual watering
    farm.advanceDay('spring', 'rainy');
    const tile = useFarmStore.getState().getTile(t);
    expect(tile.kind).toBe('planted');
    if (tile.kind === 'planted') expect(tile.daysGrown).toBe(1);
  });

  it('stormy weather suppresses growth', () => {
    const t = { x: 4, z: 4 };
    const farm = useFarmStore.getState();
    farm.till(t);
    farm.water(t);
    farm.plant(t, 'wheat', 'spring');
    // Even watered, stormy suppresses growth
    farm.advanceDay('spring', 'stormy');
    const tile = useFarmStore.getState().getTile(t);
    expect(tile.kind).toBe('planted');
    if (tile.kind === 'planted') expect(tile.daysGrown).toBe(0);
  });

  it('harvestAll returns all mature crop yields and reverts tiles', () => {
    const farm = useFarmStore.getState();
    const t1 = { x: 1, z: 1 };
    const t2 = { x: 2, z: 1 };
    farm.till(t1);
    farm.till(t2);
    farm.plant(t1, 'strawberry', 'spring'); // 3 days
    farm.plant(t2, 'strawberry', 'spring');
    for (let i = 0; i < 3; i++) farm.advanceDay('spring', 'rainy');
    const results = farm.harvestAll();
    expect(results).toHaveLength(2);
    expect(results[0]?.crop).toBe('strawberry');
    expect(useFarmStore.getState().getTile(t1).kind).toBe('tilled');
    expect(useFarmStore.getState().getTile(t2).kind).toBe('tilled');
  });
});

describe('inventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.getState().reset();
  });

  it('starts with seeds', () => {
    expect(useInventoryStore.getState().count('seed_wheat')).toBeGreaterThan(0);
    expect(useInventoryStore.getState().count('seed_tomato')).toBeGreaterThan(0);
    expect(useInventoryStore.getState().count('seed_pumpkin')).toBeGreaterThan(0);
    expect(useInventoryStore.getState().count('seed_strawberry')).toBeGreaterThan(0);
    expect(useInventoryStore.getState().count('seed_carrot')).toBeGreaterThan(0);
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
