import { useState } from 'react';
import { useInventoryStore, type SlotItem } from '../systems/inventory/inventoryStore';
import { CROPS, type CropId } from '../systems/farming/CropDefs';

const ITEM_ICON: Record<string, string> = {
  seed_wheat: '🌾',
  seed_tomato: '🍅',
  seed_corn: '🌽',
  wheat: '🌾',
  tomato: '🍅',
  corn: '🌽',
  pumpkin: '🎃',
  strawberry: '🍓',
};

const ITEM_NAME: Record<string, string> = {
  seed_wheat: 'Sementes de trigo',
  seed_tomato: 'Sementes de tomate',
  seed_corn: 'Sementes de milho',
  wheat: 'Trigo colhido',
  tomato: 'Tomate colhido',
  corn: 'Milho colhido',
  pumpkin: 'Abóbora colhida',
  strawberry: 'Morango colhido',
};

function nameOf(id: string): string {
  return ITEM_NAME[id] ?? CROPS[id as CropId]?.name ?? id;
}

export interface InventoryPanelProps {
  open: boolean;
}

export function InventoryPanel({ open }: InventoryPanelProps) {
  const slots = useInventoryStore((s) => s.slots);
  const gold = useInventoryStore((s) => s.gold);
  const swap = useInventoryStore((s) => s.swap);
  const useSlot = useInventoryStore((s) => s.useSlot);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);

  if (!open) return null;

  return (
    <aside className="absolute top-20 right-4 bg-slate-900/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[200px] z-10">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-300">Inventário</h2>
        <span className="text-amber-300 font-mono text-xs">🪙 {gold}g</span>
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
            onUse={() => useSlot(i)}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-500 text-center">
        Arraste para reorganizar · clique direito para usar
      </p>
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
  onUse: () => void;
}

function Slot({
  item,
  isDraggingFrom,
  isHoverTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
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
      onContextMenu={(e) => {
        if (!item) return;
        e.preventDefault();
        onUse();
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
              <div className="text-slate-600 text-[10px]">clique direito para usar</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
