/**
 * Static prop placements (buildings, trees, decorations).
 * Each prop is a sprite billboard at a fixed world position. Phase 11 will
 * load these from per-zone JSON; for now it's hand-tuned for the demo.
 */

const BAKERY = 'sprites/cache/784993f58f8bd280.png';
const FARMHOUSE = 'sprites/cache/b0acc37f6478c4a3.png';
const STABLE = 'sprites/cache/3daaf8d50fbbd3b8.png';
const OAK = 'sprites/cache/ad260f29fcae43ef.png';
const WELL = 'sprites/cache/04ec91255688c0f2.png';

export interface PropPlacement {
  id: string;
  sprite: string;
  x: number;
  z: number;
  height: number;
  billboard?: boolean;
}

export const PROPS: PropPlacement[] = [
  // Buildings — behind their owning NPCs so the sprite stays visible
  { id: 'bakery', sprite: BAKERY, x: -8, z: -7, height: 3.6 },
  { id: 'farmhouse', sprite: FARMHOUSE, x: 5, z: 3, height: 3.6 },
  { id: 'stable', sprite: STABLE, x: 0, z: -13, height: 3.4 },

  // Trees, scattered around the farm boundary
  { id: 'tree_nw', sprite: OAK, x: -15, z: 10, height: 2.8 },
  { id: 'tree_ne', sprite: OAK, x: 15, z: 10, height: 2.8 },
  { id: 'tree_sw', sprite: OAK, x: -16, z: -16, height: 2.8 },
  { id: 'tree_se', sprite: OAK, x: 16, z: -16, height: 2.8 },
  { id: 'tree_w', sprite: OAK, x: -18, z: 0, height: 2.8 },
  { id: 'tree_e', sprite: OAK, x: 18, z: 0, height: 2.8 },

  // Well, in the village plaza near the bakery
  { id: 'well', sprite: WELL, x: -5, z: -9, height: 1.8 },
];
