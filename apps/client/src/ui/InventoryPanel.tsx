import { useState } from 'react';
import {
  useInventoryStore,
  type SlotItem,
  type ItemId,
  ITEM_DEFS,
  HOME_CHEST_ID,
} from '../systems/inventory/inventoryStore';

function iconOf(id: ItemId): string {
  return ITEM_DEFS[id]?.icon ?? '?';
}

function nameOf(id: ItemId): string {
  return ITEM_DEFS[id]?.name ?? id;
}

interface ContextMenu {
  slotIndex: number;
  x: number;
  y: number;
  inContainer: boolean;
}

export function InventoryPanel() {
  const slots = useInventoryStore((s) => s.slots);
  const gold = useInventoryStore((s) => s.gold);
  const swap = useInventoryStore((s) => s.swap);
  const useItem = useInventoryStore((s) => s.useItem);
  const activeContainerId = useInventoryStore((s) => s.activeContainerId);
  const containers = useInventoryStore((s) => s.containers);
  const closeContainer = useInventoryStore((s) => s.closeContainer);
  const openContainer = useInventoryStore((s) => s.openContainer);
  const transferToContainer = useInventoryStore((s) => s.transferToContainer);
  const retrieveFromContainer = useInventoryStore((s) => s.retrieveFromContainer);

  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  const activeContainer = activeContainerId ? containers[activeContainerId] : null;

  function handleSlotContextMenu(e: React.MouseEvent, slotIndex: number, inContainer: boolean) {
    e.preventDefault();
    const slot = inContainer ? activeContainer?.slots[slotIndex] : slots[slotIndex];
    if (!slot) return;
    setContextMenu({ slotIndex, x: e.clientX, y: e.clientY, inContainer });
  }

  return (
    <>
      {contextMenu && <div className="fixed inset-0 z-20" onClick={() => setContextMenu(null)} />}

      <div className="flex gap-2 absolute top-20 right-4">
        {activeContainer && (
          <aside className="bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-300">{activeContainer.name}</h2>
              <button
                className="text-slate-500 hover:text-slate-200 leading-none"
                onClick={closeContainer}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {activeContainer.slots.map((slot, i) => (
                <Slot
                  key={i}
                  item={slot}
                  isDraggingFrom={false}
                  isHoverTarget={false}
                  onDragStart={() => {}}
                  onDragEnter={() => {}}
                  onDragEnd={() => {}}
                  onDrop={() => {
                    if (draggingFrom !== null && activeContainerId) {
                      transferToContainer(
                        activeContainerId,
                        draggingFrom,
                        slots[draggingFrom]?.qty ?? 1,
                      );
                      setDraggingFrom(null);
                    }
                  }}
                  onContextMenu={(e) => handleSlotContextMenu(e, i, true)}
                />
              ))}
            </div>
          </aside>
        )}

        <aside className="bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-300">Inventário</h2>
            <span className="text-amber-400 font-mono">🪙 {gold}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {slots.map((slot, i) => (
              <Slot
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
                onDrop={() => {
                  if (draggingFrom !== null && draggingFrom !== i) swap(draggingFrom, i);
                  setDraggingFrom(null);
                  setHoverOver(null);
                }}
                onContextMenu={(e) => handleSlotContextMenu(e, i, false)}
              />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700">
            <button
              className="text-xs text-slate-400 hover:text-slate-200 w-full text-left"
              onClick={() => openContainer(HOME_CHEST_ID)}
            >
              🗃️ Baú da casa
            </button>
          </div>
        </aside>
      </div>

      {contextMenu &&
        (() => {
          if (contextMenu.inContainer) {
            const slot = activeContainer?.slots[contextMenu.slotIndex];
            if (!slot || !activeContainerId) return null;
            return (
              <ContextMenuPanel x={contextMenu.x} y={contextMenu.y}>
                <ContextMenuHeader label={nameOf(slot.id)} />
                <ContextMenuButton
                  onClick={() => {
                    retrieveFromContainer(activeContainerId, contextMenu.slotIndex, slot.qty);
                    setContextMenu(null);
                  }}
                >
                  📥 Pegar ({slot.qty})
                </ContextMenuButton>
                <ContextMenuButton onClick={() => setContextMenu(null)} muted>
                  Cancelar
                </ContextMenuButton>
              </ContextMenuPanel>
            );
          }

          const slot = slots[contextMenu.slotIndex];
          if (!slot) return null;
          const def = ITEM_DEFS[slot.id];
          return (
            <ContextMenuPanel x={contextMenu.x} y={contextMenu.y}>
              <ContextMenuHeader label={nameOf(slot.id)} />
              {def?.usable && (
                <ContextMenuButton
                  onClick={() => {
                    useItem(contextMenu.slotIndex);
                    setContextMenu(null);
                  }}
                >
                  {def.isContainer ? '📂 Abrir' : '✨ Usar'}
                </ContextMenuButton>
              )}
              {activeContainerId && (
                <ContextMenuButton
                  onClick={() => {
                    transferToContainer(activeContainerId, contextMenu.slotIndex, slot.qty);
                    setContextMenu(null);
                  }}
                >
                  📦 Guardar ({slot.qty})
                </ContextMenuButton>
              )}
              <ContextMenuButton onClick={() => setContextMenu(null)} muted>
                Cancelar
              </ContextMenuButton>
            </ContextMenuPanel>
          );
        })()}
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

function Slot({
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
      onContextMenu={onContextMenu}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {item && (
        <>
          <span aria-hidden>{iconOf(item.id)}</span>
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

function ContextMenuPanel({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="fixed z-30 bg-slate-900 border border-slate-700 rounded shadow-lg text-xs text-slate-200 py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

function ContextMenuHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 font-semibold text-slate-400 border-b border-slate-700">{label}</div>
  );
}

function ContextMenuButton({
  children,
  onClick,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      className={`block w-full text-left px-3 py-1 hover:bg-slate-700 ${muted ? 'text-slate-500' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
