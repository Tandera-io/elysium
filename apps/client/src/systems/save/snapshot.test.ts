import { beforeEach, describe, expect, it } from 'vitest';
import { applySnapshot, captureSnapshot } from './snapshot';
import { useFarmStore } from '../farming/farmStore';
import { useInventoryStore } from '../inventory/inventoryStore';
import { usePlayerStore } from '../../store/playerStore';
import { useQuestStore } from '../quest/questStore';
import { useTimeStore } from '../time/timeStore';

describe('snapshot round-trip', () => {
  beforeEach(() => {
    useFarmStore.getState().reset();
    useInventoryStore.getState().reset();
    useQuestStore.getState().reset();
    useTimeStore.getState().reset();
    usePlayerStore.setState({ position: { x: 0, y: 0, z: 0 }, path: [] });
  });

  it('round-trips a configured game state', () => {
    // Set up non-default state
    usePlayerStore.setState({ position: { x: 12, y: 0, z: -3.5 }, path: [] });
    useFarmStore.getState().till({ x: 1, z: 1 });
    useFarmStore.getState().plant({ x: 1, z: 1 }, 'wheat', 'spring');
    useInventoryStore.getState().add('wheat', 17);
    useQuestStore.setState({ cash: 999 });
    useTimeStore.setState({ hour: 14.5, dayInSeason: 4, seasonIndex: 2 });

    const snap = captureSnapshot();

    // Reset all stores to defaults
    useFarmStore.getState().reset();
    useInventoryStore.getState().reset();
    useQuestStore.getState().reset();
    useTimeStore.getState().reset();
    usePlayerStore.setState({ position: { x: 0, y: 0, z: 0 }, path: [] });

    expect(usePlayerStore.getState().position.x).toBe(0);
    expect(useQuestStore.getState().cash).toBe(50);
    expect(useTimeStore.getState().hour).toBe(6);

    // Re-apply snapshot
    applySnapshot(snap);

    expect(usePlayerStore.getState().position.x).toBe(12);
    expect(usePlayerStore.getState().position.z).toBe(-3.5);
    expect(useFarmStore.getState().getTile({ x: 1, z: 1 }).kind).toBe('planted');
    expect(useInventoryStore.getState().count('wheat')).toBe(17);
    expect(useQuestStore.getState().cash).toBe(999);
    expect(useTimeStore.getState().hour).toBe(14.5);
    expect(useTimeStore.getState().seasonIndex).toBe(2);
  });

  it('captureSnapshot has version 1', () => {
    expect(captureSnapshot().version).toBe(1);
  });
});
