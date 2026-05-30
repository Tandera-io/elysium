import { useState } from 'react';
import {
  useInventoryStore,
  USABLE_ITEMS,
  isSeedItem,
  SEED_TO_CROP,
  type SlotItem,
} from '../systems/inventory/inventoryStore';
import { useFarmStore } from '../systems/farming/farmStore';
import { usePlayerStore } from '../store/playerStore';
import { CROPS, type CropId } from '../systems/farming/CropDefs';

const ITEM_ICON: Record<string, string> = {
  seed_wheat: '🌾',
  seed_tomato: '🍅',
  seed_corn: '🌽',
  watering_can: '💧',
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
  watering_can: 'Regador',
  wheat: 'Trigo colhido',
  tomato: 'Tomate colhido',
  corn: 'Milho colhido',
  pumpkin: 'Abóbora colhida',
  strawberry: 'Morango colhido',
};

function nameOf(id: string): string {
  return ITEM_NAME[id] ?? CROPS[id as CropId]?.name ?? id;
}

/** Feedback message displayed briefly after using an item. */
type UseResult = { ok: boolean; msg: string };

export function InventoryPanel() {
  const slots = useInventoryStore((s) => s.slots);
  const swap = useInventoryStore((s) => s.swap);
  const selectedSlot = useInventoryStore((s) => s.selectedSlot);
  const selectSlot = useInventoryStore((s) => s.selectSlot);
  const useItem = useInventoryStore((s) => s.useItem);
  const selectedItem = useInventoryStore((s) => s.selectedItem);
  const gold = useInventoryStore((s) => s.gold);

  const pickUp = usePlayerStore((s) => s.pickUp);
  const dropItem = usePlayerStore((s) => s.dropItem);

  const farmWater = useFarmStore((s) => s.water);
  const farmPlant = useFarmStore((s) => s.plant);
  const playerPos = usePlayerStore((s) => s.position);

  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverOver, setHoverOver] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<UseResult | null>(null);

  /** Show a brief feedback toast then clear. */
  function showFeedback(result: UseResult) {
    setFeedback(result);
    setTimeout(() => setFeedback(null), 1800);
  }

  /** Handle slot click: select/deselect and sync player heldItem. */
  function handleSlotClick(index: number) {
    const item = slots[index];
    if (!item) {
      // Clicking an empty slot deselects everything
      selectSlot(null);
      dropItem();
      return;
    }
    const alreadySelected = selectedSlot === index;
    selectSlot(index);
    if (alreadySelected) {
      dropItem();
    } else {
      pickUp(item.id);
    }
  }

  /** Use the currently selected item on the nearest farm tile. */
  function handleUseItem() {
    const item = selectedItem();
    if (!item) return;
    if (!USABLE_ITEMS.has(item.id)) {
      showFeedback({ ok: false, msg: 'Não pode usar este item' });
      return;
    }

    // Derive the nearest tile from the player's world position
    const tileCoord = {
      x: Math.round(playerPos.x),
      z: Math.round(playerPos.z),
    };

    if (item.id === 'watering_can') {
      const ok = farmWater(tileCoord);
      showFeedback(
        ok ? { ok: true, msg: 'Tile regado!' } : { ok: false, msg: 'Nada para regar aqui' },
      );
      return;
    }

    if (isSeedItem(item.id)) {
      const cropId = SEED_TO_CROP[item.id];
      const ok = farmPlant(tileCoord, cropId);
      if (ok) {
        // Consume 1 seed from inventory
        useItem();
        showFeedback({ ok: true, msg: `${CROPS[cropId].name} plantado!` });
      } else {
        showFeedback({ ok: false, msg: 'Precisa de solo arado para plantar' });
      }
      return;
    }
  }

  const activeItem = selectedItem();
  const canUse = activeItem !== null && USABLE_ITEMS.has(activeItem.id);

  return (
    <aside className="absolute top-20 right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-300">Inventário</h2>
        <span className="text-amber-300 font-mono">🪙 {gold}</span>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {slots.map((slot, i) => (
          <Slot
            key={i}
            index={i}
            item={slot}
            isSelected={selectedSlot === i}
            isDraggingFrom={draggingFrom === i}
            isHoverTarget={hoverOver === i && draggingFrom !== null && draggingFrom !== i}
            onClick={() => handleSlotClick(i)}
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

      {/* Use-item area */}
      <div className="mt-2 flex items-center gap-2">
        <button
          disabled={!canUse}
          onClick={handleUseItem}
          className={`flex-1 py-1 rounded text-xs font-semibold transition ${
            canUse
              ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
          title={canUse ? `Usar ${nameOf(activeItem!.id)}` : 'Selecione um item usável'}
        >
          {canUse ? `Usar ${nameOf(activeItem!.id)}` : 'Nenhum item selecionado'}
        </button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`mt-1 rounded px-2 py-1 text-xs text-center font-medium ${
            feedback.ok ? 'bg-green-700/70 text-green-200' : 'bg-red-700/70 text-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}
    </aside>
  );
}

interface SlotProps {
  index: number;
  item: SlotItem | null;
  isSelected: boolean;
  isDraggingFrom: boolean;
  isHoverTarget: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

function Slot({
  item,
  isSelected,
  isDraggingFrom,
  isHoverTarget,
  onClick,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: SlotProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative w-10 h-10 rounded-md border flex items-center justify-center text-lg select-none ${
        isSelected
          ? 'border-amber-400 bg-amber-500/30 ring-1 ring-amber-400'
          : isHoverTarget
            ? 'border-amber-400 bg-amber-500/20'
            : isDraggingFrom
              ? 'border-slate-500 bg-slate-800/40 opacity-50'
              : item
                ? 'border-slate-700 bg-slate-800 cursor-pointer hover:border-slate-500'
                : 'border-slate-800 bg-slate-900/40'
      }`}
      draggable={item !== null}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
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
              {USABLE_ITEMS.has(item.id) && (
                <div className="text-amber-400 mt-0.5">Clique para selecionar</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
