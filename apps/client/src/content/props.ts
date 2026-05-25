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
const FENCE = 'sprites/cache/28f2a66edb53c206.png';
const ROCK = 'sprites/cache/e2d147293d41cc07.png';
const LOG = 'sprites/cache/dc496ea755c8d01b.png';
const BUSH = 'sprites/cache/673172beed975156.png';

export interface PropPlacement {
  id: string;
  sprite: string;
  x: number;
  z: number;
  height: number;
  billboard?: boolean;
}

export const PROPS: PropPlacement[] = [
  // === Buildings ===
  { id: 'bakery', sprite: BAKERY, x: -8, z: -7, height: 3.6 },
  { id: 'farmhouse', sprite: FARMHOUSE, x: 5, z: 3, height: 3.6 },
  { id: 'stable', sprite: STABLE, x: 0, z: -13, height: 3.4 },

  // === Trees, around the map borders ===
  { id: 'tree_nw', sprite: OAK, x: -15, z: 10, height: 2.8 },
  { id: 'tree_ne', sprite: OAK, x: 15, z: 10, height: 2.8 },
  { id: 'tree_sw', sprite: OAK, x: -16, z: -16, height: 2.8 },
  { id: 'tree_se', sprite: OAK, x: 16, z: -16, height: 2.8 },
  { id: 'tree_w', sprite: OAK, x: -18, z: 0, height: 2.8 },
  { id: 'tree_e', sprite: OAK, x: 18, z: 0, height: 2.8 },

  // === Well in the village plaza ===
  { id: 'well', sprite: WELL, x: -5, z: -9, height: 1.8 },

  // === Wooden fence segments — south border of the farm ===
  { id: 'fence_1', sprite: FENCE, x: -6, z: 14, height: 0.9 },
  { id: 'fence_2', sprite: FENCE, x: -4, z: 14, height: 0.9 },
  { id: 'fence_3', sprite: FENCE, x: -2, z: 14, height: 0.9 },
  { id: 'fence_4', sprite: FENCE, x: 0, z: 14, height: 0.9 },
  { id: 'fence_5', sprite: FENCE, x: 2, z: 14, height: 0.9 },
  { id: 'fence_6', sprite: FENCE, x: 4, z: 14, height: 0.9 },
  { id: 'fence_7', sprite: FENCE, x: 6, z: 14, height: 0.9 },

  // === Rocks & log — scattered terrain ===
  { id: 'rock_1', sprite: ROCK, x: -12, z: 5, height: 1.0 },
  { id: 'rock_2', sprite: ROCK, x: 11, z: -3, height: 1.0 },
  { id: 'rock_3', sprite: ROCK, x: -10, z: -2, height: 1.0 },
  { id: 'log_1', sprite: LOG, x: 8, z: 7, height: 0.8 },

  // === Flower bushes ===
  { id: 'bush_1', sprite: BUSH, x: -3, z: 4, height: 1.0 },
  { id: 'bush_2', sprite: BUSH, x: 9, z: -8, height: 1.0 },
  { id: 'bush_3', sprite: BUSH, x: -7, z: 7, height: 1.0 },
  { id: 'bush_4', sprite: BUSH, x: 3, z: 9, height: 1.0 },
];
