import { usePlayerStore, PLAYER_INVENTORY_SIZE, type InventoryItem } from '../store/playerStore';

const FALLBACK_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%23334155'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18' fill='%2394a3b8'%3E%3F%3C/text%3E%3C/svg%3E";

const ITEM_ICONS: Record<string, string> = {
  seed_wheat:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%2378350f'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8C%BE%3C/text%3E%3C/svg%3E",
  seed_tomato:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%237f1d1d'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8D%85%3C/text%3E%3C/svg%3E",
  seed_corn:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%2378350f'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8C%BD%3C/text%3E%3C/svg%3E",
  wheat:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%2392400e'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8C%BE%3C/text%3E%3C/svg%3E",
  tomato:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%23991b1b'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8D%85%3C/text%3E%3C/svg%3E",
  pumpkin:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%237c2d12'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8E%83%3C/text%3E%3C/svg%3E",
  corn: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%2392400e'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8C%BD%3C/text%3E%3C/svg%3E",
  strawberry:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%239f1239'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%F0%9F%8D%93%3C/text%3E%3C/svg%3E",
  tool: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%231e3a5f'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18'%3E%E2%9A%92%EF%B8%8F%3C/text%3E%3C/svg%3E",
};

function iconFor(item: InventoryItem): string {
  if (item.iconPath && item.iconPath !== '') return item.iconPath;
  return ITEM_ICONS[item.id] ?? FALLBACK_ICON;
}

interface SlotProps {
  item: InventoryItem | null;
  index: number;
}

function Slot({ item, index }: SlotProps) {
  return (
    <div
      className={`relative w-12 h-12 rounded-lg border flex items-center justify-center select-none transition-colors ${
        item
          ? 'border-slate-600 bg-slate-800 hover:border-amber-500 cursor-default'
          : 'border-slate-700 bg-slate-900/40'
      }`}
      title={item ? `${item.name} (x${item.quantity})` : undefined}
      aria-label={item ? `${item.name}, quantity ${item.quantity}` : `Slot ${index + 1} empty`}
    >
      {item && (
        <>
          <img
            src={iconFor(item)}
            alt={item.name}
            className="w-8 h-8 object-contain"
            draggable={false}
          />
          {item.quantity > 1 && (
            <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-amber-300 leading-none">
              {item.quantity}
            </span>
          )}
        </>
      )}
    </div>
  );
}

interface InventoryDisplayProps {
  open: boolean;
  onClose: () => void;
}

export function InventoryDisplay({ open, onClose }: InventoryDisplayProps) {
  const inventory = usePlayerStore((s) => s.inventory);

  if (!open) return null;

  const slots: (InventoryItem | null)[] = Array.from(
    { length: PLAYER_INVENTORY_SIZE },
    (_, i) => inventory[i] ?? null,
  );

  return (
    <div
      role="dialog"
      aria-label="Inventário do jogador"
      aria-modal="true"
      className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl shadow-xl px-4 py-3 min-w-[260px]"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide">
          Mochila{' '}
          <span className="text-slate-500 font-normal">
            ({inventory.filter(Boolean).length}/{PLAYER_INVENTORY_SIZE})
          </span>
        </h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-xs px-1"
          aria-label="Fechar inventário (I)"
        >
          [I] fechar
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((item, i) => (
          <Slot key={i} item={item} index={i} />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-600 text-center">
        Pressione <kbd className="font-mono bg-slate-800 px-1 rounded">I</kbd> para fechar
      </p>
    </div>
  );
}
