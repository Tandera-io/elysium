import { useState } from 'react';
import {
  useInventoryStore,
  NON_STACKABLE,
  type SlotItem,
} from '../../systems/inventory/inventoryStore';
import { CROPS, type CropId } from '../../systems/farming/CropDefs';

type Tab = 'all' | 'crops' | 'seeds' | 'tools';

const ITEM_ICON: Record<string, string> = {
  hoe: '⛏️',
  watering_can: '💧',
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
  hoe: 'Enxada',
  watering_can: 'Regador',
  seed_wheat: 'Sementes de trigo',
  seed_tomato: 'Sementes de tomate',
  seed_corn: 'Sementes de milho',
  wheat: 'Trigo',
  tomato: 'Tomate',
  pumpkin: 'Abóbora',
  corn: 'Milho',
  strawberry: 'Morango',
};

const ITEM_DESCRIPTION: Record<string, string> = {
  hoe: 'Prepara o solo para o plantio.',
  watering_can: 'Rega as plantas plantadas.',
  seed_wheat: 'Semeia trigo. Cresce em 4 dias.',
  seed_tomato: 'Semeia tomate. Cresce em 5 dias.',
  seed_corn: 'Semeia milho. Cresce em 6 dias.',
  wheat: 'Trigo colhido. Venda à Marina.',
  tomato: 'Tomate colhido. Venda à Marina.',
  pumpkin: 'Abóbora colhida. Venda à Marina.',
  corn: 'Milho colhido. Venda à Marina.',
  strawberry: 'Morango colhido. Venda à Marina.',
};

function isSeed(id: string): boolean {
  return id.startsWith('seed_');
}

function isCrop(id: string): boolean {
  return id in CROPS;
}

function isTool(id: string): boolean {
  return NON_STACKABLE.has(id as Parameters<typeof NON_STACKABLE.has>[0]);
}

function nameOf(id: string): string {
  return ITEM_NAME[id] ?? CROPS[id as CropId]?.name ?? id;
}

function typeLabel(id: string): string {
  if (isTool(id)) return 'Ferramenta';
  if (isSeed(id)) return 'Semente';
  if (isCrop(id)) return 'Colheita';
  return 'Item';
}

function typeColor(id: string): string {
  if (isTool(id)) return 'text-sky-400';
  if (isSeed(id)) return 'text-lime-400';
  if (isCrop(id)) return 'text-amber-400';
  return 'text-slate-400';
}

function typeBadgeBg(id: string): string {
  if (isTool(id)) return 'bg-sky-900/60 border-sky-700/60';
  if (isSeed(id)) return 'bg-lime-900/60 border-lime-700/60';
  if (isCrop(id)) return 'bg-amber-900/60 border-amber-700/60';
  return 'bg-slate-800 border-slate-700';
}

const TAB_LABELS: Record<Tab, string> = {
  all: 'Todos',
  crops: 'Colhidos',
  seeds: 'Sementes',
  tools: 'Ferramentas',
};

const TABS: Tab[] = ['all', 'crops', 'seeds', 'tools'];

interface InventoryProps {
  open: boolean;
  onClose: () => void;
}

export function Inventory({ open, onClose }: InventoryProps) {
  const slots = useInventoryStore((s) => s.slots);
  const gold = useInventoryStore((s) => s.gold);
  const [tab, setTab] = useState<Tab>('all');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (!open) return null;

  const filled = slots.filter((s): s is SlotItem => s !== null);

  const visible = filled.filter((s) => {
    if (tab === 'seeds') return isSeed(s.id);
    if (tab === 'crops') return isCrop(s.id);
    if (tab === 'tools') return isTool(s.id);
    return true;
  });

  const tabCount = (t: Tab): number => {
    if (t === 'all') return filled.length;
    if (t === 'seeds') return filled.filter((s) => isSeed(s.id)).length;
    if (t === 'crops') return filled.filter((s) => isCrop(s.id)).length;
    if (t === 'tools') return filled.filter((s) => isTool(s.id)).length;
    return 0;
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-[520px] max-h-[82vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-wide">Inventário</h2>
            <p className="text-xs text-amber-300 font-mono mt-0.5">🪙 {gold}g</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-xl leading-none p-1 hover:bg-slate-800 rounded-lg transition"
              title="Fechar (I / Esc)"
              aria-label="Fechar inventário"
            >
              ✕
            </button>
            <span className="text-xs text-slate-500 font-mono">
              {filled.length}/{slots.length} slots
            </span>
          </div>
        </div>

        {/* Slot capacity bar */}
        <div className="px-6 mt-3">
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${(filled.length / slots.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 mt-4">
          {TABS.map((t) => {
            const count = tabCount(t);
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                  tab === t
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {TAB_LABELS[t]}
                {count > 0 && (
                  <span
                    className={`text-[10px] rounded-full px-1.5 py-0.5 font-mono leading-none ${
                      tab === t ? 'bg-slate-900/30 text-slate-900' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-6 mt-3 border-t border-slate-800" />

        {/* Item grid */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {visible.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-10 flex flex-col items-center gap-2">
              <span className="text-3xl opacity-30">🎒</span>
              <span>Nenhum item nesta categoria</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {visible.map((item, idx) => {
                const isHovered = hoveredItem === `${item.id}-${idx}`;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition cursor-default ${typeBadgeBg(item.id)} ${
                      isHovered ? 'brightness-125' : ''
                    }`}
                    onMouseEnter={() => setHoveredItem(`${item.id}-${idx}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <span className="text-2xl select-none" aria-hidden>
                      {ITEM_ICON[item.id] ?? '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {nameOf(item.id)}
                      </div>
                      <div className={`text-xs ${typeColor(item.id)}`}>{typeLabel(item.id)}</div>
                      {isHovered && ITEM_DESCRIPTION[item.id] && (
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {ITEM_DESCRIPTION[item.id]}
                        </div>
                      )}
                    </div>
                    {isTool(item.id) ? (
                      <span className="text-xs text-sky-400 font-mono bg-sky-900/40 px-1.5 py-0.5 rounded">
                        1×
                      </span>
                    ) : (
                      <div className="text-sm font-mono text-amber-300 font-bold">×{item.qty}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 pt-1">
          <p className="text-[10px] text-slate-600 text-center">
            Pressione <kbd className="bg-slate-800 text-slate-400 px-1 rounded text-[9px]">I</kbd>{' '}
            ou <kbd className="bg-slate-800 text-slate-400 px-1 rounded text-[9px]">Esc</kbd> para
            fechar
          </p>
        </div>
      </div>
    </div>
  );
}
