import { FarmField } from '../engine/world/FarmField';
import { FARM_LAYOUTS } from '../data/farmLayouts';

interface FarmMapProps {
  layoutId: string;
  onInteract?: (key: string) => void;
}

/**
 * Selects a named farm layout and renders it via FarmField.
 * Falls back to default grid when layoutId is unknown.
 */
export function FarmMap({ layoutId, onInteract }: FarmMapProps) {
  const layout = FARM_LAYOUTS[layoutId];
  return <FarmField grid={layout?.grid} onInteract={onInteract} />;
}
