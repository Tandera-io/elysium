import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { CROPS, type CropId } from '../systems/farming/CropDefs';

const ITEM_LABEL: Record<string, string> = {
  seed_wheat: '🌾 sementes',
  seed_tomato: '🍅 sementes',
  wheat: '🌾 trigo',
  tomato: '🍅 tomate',
};

export function InventoryPanel() {
  const items = useInventoryStore((s) => s.items);
  const entries = Object.entries(items).filter(([, q]) => (q ?? 0) > 0);

  return (
    <aside className="absolute top-20 right-4 bg-slate-900/70 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[160px]">
      <h2 className="text-sm font-semibold text-slate-300 mb-1">Inventário</h2>
      {entries.length === 0 ? (
        <p className="text-slate-500 italic">vazio</p>
      ) : (
        <ul className="space-y-0.5 font-mono">
          {entries.map(([id, qty]) => {
            const label =
              ITEM_LABEL[id] ??
              (CROPS[id as CropId] !== undefined ? `🌱 ${CROPS[id as CropId].name}` : id);
            return (
              <li key={id} className="flex justify-between">
                <span>{label}</span>
                <span className="text-amber-300 ml-2">×{qty}</span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
