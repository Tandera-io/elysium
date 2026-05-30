import { create } from 'zustand';
import { useInventoryStore } from '../systems/inventory/inventoryStore';

const ITEM_META = {
  seed_wheat: { name: 'Sementes de trigo', icon: '🌾', type: 'seed' },
  seed_tomato: { name: 'Sementes de tomate', icon: '🍅', type: 'seed' },
  seed_corn: { name: 'Sementes de milho', icon: '🌽', type: 'seed' },
  wheat: { name: 'Trigo colhido', icon: '🌾', type: 'crop' },
  tomato: { name: 'Tomate colhido', icon: '🍅', type: 'crop' },
};

function slotsToItems(slots) {
  return slots.filter(Boolean).map((s) => ({
    id: s.id,
    name: ITEM_META[s.id]?.name ?? s.id,
    icon: ITEM_META[s.id]?.icon ?? '?',
    type: ITEM_META[s.id]?.type ?? 'material',
    quantity: s.qty,
  }));
}

export const useInventoryHudStore = create((set) => {
  const sync = () => {
    const { slots, gold } = useInventoryStore.getState();
    set({ items: slotsToItems(slots), gold });
  };

  useInventoryStore.subscribe(sync);
  sync();

  return {
    items: [],
    gold: 0,
  };
});
