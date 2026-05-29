export type ForageId = 'stick' | 'stone' | 'herb' | 'berry';

export interface ForageDef {
  readonly id: ForageId;
  readonly label: string;
  readonly sprite: string;
  readonly height: number;
}

// Reuse existing prop sprites — no new generation needed
const LOG = 'sprites/cache/dc496ea755c8d01b.png';
const ROCK = 'sprites/cache/e2d147293d41cc07.png';
const BUSH = 'sprites/cache/673172beed975156.png';

export const FORAGE_DEFS: Record<ForageId, ForageDef> = {
  stick: { id: 'stick', label: 'Galho', sprite: LOG, height: 0.55 },
  stone: { id: 'stone', label: 'Pedra', sprite: ROCK, height: 0.65 },
  herb: { id: 'herb', label: 'Erva', sprite: BUSH, height: 0.75 },
  berry: { id: 'berry', label: 'Fruta Silvestre', sprite: BUSH, height: 0.75 },
};
