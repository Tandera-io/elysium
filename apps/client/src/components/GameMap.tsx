import { useEffect } from 'react';
import { useNpcStore } from '../systems/npc/npcStore';
import { NPC_LOCATIONS } from '../data/locations';

/**
 * GameMap — mounts NPC placements declared in data/locations.ts into the live
 * npcStore. Renders nothing itself; it is a side-effect-only component that
 * must be included in the scene tree once.
 *
 * To move an NPC's spawn point, edit their entry in data/locations.ts.
 */
export function GameMap() {
  useEffect(() => {
    const { setPosition } = useNpcStore.getState();
    for (const loc of NPC_LOCATIONS) {
      setPosition(loc.id, { x: loc.x, z: loc.z });
    }
  }, []);

  return null;
}
