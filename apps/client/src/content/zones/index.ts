/**
 * Zone catalog. Each zone is a discrete game area with its own spawn,
 * NPCs, and economic context. Phase 11 wires them up; transitions happen
 * via portal markers on the world floor.
 */

export type ZoneId = 'fazenda' | 'vilarejo' | 'floresta';

export interface ZoneSpawn {
  x: number;
  z: number;
}

export interface ZoneDef {
  id: ZoneId;
  name: string;
  description: string;
  playerSpawn: ZoneSpawn;
  /** Portals out of this zone, world-space. */
  portals: { to: ZoneId; at: ZoneSpawn; label: string }[];
  /** NPC ids that live in this zone. */
  residentNpcIds: string[];
  /** Color for the ground tint in this zone. */
  groundColor: string;
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  fazenda: {
    id: 'fazenda',
    name: 'Fazenda',
    description: 'A fazenda do jogador. Tile-grid arável, vista isométrica.',
    playerSpawn: { x: 0, z: 0 },
    portals: [{ to: 'vilarejo', at: { x: 12, z: 12 }, label: 'Vilarejo →' }],
    residentNpcIds: [],
    groundColor: '#6f9a4a',
  },
  vilarejo: {
    id: 'vilarejo',
    name: 'Vilarejo',
    description: 'Praça central com padaria, ferreiro, mercearia e poço.',
    playerSpawn: { x: 0, z: 0 },
    portals: [
      { to: 'fazenda', at: { x: -12, z: -12 }, label: '← Fazenda' },
      { to: 'floresta', at: { x: 12, z: -12 }, label: 'Floresta →' },
    ],
    residentNpcIds: ['marina', 'bento', 'lucia', 'padre-pedro', 'nina'],
    groundColor: '#7a8a64',
  },
  floresta: {
    id: 'floresta',
    name: 'Floresta',
    description: 'Madeira, ervas, frutas silvestres. Sem fazenda.',
    playerSpawn: { x: 0, z: 0 },
    portals: [{ to: 'vilarejo', at: { x: -12, z: 12 }, label: '← Vilarejo' }],
    residentNpcIds: [],
    groundColor: '#3d6a32',
  },
};
