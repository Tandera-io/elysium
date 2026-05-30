import { useEffect, useState } from 'react';
import { useInventoryStore, type ItemId, type SlotItem } from '../systems/inventory/inventoryStore';
import { useToolStore, type ToolId } from '../store/toolStore';
import { CROPS, type CropId } from '../systems/farming/CropDefs';

const SEED_TOOL: Partial<Record<ItemId, ToolId>> = {
  seed_wheat: 'seed_wheat',
  seed_tomato: 'seed_tomato',
};

const ITEM_ICON: Record<string, string> = {
  seed_wheat: '🌾',
  seed_tomato: '🍅',
  seed_corn: '🌽',
  wheat: '🌾',
  tomato: '🍅',
  pumpkin: '🎃',
  corn: '🌽',
  strawberry: '🍓',
};

const ITEM_NAME: Record<string, string> = {
  seed_wheat: 'Sementes de trigo',
  seed_tomato: 'Sementes de tomate',
  seed_corn: 'Sementes de milho',
  wheat: 'Trigo colhido',
  tomato: 'Tomate colhido',
  pumpkin: 'Abóbora colhida',
  corn: 'Milho colhido',
  strawberry: 'Morango colhido',
};

function nameOf(id: string): string {
  return ITEM_NAME[id] ?? CROPS[id as CropId]?.name ?? id;
}

export function InventoryPanel() {
  const [open, setOpen] = useState(false);
  const slots = useInventoryStore((s) => s.slots);
  const gold = useInventoryStore((s) => s.gold);
  const remove = useInventoryStore((s) => s.remove);
  const swap = useInventoryStore((s) => s.swap);
  const setTool = useToolStore((s) => s.set);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyI') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) {
    return (
      <button
        className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700"
        onClick={() => setOpen(true)}
        title="Abrir inventário (I)"
      >
        🎒 Inventário
      </button>
    );
  }

  return (
    <aside className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-300">Inventário</h2>
        <div className="flex items-center gap-2">
          <span className="text-amber-300 font-mono">🪙 {gold}g</span>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-200"
            title="Fechar (I)"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {slots.map((slot, i) => (
          <Slot
            key={i}
            index={i}
            item={slot}
            isDraggingFrom={draggingFrom === i}
            isHoverTarget={hoverOver === i && draggingFrom !== null && draggingFrom !== i}
            onDragStart={() => setDraggingFrom(i)}
            onDragEnter={() => setHoverOver(i)}
            onDragEnd={() => {
              setDraggingFrom(null);
              setHoverOver(null);
            }}
            onDrop={() => {
              if (draggingFrom !== null && draggingFrom !== i) swap(draggingFrom, i);
              setDraggingFrom(null);
              setHoverOver(null);
            }}
            onDrop_item={slot ? () => remove(slot.id, slot.qty) : undefined}
            onUse={
              slot && SEED_TOOL[slot.id]
                ? () => {
                    setTool(SEED_TOOL[slot.id]!);
                    setOpen(false);
                  }
                : undefined
            }
          />
        ))}
      </div>
    </aside>
  );
}

interface SlotProps {
  index: number;
  item: SlotItem | null;
  isDraggingFrom: boolean;
  isHoverTarget: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  /** Drop the entire stack from inventory (discard). */
  onDrop_item?: () => void;
  /** Use item (seeds: select planting tool). */
  onUse?: () => void;
}

function Slot({
  item,
  isDraggingFrom,
  isHoverTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onDrop_item,
  onUse,
}: SlotProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className={`relative w-10 h-10 rounded-md border flex items-center justify-center text-lg select-none ${
        isHoverTarget
          ? 'border-amber-400 bg-amber-500/20'
          : isDraggingFrom
            ? 'border-slate-500 bg-slate-800/40 opacity-50'
            : item
              ? 'border-slate-700 bg-slate-800 cursor-grab'
              : 'border-slate-800 bg-slate-900/40'
      }`}
      draggable={item !== null}
      onDragStart={(e) => {
        if (!item) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(item.id));
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {item && (
        <>
          <span aria-hidden>{ITEM_ICON[item.id] ?? '?'}</span>
          {item.qty > 1 && (
            <span className="absolute bottom-0 right-1 text-[10px] font-mono text-amber-300 leading-none">
              {item.qty}
            </span>
          )}
          {showTip && (
            <div className="absolute top-full mt-1 right-0 z-10 bg-slate-950 border border-slate-700 rounded px-2 py-1 whitespace-nowrap text-xs text-slate-200 pointer-events-none">
              <div className="font-semibold">{nameOf(item.id)}</div>
              <div className="text-slate-500">qtd {item.qty}</div>
            </div>
          )}
          {onUse && (
            <button
              className="absolute -bottom-1 -left-1 w-4 h-4 bg-amber-600 hover:bg-amber-400 text-white rounded-full text-[8px] flex items-center justify-center z-20 leading-none pointer-events-auto"
              title={`Usar ${nameOf(item.id)}`}
              onClick={(e) => {
                e.stopPropagation();
                onUse();
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setShowTip(false);
              }}
            >
              ▶
            </button>
          )}
          {onDrop_item && (
            <button
              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-700 hover:bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center z-20 leading-none pointer-events-auto"
              title={`Descartar ${nameOf(item.id)}`}
              onClick={(e) => {
                e.stopPropagation();
                onDrop_item();
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setShowTip(false);
              }}
            >
              ✕
            </button>
          )}
        </>
      )}
    </div>
  );
}
