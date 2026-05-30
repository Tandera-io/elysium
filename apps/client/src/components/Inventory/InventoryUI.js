/* global window */
import { useState, useEffect, useCallback } from 'react';
import { useInventoryStore } from '../../systems/inventory/inventoryStore';
import { usePlayerStore } from '../../store/playerStore';

const ITEM_ICON = {
  seed_wheat: '🌾',
  seed_tomato: '🍅',
  seed_corn: '🌽',
  wheat: '🌾',
  tomato: '🍅',
  corn: '🌽',
  pumpkin: '🎃',
  strawberry: '🍓',
};

const ITEM_NAME = {
  seed_wheat: 'Semente de trigo',
  seed_tomato: 'Semente de tomate',
  seed_corn: 'Semente de milho',
  wheat: 'Trigo',
  tomato: 'Tomate',
  corn: 'Milho',
  pumpkin: 'Abóbora',
  strawberry: 'Morango',
};

function nameOf(id) {
  return ITEM_NAME[id] ?? id;
}

function SlotCell({
  item,
  isDraggingFrom,
  isHoverTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}) {
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
        </>
      )}
    </div>
  );
}

export function InventoryUI() {
  const slots = useInventoryStore((s) => s.slots);
  const gold = useInventoryStore((s) => s.gold);
  const swap = useInventoryStore((s) => s.swap);
  const sort = useInventoryStore((s) => s.sort);
  const inventoryOpen = usePlayerStore((s) => s.inventoryOpen);
  const toggleInventory = usePlayerStore((s) => s.toggleInventory);
  const setInventoryOpen = usePlayerStore((s) => s.setInventoryOpen);

  const [draggingFrom, setDraggingFrom] = useState(null);
  const [hoverOver, setHoverOver] = useState(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        toggleInventory();
      }
    },
    [toggleInventory],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!inventoryOpen) {
    return (
      <button
        onClick={() => setInventoryOpen(true)}
        className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/90 transition-colors"
        title="Abrir inventário [I]"
      >
        🎒 Inventário [I]
      </button>
    );
  }

  return (
    <aside className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-300">Inventário</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => sort('name')}
            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] transition-colors"
            title="Ordenar por nome"
          >
            Nome
          </button>
          <button
            onClick={() => sort('qty')}
            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] transition-colors"
            title="Ordenar por quantidade"
          >
            Qtd
          </button>
          <button
            onClick={() => setInventoryOpen(false)}
            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-rose-700 text-slate-300 text-[10px] transition-colors ml-1"
            title="Fechar [I]"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="text-amber-300 font-mono mb-2 text-[11px]">🪙 {gold}g</div>
      <div className="grid grid-cols-4 gap-1">
        {slots.map((slot, i) => (
          <SlotCell
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
    </aside>
  );
}
