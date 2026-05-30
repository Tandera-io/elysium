/**
 * FarmMap — wires up a named farm layout (from farmLayouts.ts) so its
 * pre-defined plot of tiles appears tilled in the world. The component
 * initialises the tiles in useFarmStore once on mount, then delegates
 * rendering to FarmField.
 *
 * Usage (inside a <Canvas>):
 *   <FarmMap layoutId="marisa" />
 */

import { useEffect } from 'react';
import { FarmField } from '../engine/world/FarmField';
import { useFarmStore } from '../systems/farming/farmStore';
import { FARM_LAYOUTS } from '../data/farmLayouts';

export interface FarmMapProps {
  /** Key in FARM_LAYOUTS to render. Defaults to 'marisa'. */
  layoutId?: string;
}

/**
 * Pre-tills every tile in the named layout on the first render, then
 * delegates tile visualisation to FarmField.
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
    // Intentionally runs once per layoutId — re-tilling on every render would
    // clobber player-made changes to the plot.
  }, [layoutId, till]);

  return <FarmField />;
}
