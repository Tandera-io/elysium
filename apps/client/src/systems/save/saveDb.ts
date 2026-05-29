import Dexie, { type Table } from 'dexie';

export interface SaveRow {
  slot: number;
  name: string;
  timestamp: number;
  snapshot: GameSnapshot;
}

export interface GameSnapshot {
  version: 1;
  player: {
    position: { x: number; y: number; z: number };
  };
  farm: {
    day: number;
    tiles: Record<string, unknown>;
  };
  inventory: {
    slots: unknown[];
    gold: number;
  };
  quests: {
    active: Record<string, unknown>;
    completed: string[];
    reputation: Record<string, number>;
    cash: number;
  };
  time: {
    hour: number;
    dayInSeason: number;
    seasonIndex: number;
    year: number;
    realSecondsPerDay: number;
  };
}

class ElysiumDb extends Dexie {
  saves!: Table<SaveRow, number>;
  constructor() {
    super('elysium');
    this.version(1).stores({
      saves: 'slot, timestamp',
    });
  }
}

export const elysiumDb = new ElysiumDb();

export async function listSaves(): Promise<SaveRow[]> {
  return elysiumDb.saves.orderBy('slot').toArray();
}

export async function writeSave(row: SaveRow): Promise<void> {
  await elysiumDb.saves.put(row);
}

export async function readSave(slot: number): Promise<SaveRow | undefined> {
  return elysiumDb.saves.get(slot);
}

export async function deleteSave(slot: number): Promise<void> {
  await elysiumDb.saves.delete(slot);
}
