import { useState } from 'react';
import {
  useInventoryStore,
  type SlotItem,
  TOOL_ITEM_IDS,
} from '../systems/inventory/inventoryStore';
import { CROPS, type CropId } from '../systems/farming/CropDefs';

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
  const slots = useInventoryStore((s) => s.slots);
  const swap = useInventoryStore((s) => s.swap);
  const equipTool = useInventoryStore((s) => s.equipTool);
  const equippedSlotIndex = useInventoryStore((s) => s.equippedSlotIndex);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);

  function handleSlotClick(index: number) {
    // Clicking while dragging is handled by onDrop; skip.
    if (draggingFrom !== null) return;
    const slot = slots[index];
    if (slot && TOOL_ITEM_IDS.has(slot.id)) {
      equipTool(index);
    }
  }

  return (
    <aside className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[200px]">
      <h2 className="text-sm font-semibold text-slate-300 mb-2">Inventário</h2>
      <div className="grid grid-cols-4 gap-1">
        {slots.map((slot, i) => (
          <Slot
            key={i}
            index={i}
            item={slot}
            isEquipped={equippedSlotIndex === i}
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
            onClick={() => handleSlotClick(i)}
          />
        ))}
      </div>
      {equippedSlotIndex !== null && slots[equippedSlotIndex] && (
        <p className="mt-2 text-[10px] text-amber-300 text-center">
          Equipado: {nameOf(slots[equippedSlotIndex]!.id)}
        </p>
      )}
    </aside>
  );
}

interface SlotProps {
  index: number;
  item: SlotItem | null;
  isEquipped: boolean;
  isDraggingFrom: boolean;
  isHoverTarget: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onClick: () => void;
}

function Slot({
  item,
  isEquipped,
  isDraggingFrom,
  isHoverTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onClick,
}: SlotProps) {
  const [showTip, setShowTip] = useState(false);
  const isEquippable = item ? TOOL_ITEM_IDS.has(item.id) : false;

  let borderClass: string;
  if (isEquipped) {
    borderClass = 'border-amber-400 bg-amber-500/30 ring-1 ring-amber-400';
  } else if (isHoverTarget) {
    borderClass = 'border-amber-400 bg-amber-500/20';
  } else if (isDraggingFrom) {
    borderClass = 'border-slate-500 bg-slate-800/40 opacity-50';
  } else if (item) {
    borderClass = `border-slate-700 bg-slate-800 ${isEquippable ? 'cursor-pointer hover:border-amber-500/60' : 'cursor-grab'}`;
  } else {
    borderClass = 'border-slate-800 bg-slate-900/40';
  }

  return (
    <div
      className={`relative w-10 h-10 rounded-md border flex items-center justify-center text-lg select-none ${borderClass}`}
      draggable={item !== null}
      onClick={onClick}
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
      {isEquipped && (
        <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900" />
      )}
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
              {isEquippable && (
                <div className="text-amber-400 mt-0.5">
                  {isEquipped ? 'Clique para desequipar' : 'Clique para equipar'}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
