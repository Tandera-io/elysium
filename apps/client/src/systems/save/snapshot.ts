import { useFarmStore } from '../farming/farmStore';
import { useInventoryStore } from '../inventory/inventoryStore';
import { usePlayerStore } from '../../store/playerStore';
import { useQuestStore } from '../quest/questStore';
import { useTimeStore } from '../time/timeStore';
import type { GameSnapshot } from './saveDb';

/** Read current state from every store and return a serializable snapshot. */
export function captureSnapshot(): GameSnapshot {
  const player = usePlayerStore.getState();
  const farm = useFarmStore.getState();
  const inv = useInventoryStore.getState();
  const quests = useQuestStore.getState();
  const time = useTimeStore.getState();
  return {
    version: 1,
    player: { position: { ...player.position }, energy: player.energy },
    farm: { day: farm.day, tiles: farm.tiles },
    inventory: { slots: inv.slots },
    quests: {
      active: quests.active,
      completed: quests.completed,
      reputation: quests.reputation,
      cash: quests.cash,
    },
    time: {
      hour: time.hour,
      dayInSeason: time.dayInSeason,
      seasonIndex: time.seasonIndex,
      year: time.year,
      realSecondsPerDay: time.realSecondsPerDay,
    },
  };
}

/** Write a snapshot back into every store. Versions older than current are
 *  silently coerced — callers should validate first if needed. */
export function applySnapshot(snap: GameSnapshot): void {
  usePlayerStore.setState({
    position: snap.player.position,
    path: [],
    energy: snap.player.energy ?? 100,
  });
  useFarmStore.setState({
    day: snap.farm.day,
    tiles: snap.farm.tiles as ReturnType<typeof useFarmStore.getState>['tiles'],
  });
  useInventoryStore.setState({
    slots: snap.inventory.slots as ReturnType<typeof useInventoryStore.getState>['slots'],
  });
  useQuestStore.setState({
    active: snap.quests.active as ReturnType<typeof useQuestStore.getState>['active'],
    completed: snap.quests.completed,
    reputation: snap.quests.reputation,
    cash: snap.quests.cash,
  });
  useTimeStore.setState({
    hour: snap.time.hour,
    dayInSeason: snap.time.dayInSeason,
    seasonIndex: snap.time.seasonIndex,
    year: snap.time.year,
    realSecondsPerDay: snap.time.realSecondsPerDay,
    paused: false,
  });
}
