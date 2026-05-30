import { useEffect, useState, useCallback } from 'react';
import {
  useInventoryStore,
  type SlotItem,
  type ItemId,
} from '../../systems/inventory/inventoryStore';
import { CROPS, type CropId } from '../../systems/farming/CropDefs';

const ITEM_LABEL: Record<string, string> = {
  seed_wheat: 'Semente de Trigo',
  seed_tomato: 'Semente de Tomate',
  seed_corn: 'Semente de Milho',
  seed_pumpkin: 'Semente de Abóbora',
  seed_strawberry: 'Semente de Morango',
  wheat: 'Trigo',
  tomato: 'Tomate',
  pumpkin: 'Abóbora',
  corn: 'Milho',
  strawberry: 'Morango',
};

const ITEM_EMOJI: Record<string, string> = {
  seed_wheat: '🌾',
  seed_tomato: '🍅',
  seed_corn: '🌽',
  seed_pumpkin: '🎃',
  seed_strawberry: '🍓',
  wheat: '🌾',
  tomato: '🍅',
  pumpkin: '🎃',
  corn: '🌽',
  strawberry: '🍓',
};

const SELL_PRICE: Record<string, number> = {
  wheat: 15,
  tomato: 20,
  pumpkin: 40,
  corn: 25,
  strawberry: 30,
};

function labelOf(id: string): string {
  return ITEM_LABEL[id] ?? CROPS[id as CropId]?.name ?? id;
}

function emojiOf(id: string): string {
  return ITEM_EMOJI[id] ?? '?';
}

export function Inventory() {
  const [open, setOpen] = useState(false);
  const slots = useInventoryStore((s) => s.slots);
  const gold = useInventoryStore((s) => s.gold);
  const swap = useInventoryStore((s) => s.swap);
  const remove = useInventoryStore((s) => s.remove);

  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ idx: number; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyI' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.code === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const dismiss = () => setContextMenu(null);
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, []);

  const handleDrop = useCallback(
    (to: number) => {
      if (draggingFrom !== null && draggingFrom !== to) swap(draggingFrom, to);
      setDraggingFrom(null);
      setHoverOver(null);
    },
    [draggingFrom, swap],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault();
      if (slots[idx]) setContextMenu({ idx, x: e.clientX, y: e.clientY });
    },
    [slots],
  );

  const handleDropItem = useCallback(
    (id: string, qty: number) => {
      remove(id as ItemId, qty);
      setContextMenu(null);
    },
    [remove],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-16 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors border border-slate-700"
        title="Abrir Inventário (I)"
      >
        🎒 Inventário
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-20" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-72">
        <div className="bg-slate-900/97 backdrop-blur border border-slate-700 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-100">🎒 Inventário</h2>
            <div className="flex items-center gap-3">
              <span className="text-amber-300 text-xs font-mono">🪙 {gold}g</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 text-sm leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Slots grid */}
          <div className="p-3 grid grid-cols-4 gap-1.5">
            {slots.map((slot, i) => (
              <InventorySlot
                key={i}
                item={slot}
                isDraggingFrom={draggingFrom === i}
                isHoverTarget={hoverOver === i && draggingFrom !== null && draggingFrom !== i}
                onDragStart={() => setDraggingFrom(i)}
                onDragEnter={() => setHoverOver(i)}
                onDragEnd={() => {
                  setDraggingFrom(null);
                  setHoverOver(null);
                }}
                onDrop={() => handleDrop(i)}
                onContextMenu={(e) => handleContextMenu(e, i)}
              />
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-4 pb-3 text-[10px] text-slate-600 text-center">
            Arraste para trocar · Clique dir. para largar · I para fechar
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu !== null && slots[contextMenu.idx] && (
        <SlotContextMenu
          item={slots[contextMenu.idx]!}
          x={contextMenu.x}
          y={contextMenu.y}
          onDrop={handleDropItem}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

interface SlotProps {
  item: SlotItem | null;
  isDraggingFrom: boolean;
  isHoverTarget: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function InventorySlot({
  item,
  isDraggingFrom,
  isHoverTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onContextMenu,
}: SlotProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className={`relative w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl select-none ${
        isHoverTarget
          ? 'border-amber-400 bg-amber-500/20'
          : isDraggingFrom
            ? 'border-slate-600 bg-slate-800/30 opacity-40'
            : item
              ? 'border-slate-600 bg-slate-800 cursor-grab hover:border-slate-500 hover:bg-slate-700'
              : 'border-slate-800/60 bg-slate-900/30'
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
      onContextMenu={onContextMenu}
      onMouseEnter={() => item && setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {item && (
        <>
          <span aria-hidden>{emojiOf(item.id)}</span>
          {item.qty > 1 && (
            <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-amber-300 leading-none font-bold">
              {item.qty}
            </span>
          )}
          {showTip && (
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 bg-slate-950 border border-slate-600 rounded-lg px-2.5 py-1.5 whitespace-nowrap text-xs text-slate-100 pointer-events-none shadow-xl">
              <div className="font-semibold">{labelOf(item.id)}</div>
              <div className="text-slate-400">Qtd: {item.qty}</div>
              {SELL_PRICE[item.id] !== undefined && (
                <div className="text-amber-300 text-[10px]">Venda: {SELL_PRICE[item.id]}g cada</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ContextMenuProps {
  item: SlotItem;
  x: number;
  y: number;
  onDrop: (id: string, qty: number) => void;
  onClose: () => void;
}

function SlotContextMenu({ item, x, y, onDrop, onClose }: ContextMenuProps) {
  return (
    <div
      className="fixed z-50 bg-slate-900 border border-slate-600 rounded-lg py-1 shadow-xl min-w-[150px] text-xs"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-slate-300 font-semibold border-b border-slate-700 mb-1">
        {emojiOf(item.id)} {labelOf(item.id)}
      </div>
      <button
        onClick={() => onDrop(item.id, 1)}
        className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
      >
        Largar 1
      </button>
      {item.qty > 1 && (
        <button
          onClick={() => onDrop(item.id, item.qty)}
          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
        >
          Largar todos ({item.qty})
        </button>
      )}
      <button
        onClick={onClose}
        className="w-full text-left px-3 py-1.5 text-slate-500 hover:bg-slate-800"
      >
        Cancelar
      </button>
    </div>
  );
}
