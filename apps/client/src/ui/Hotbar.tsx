import { useEffect } from 'react';
import { useFarmStore } from '../systems/farming/farmStore';
import { useInventoryStore, type ItemId } from '../systems/inventory/inventoryStore';
import { useToolStore, type ToolId } from '../store/toolStore';
import { GameClock } from './GameClock';

interface ToolButton {
  id: ToolId;
  label: string;
  hotkey: string;
  /** Optional inventory item to track count badge. */
  countOf?: ItemId;
}

const TOOLS: readonly ToolButton[] = [
  { id: 'move', label: '🚶 mover', hotkey: '1' },
  { id: 'hoe', label: '⛏️ enxada', hotkey: '2' },
  { id: 'water', label: '💧 regar', hotkey: '3' },
  { id: 'seed_wheat', label: '🌾 trigo', hotkey: '4', countOf: 'seed_wheat' },
  { id: 'seed_tomato', label: '🍅 tomate', hotkey: '5', countOf: 'seed_tomato' },
  { id: 'harvest', label: '✂️ colher', hotkey: '6' },
];

export function Hotbar() {
  const current = useToolStore((s) => s.current);
  const setTool = useToolStore((s) => s.set);
  const slots = useInventoryStore((s) => s.slots);
  const day = useFarmStore((s) => s.day);
  const advanceDay = useFarmStore((s) => s.advanceDay);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tool = TOOLS.find((t) => t.hotkey === e.key);
      if (tool) setTool(tool.id);
      if (e.code === 'KeyT' && e.altKey) {
        // Alt+T advances one day (debug)
        advanceDay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool, advanceDay]);

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-3">
      <div className="bg-slate-900/80 backdrop-blur rounded-xl px-3 py-2 flex gap-1">
        {TOOLS.map((tool) => {
          const isActive = current === tool.id;
          const count =
            tool.countOf !== undefined
              ? slots.reduce((acc, s) => (s && s.id === tool.countOf ? acc + s.qty : acc), 0)
              : null;
          return (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id)}
              className={`relative px-3 py-2 rounded-lg text-sm font-mono transition ${
                isActive
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={`${tool.label} [${tool.hotkey}]`}
            >
              <span className="text-xs opacity-60 mr-1">{tool.hotkey}</span>
              {tool.label}
              {count !== null && (
                <span className="absolute -top-1 -right-1 bg-slate-700 text-slate-200 text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-end gap-1">
        <GameClock />
        <button
          onClick={advanceDay}
          className="text-[10px] text-slate-400 hover:text-slate-200 font-mono bg-slate-900/60 rounded px-2 py-0.5"
          title="Skip 1 farm day (Alt+T) — does not advance clock"
        >
          ⏩ skip farm-day {day}
        </button>
      </div>
    </div>
  );
}
