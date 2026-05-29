/**
 * Farm zone content — mineable rock and tree tile definitions.
 * Rock positions are expressed in tile coordinates (x, z) matching
 * the DEFAULT_GRID (50x50, tileSize=1, origin at world centre).
 *
 * These positions are consumed by miningStore as its DEFAULT_ROCKS and
 * can be rendered as prop billboards via props.ts world-space coords.
 *
 * Tile → world conversion: world = tile - (gridSize/2) + 0.5
 *   e.g. tile x=28 → world x = 28 - 25 + 0.5 = 3.5 ≈ x:3
 */

import type { OreType } from '../../systems/mining/miningStore';

export interface RockTileDef {
  id: string;
  /** Tile x coordinate (integer, 0-based within DEFAULT_GRID 50x50). */
  x: number;
  /** Tile z coordinate (integer, 0-based within DEFAULT_GRID 50x50). */
  z: number;
  oreType: OreType;
}

export interface TreeTileDef {
  id: string;
  x: number;
  z: number;
}

/**
 * Mineable rocks on the farm. Matches miningStore DEFAULT_ROCKS.
 * Tile coords derived from props.ts world positions (grid 50x50, tileSize 1):
 *   world(-12, 5) → tile(13, 30)  rock_1 copper
 *   world(11, -3) → tile(36, 22)  rock_2 iron
 *   world(-10,-2) → tile(15, 23)  rock_3 gold
 */
export const FARM_ROCKS: RockTileDef[] = [
  { id: 'rock_1', x: 13, z: 30, oreType: 'copper' },
  { id: 'rock_2', x: 36, z: 22, oreType: 'iron' },
  { id: 'rock_3', x: 15, z: 23, oreType: 'gold' },
];

/**
 * Choppable log tile on the farm (axe tool).
 * Derived from props.ts log_1 world(8, 7) → tile(33, 32).
 */
export const FARM_TREES: TreeTileDef[] = [{ id: 'log_1', x: 33, z: 32 }];
