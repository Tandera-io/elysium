import { useEffect, useState } from 'react';
import type { HealthResponse } from '@elysium/shared';
import { Scene } from './engine/scene/Scene';
import { Hotbar } from './ui/Hotbar';
import { InventoryPanel } from './ui/InventoryPanel';
import { DialogueBox } from './ui/DialogueBox';
import { QuestPanel } from './ui/QuestPanel';
import { SaveMenu } from './ui/SaveMenu';
import { TitleScreen } from './ui/TitleScreen';
import { FishingPanel } from './ui/FishingPanel';
import { InteractPrompt } from './systems/npc/InteractPrompt';
import { NPCShopModal } from './engine/ui/NPCShopModal';
import { useTimeStore } from './systems/time/timeStore';
import { useInventoryStore } from './systems/inventory/inventoryStore';
import { useFishingStore } from './systems/fishing/fishingStore';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse }
  | { kind: 'error'; message: string };

export function App() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });
  const [titleOpen, setTitleOpen] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const gold = useInventoryStore((s) => s.gold);
  const isFishing = useFishingStore((s) => s.isFishing);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as HealthResponse;
        if (!cancelled) setState({ kind: 'ok', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    useTimeStore.getState().setPaused(titleOpen);
  }, [titleOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        setSaveOpen(true);
        return;
      }

      const {
        isFishing: fishing,
        phase,
        startFishing,
        cancelFishing,
        catchFish,
      } = useFishingStore.getState();

      // F key: start fishing (only when not already fishing and no modal open)
      if (e.code === 'KeyF' && !fishing && !titleOpen && !saveOpen) {
        startFishing();
        return;
      }

      // Space: catch fish during bite window
      if (e.code === 'Space' && fishing && phase === 'bite') {
        e.preventDefault();
        catchFish();
        useInventoryStore.getState().addFish();
        useInventoryStore.getState().addGold(10);
        return;
      }

      // Escape: cancel fishing first, then open save menu
      if (e.code === 'Escape') {
        if (fishing) {
          cancelFishing();
          return;
        }
        if (!titleOpen && !saveOpen) {
          setSaveOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [titleOpen, saveOpen]);

  return (
    <main className="h-screen w-screen overflow-hidden relative bg-slate-900">
      <Scene />
      <header className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur rounded-lg px-4 py-2 text-slate-100">
        <h1 className="text-xl font-bold tracking-tight">Elysium</h1>
        <p className="text-slate-300 text-xs">Fase 12 · polish</p>
        <p className="text-amber-300 text-xs font-mono">🪙 {gold}g</p>
        <button
          onClick={() => setSaveOpen(true)}
          className="mt-1 text-[10px] text-slate-400 hover:text-slate-200"
        >
          📁 menu (Esc · Ctrl+S)
        </button>
        {!isFishing && <p className="mt-0.5 text-[10px] text-blue-300">🎣 F para pescar</p>}
      </header>
      <aside
        className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
        data-testid="health-panel"
      >
        {state.kind === 'loading' && <span>conectando…</span>}
        {state.kind === 'error' && <span className="text-rose-400">erro: {state.message}</span>}
        {state.kind === 'ok' && (
          <span>
            <span className="text-emerald-400">●</span> server {state.data.version} ·{' '}
            <span title="MESHY_API_KEY">M:{state.data.hasMeshyKey ? '✓' : '✗'}</span> ·{' '}
            <span title="ANTHROPIC_API_KEY">A:{state.data.hasAnthropicKey ? '✓' : '✗'}</span>
          </span>
        )}
      </aside>
      <InventoryPanel />
      <QuestPanel />
      <Hotbar />
      <InteractPrompt />
      <DialogueBox />
      <NPCShopModal />
      <FishingPanel />
      <SaveMenu open={saveOpen} onClose={() => setSaveOpen(false)} />
      {titleOpen && <TitleScreen onStart={() => setTitleOpen(false)} />}
    </main>
  );
}
