import { create } from 'zustand';
import type { ItemId } from '../inventory/inventoryStore';

export type OreType = 'copper' | 'iron' | 'gold';

/** Maps ore type to the inventory ItemId dropped on mine. */
export const ORE_DROP: Record<OreType, ItemId> = {
  copper: 'copper_ore',
  iron: 'iron_ore',
  gold: 'gold_ore',
};

/** Respawn delay in milliseconds — one game day equivalent. */
export const ROCK_RESPAWN_MS = 24_000;

export interface Rock {
  id: string;
  /** Tile x coordinate. */
  x: number;
  /** Tile z coordinate. */
  z: number;
  oreType: OreType;
  /** True when the rock is intact and can be mined. */
  alive: boolean;
}

export interface MiningState {
  rocks: Rock[];
  logAlive: boolean;
}

export interface MiningActions {
  /** Mine the rock at the given tile. Returns the ItemId dropped, or null if no rock present. */
  mineRock: (x: number, z: number) => ItemId | null;
  /** Restore the rock with the given id (called after respawn timer). */
  respawnRock: (id: string) => void;
  /** Chop the log at the given tile. Returns 'log' ItemId, or null if not present/alive. */
  chopLog: (x: number, z: number) => ItemId | null;
}

// Tile coords derived from props.ts world positions via worldToTile (grid 50x50, tileSize 1):
// world(-12,5) → tile(13,30), world(11,-3) → tile(36,22), world(-10,-2) → tile(15,23)
const DEFAULT_ROCKS: Rock[] = [
  { id: 'rock_1', x: 13, z: 30, oreType: 'copper', alive: true },
  { id: 'rock_2', x: 36, z: 22, oreType: 'iron', alive: true },
  { id: 'rock_3', x: 15, z: 23, oreType: 'gold', alive: true },
];

// Log tile coords: world(8,7) → tile(33,32)
export const LOG_TILE = { x: 33, z: 32 };

export const useMiningStore = create<MiningState & MiningActions>((set, get) => ({
  rocks: DEFAULT_ROCKS,
  logAlive: true,

  mineRock: (x, z) => {
    const rock = get().rocks.find((r) => r.alive && r.x === x && r.z === z);
    if (!rock) return null;

    set((s) => ({
      rocks: s.rocks.map((r) => (r.id === rock.id ? { ...r, alive: false } : r)),
    }));

    setTimeout(() => {
      get().respawnRock(rock.id);
    }, ROCK_RESPAWN_MS);

    return ORE_DROP[rock.oreType];
  },

  respawnRock: (id) => {
    set((s) => ({
      rocks: s.rocks.map((r) => (r.id === id ? { ...r, alive: true } : r)),
    }));
  },

  chopLog: (x, z) => {
    if (!get().logAlive) return null;
    if (x !== LOG_TILE.x || z !== LOG_TILE.z) return null;
    set({ logAlive: false });
    setTimeout(() => set({ logAlive: true }), ROCK_RESPAWN_MS);
    return 'log';
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __mining: typeof useMiningStore }).__mining = useMiningStore;
}
