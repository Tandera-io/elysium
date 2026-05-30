import { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useFarmStore } from '../systems/farming/farmStore';
import {
  useInventoryStore,
  type InventoryActions,
  type InventoryState,
} from '../systems/inventory/inventoryStore';
import { useToolStore, type ToolId } from '../store/toolStore';
import { worldToTile } from '../engine/world/WorldGrid';
import { CROPS } from '../systems/farming/CropDefs';
import type { TileState } from '../systems/farming/farmStore';
import type { CropId } from '../systems/farming/CropDefs';

type Inv = InventoryState & InventoryActions;

const SEED_TO_CROP: Partial<Record<ToolId, CropId>> = {
  seed_wheat: 'wheat',
  seed_tomato: 'tomato',
};

interface ResolvedAction {
  label: string;
  action: 'till' | 'water' | 'plant' | 'harvest';
  cropId?: CropId;
}

/** Returns what pressing E will do given the tool and current tile state, or null if nothing. */
function resolveAction(tool: ToolId, tileState: TileState, inv: Inv): ResolvedAction | null {
  switch (tool) {
    case 'hoe':
      if (tileState.kind === 'empty') return { label: 'Enxadar', action: 'till' };
      break;
    case 'water':
      if (tileState.kind === 'tilled' || tileState.kind === 'planted')
        return { label: 'Regar', action: 'water' };
      break;
    case 'seed_wheat':
    case 'seed_tomato': {
      if (tileState.kind !== 'tilled') break;
      if (inv.count(tool) < 1) return null;
      const cropId = SEED_TO_CROP[tool];
      if (!cropId) break;
      return { label: `Plantar ${CROPS[cropId].name}`, action: 'plant', cropId };
    }
    case 'harvest': {
      if (tileState.kind !== 'planted') break;
      const def = CROPS[tileState.crop];
      if (tileState.daysGrown >= def.daysToMature)
        return { label: `Colher ${def.name}`, action: 'harvest' };
      break;
    }
    default:
      break;
  }
  return null;
}

/**
 * Overlay component that connects the active tool to the farm tile under the
 * player. Shows a context-sensitive action prompt and executes on E-key press.
 * Mount once inside App alongside Scene.
 */
export function CropField() {
  const [prompt, setPrompt] = useState<ResolvedAction | null>(null);

  useEffect(() => {
    let raf = 0;
    let lastLabel = '';

    const loop = () => {
      const pos = usePlayerStore.getState().position;
      const tile = worldToTile({ x: pos.x, z: pos.z });
      const tileState = useFarmStore.getState().getTile(tile);
      const tool = useToolStore.getState().current;
      const inv = useInventoryStore.getState();
      const action = resolveAction(tool, tileState, inv);
      const label = action?.label ?? '';
      if (label !== lastLabel) {
        lastLabel = label;
        setPrompt(action);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE') return;
      const pos = usePlayerStore.getState().position;
      const tile = worldToTile({ x: pos.x, z: pos.z });
      const tileState = useFarmStore.getState().getTile(tile);
      const tool = useToolStore.getState().current;
      const inv = useInventoryStore.getState();
      const action = resolveAction(tool, tileState, inv);
      if (!action) return;

      const farm = useFarmStore.getState();
      switch (action.action) {
        case 'till':
          farm.till(tile);
          break;
        case 'water':
          farm.water(tile);
          break;
        case 'plant': {
          const seedId = tool as import('../systems/inventory/inventoryStore').ItemId;
          if (action.cropId && inv.remove(seedId, 1)) farm.plant(tile, action.cropId);
          break;
        }
        case 'harvest': {
          const result = farm.harvest(tile);
          if (result) inv.add(result.crop, result.quantity);
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!prompt) return null;

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100">
      <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs mr-1">E</kbd>
      {prompt.label}
    </div>
  );
}
