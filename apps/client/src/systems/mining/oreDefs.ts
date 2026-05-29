export type OreId = 'copper_ore' | 'iron_ore' | 'gold_ore';

export interface OreDef {
  id: OreId;
  name: string;
  emoji: string;
  minDepth: number;
  yieldMin: number;
  yieldMax: number;
  color: string;
}

export const ORE_DEFS: Record<OreId, OreDef> = {
  copper_ore: {
    id: 'copper_ore',
    name: 'Minério de Cobre',
    emoji: '🟤',
    minDepth: 1,
    yieldMin: 1,
    yieldMax: 2,
    color: '#b87333',
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Minério de Ferro',
    emoji: '⬛',
    minDepth: 2,
    yieldMin: 1,
    yieldMax: 2,
    color: '#8b8b8b',
  },
  gold_ore: {
    id: 'gold_ore',
    name: 'Pepita de Ouro',
    emoji: '🟡',
    minDepth: 3,
    yieldMin: 1,
    yieldMax: 1,
    color: '#ffd700',
  },
};

export interface VeinDef {
  id: string;
  oreId: OreId;
  row: number;
  col: number;
}

function makeVeins(depth: number): VeinDef[] {
  const ores: OreId[] =
    depth >= 3
      ? ['copper_ore', 'copper_ore', 'iron_ore', 'iron_ore', 'gold_ore', 'gold_ore']
      : depth >= 2
        ? ['copper_ore', 'copper_ore', 'copper_ore', 'iron_ore', 'iron_ore']
        : ['copper_ore', 'copper_ore', 'copper_ore'];

  return ores.map((oreId, i) => ({
    id: `vein_d${depth}_${i}`,
    oreId,
    row: Math.floor(i / 3),
    col: i % 3,
  }));
}

export const VEINS_BY_DEPTH: Record<number, VeinDef[]> = {
  1: makeVeins(1),
  2: makeVeins(2),
  3: makeVeins(3),
};
