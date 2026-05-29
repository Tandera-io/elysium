/**
 * NPC map placements — world-space spawn positions for each NPC.
 * These are the canonical "home" coordinates used to seed the npcStore and
 * drive NpcMover wander bases. Add an entry here to place a new NPC on the map.
 */

export interface NpcLocation {
  id: string;
  x: number;
  z: number;
  wander: { rx: number; rz: number; fx: number; fz: number };
}

export const NPC_LOCATIONS: NpcLocation[] = [
  {
    id: 'dorinha',
    x: 6,
    z: 4,
    wander: { rx: 1.5, rz: 1.2, fx: 0.4, fz: 0.3 },
  },
];
