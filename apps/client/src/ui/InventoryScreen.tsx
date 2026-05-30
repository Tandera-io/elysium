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

export function InventoryScreen() {
  const isOpen = useInventoryStore((s) => s.isOpen);
  const slots = useInventoryStore((s) => s.slots);
  const gold = useInventoryStore((s) => s.gold);
  const swap = useInventoryStore((s) => s.swap);
  const closeInventory = useInventoryStore((s) => s.closeInventory);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);

  if (!isOpen) return null;

  const filledCount = slots.filter((s) => s !== null).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="inventory-screen"
      onClick={closeInventory}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">Inventário</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filledCount}/20 slots · <span className="text-amber-300 font-mono">🪙 {gold}g</span>
            </p>
          </div>
          <button
            onClick={closeInventory}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none px-1"
            aria-label="Fechar inventário"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
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
            />
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Pressione <kbd className="bg-slate-800 border border-slate-600 rounded px-1">I</kbd> ou{' '}
          <kbd className="bg-slate-800 border border-slate-600 rounded px-1">Esc</kbd> para fechar
        </p>
      </div>
    </div>
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
}

function Slot({
  item,
  isDraggingFrom,
  isHoverTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: SlotProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className={`relative w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl select-none transition-colors ${
        isHoverTarget
          ? 'border-amber-400 bg-amber-500/20'
          : isDraggingFrom
            ? 'border-slate-500 bg-slate-800/40 opacity-50'
            : item
              ? 'border-slate-600 bg-slate-800 cursor-grab hover:border-slate-400'
              : 'border-slate-700/50 bg-slate-800/30'
      }`}
      draggable={item !== null}
      onDragStart={(e) => {
        if (!item) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
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
            <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-amber-300 leading-none">
              {item.qty}
            </span>
          )}
          {showTip && (
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 bg-slate-950 border border-slate-600 rounded-md px-2.5 py-1.5 whitespace-nowrap text-xs text-slate-200 pointer-events-none shadow-lg">
              <div className="font-semibold">{nameOf(item.id)}</div>
              <div className="text-slate-400">qtd {item.qty}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
