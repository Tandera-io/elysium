import { useServerHealth } from '../utils/devServer';
import { Scene } from '../engine/scene/Scene';
import { Hotbar } from '../ui/Hotbar';
import { InventoryPanel } from '../ui/InventoryPanel';
import { DialogueBox } from '../ui/DialogueBox';
import { QuestPanel } from '../ui/QuestPanel';
import { InteractPrompt } from '../systems/npc/InteractPrompt';
import { NPCShopModal } from '../engine/ui/NPCShopModal';
import { useInventoryStore } from '../systems/inventory/inventoryStore';

function ServerBadge({ health }) {
  if (health.kind === 'loading') return <span>conectando…</span>;
  if (health.kind === 'error') return <span className="text-rose-400">offline</span>;
  return (
    <span>
      <span className="text-emerald-400">●</span> server {health.data.version}
    </span>
  );
}

export function GameScreen({ onOpenMenu }) {
  const health = useServerHealth();
  const gold = useInventoryStore((s) => s.gold);

  return (
    <>
      <Scene />
      <header className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur rounded-lg px-4 py-2 text-slate-100">
        <h1 className="text-xl font-bold tracking-tight">Elysium</h1>
        <p className="text-slate-300 text-xs">Fase 12 · polish</p>
        <p className="text-amber-300 text-xs font-mono">🪙 {gold}g</p>
        <button
          onClick={onOpenMenu}
          className="mt-1 text-[10px] text-slate-400 hover:text-slate-200"
        >
          📁 menu (Esc · Ctrl+S)
        </button>
      </header>
      <aside
        className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
        data-testid="health-panel"
      >
        <ServerBadge health={health} />
      </aside>
      <InventoryPanel />
      <QuestPanel />
      <Hotbar />
      <InteractPrompt />
      <DialogueBox />
      <NPCShopModal />
    </>
  );
}
