import { useEffect } from 'react';
import { useFarmStore } from '../systems/farming/farmStore';
import { FARM_LAYOUTS } from '../data/farmLayouts';

export interface FarmMapProps {
  /** Key in FARM_LAYOUTS to seed. Defaults to 'marisa'. */
  layoutId?: string;
}

/**
 * Seeds a named farm layout into useFarmStore on mount so the pre-tilled
 * tiles appear in the 3D world via the existing FarmField in Scene.
 */
export function FarmMap({ layoutId = 'marisa' }: FarmMapProps) {
  const till = useFarmStore((s) => s.till);

  useEffect(() => {
    const layout = FARM_LAYOUTS[layoutId];
    if (!layout) return;

    for (let dz = 0; dz < layout.height; dz++) {
      for (let dx = 0; dx < layout.width; dx++) {
        till({ x: layout.origin.x + dx, z: layout.origin.z + dz });
      }
    }
  }, [layoutId, till]);

  return null;
}
