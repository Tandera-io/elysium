import { useEffect, useState } from 'react';
import { useInventoryStore, type SlotItem } from '../systems/inventory/inventoryStore';
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
  const dropSlot = useInventoryStore((s) => s.dropSlot);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyI' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) {
    return (
      <button
        className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
        onClick={() => setVisible(true)}
        title="Abrir inventário [I]"
      >
        🎒 [I]
      </button>
    );
  }

  return (
    <aside className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-300">Inventário</h2>
        <button
          className="text-slate-500 hover:text-slate-300 text-xs"
          onClick={() => setVisible(false)}
          title="Fechar [I]"
        >
          [I] ×
        </button>
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
            onDropAll={() => dropSlot(i)}
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
  onDropAll: () => void;
}

function Slot({
  item,
  isDraggingFrom,
  isHoverTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onDropAll,
}: SlotProps) {
  const [showTip, setShowTip] = useState(false);
  const [showCtx, setShowCtx] = useState(false);
  const removeOne = useInventoryStore((s) => s.useItem);

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
        setShowCtx(true);
        setShowTip(false);
      }}
      onMouseEnter={() => {
        if (!showCtx) setShowTip(true);
      }}
      onMouseLeave={() => {
        setShowTip(false);
      }}
    >
      {item && (
        <>
          <span aria-hidden>{ITEM_ICON[item.id] ?? '?'}</span>
          {item.qty > 1 && (
            <span className="absolute bottom-0 right-1 text-[10px] font-mono text-amber-300 leading-none">
              {item.qty}
            </span>
          )}
          {showTip && !showCtx && (
            <>
              <button
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-700 hover:bg-rose-500 text-white text-[10px] leading-none flex items-center justify-center z-20"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onDropAll();
                }}
              >
                ×
              </button>
              <div className="absolute top-full mt-1 right-0 z-10 bg-slate-950 border border-slate-700 rounded px-2 py-1 whitespace-nowrap text-xs text-slate-200 pointer-events-none">
                <div className="font-semibold">{nameOf(item.id)}</div>
                <div className="text-slate-500">qtd {item.qty}</div>
                <div className="text-slate-600 mt-0.5">clique-direito para descartar</div>
              </div>
            </>
          )}
          {showCtx && (
            <div
              className="absolute top-full mt-1 right-0 z-20 bg-slate-950 border border-slate-600 rounded shadow-lg text-xs text-slate-200 overflow-hidden"
              onMouseLeave={() => setShowCtx(false)}
            >
              <div className="px-2 py-1 font-semibold text-slate-400 border-b border-slate-700 whitespace-nowrap">
                {nameOf(item.id)}
              </div>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 whitespace-nowrap"
                onClick={() => {
                  removeOne(item.id, 1);
                  setShowCtx(false);
                }}
              >
                Descartar 1
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-rose-400 whitespace-nowrap"
                onClick={() => {
                  onDropAll();
                  setShowCtx(false);
                }}
              >
                Descartar tudo ({item.qty})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
