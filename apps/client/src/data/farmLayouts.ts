/**
 * Farm layout definitions. Each entry describes a named character's starting
 * farm plot: the top-left tile origin and the width × height of the plot in
 * tiles. FarmMap.tsx uses these to pre-populate tilled tiles for characters
 * that begin the game with a prepared field.
 */

export interface FarmLayout {
  /** Identifier matching the character / save-slot name. */
  id: string;
  /** Display name for UI purposes. */
  name: string;
  /** Top-left tile coordinate (x axis = east, z axis = south). */
  origin: { x: number; z: number };
  /** Width of the plot in tiles (east direction). */
  width: number;
  /** Height of the plot in tiles (south direction). */
  height: number;
  /** Optional path to a preview image, relative to the public root. */
  previewImage?: string;
}

export const FARM_LAYOUTS: Record<string, FarmLayout> = {
  marisa: {
    id: 'marisa',
    name: 'Marisa',
    origin: { x: 23, z: 23 },
    width: 3,
    height: 3,
    previewImage: 'assets/images/farms/marisa.png',
  },
};
