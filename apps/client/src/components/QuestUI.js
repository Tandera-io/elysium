// apps/client/src/components/QuestUI.js
//
// QuestUI — quest HUD: togglable active-quest log panel + ready-to-turn-in
// notification banner.
//
// Two behaviours in one mount:
//   1. Quest log panel   — toggled with the Q key (or the on-screen [Q] button).
//      Shows all active quests with objectives and item-progress bars.
//   2. Notification banner — auto-dismissing centered alert whenever a quest
//      transitions to 'ready_to_turn_in'.  Dismisses after DISMISS_MS.
//
// Distinct from ui/QuestPanel.tsx (the always-visible sidebar).  QuestUI is
// opt-in (player presses Q) and surfaces richer per-quest context.
//
// Mount once in the component tree (see App.tsx):
//   <QuestUI />
//
// Wiring:
//   - useQuestStore      (systems/quest/questStore)
//   - useInventoryStore  (systems/inventory/inventoryStore)
//   - useNpcStore        (systems/npc/npcStore)
//   - ITEMS              (systems/economy/itemDefs)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuestStore } from '../systems/quest/questStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { ITEMS } from '../systems/economy/itemDefs';

/** Duration in ms before the ready-to-turn-in banner auto-dismisses. */
const DISMISS_MS = 6000;

// ---------------------------------------------------------------------------
// ReadyBanner — shown when a quest becomes ready_to_turn_in
// ---------------------------------------------------------------------------

/**
 * @param {{ quest: object, npcName: string, onDismiss: () => void }} props
 */
function ReadyBanner({ quest, npcName, onDismiss }) {
  const itemDef = ITEMS[quest.item];
  const itemName = itemDef?.name ?? quest.item;

  return (
    <div
      className="absolute top-24 left-1/2 -translate-x-1/2 bg-emerald-900/95 backdrop-blur border border-emerald-600 rounded-2xl shadow-xl text-slate-100 pointer-events-auto cursor-pointer"
      style={{ zIndex: 45 }}
      role="alert"
      aria-live="polite"
      onClick={onDismiss}
    >
      <div className="px-5 py-3 flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          📋
        </span>
        <div>
          <div className="text-sm font-bold text-emerald-300">Missão pronta!</div>
          <div className="text-xs text-slate-300">
            Volte para <span className="font-semibold text-slate-100">{npcName}</span> com{' '}
            {quest.quantity}× {itemName}
          </div>
          <div className="text-xs text-amber-300 mt-0.5">+{quest.rewardCash} moedas</div>
        </div>
        <button
          className="ml-2 text-emerald-500 hover:text-emerald-300 text-xs"
          aria-label="Fechar notificação"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          ✕
        </button>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/70 rounded-b-2xl"
        style={{
          width: '100%',
          animation: `shrink-quest-ready ${DISMISS_MS}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes shrink-quest-ready {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestLogPanel — full active-quest list, shown when player presses Q
// ---------------------------------------------------------------------------

/**
 * @param {{ onClose: () => void }} props
 */
function QuestLogPanel({ onClose }) {
  const active = useQuestStore((s) => s.active);
  const completed = useQuestStore((s) => s.completed);
  const reputation = useQuestStore((s) => s.reputation);
  const invSlots = useInventoryStore((s) => s.slots);
  const npcs = useNpcStore((s) => s.npcs);

  const list = Object.values(active);

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/97 backdrop-blur border border-slate-700 rounded-2xl shadow-2xl text-slate-100 pointer-events-auto"
      style={{ zIndex: 50, minWidth: 320, maxWidth: 400 }}
      role="dialog"
      aria-label="Diário de missões"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
        <h2 className="text-base font-bold tracking-wide">Missões</h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>
            {completed.length} concluída{completed.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Fechar diário (Q)"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Active quest list */}
      <div className="px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-slate-500 italic text-sm text-center py-4">
            Nenhuma missão ativa no momento.
          </p>
        ) : (
          list.map((q) => {
            const npc = npcs[q.giverNpcId];
            const npcName = npc?.def?.name ?? q.giverNpcId;
            const itemDef = ITEMS[q.item];
            const itemName = itemDef?.name ?? q.item;
            const have = invSlots.reduce((acc, s) => (s?.id === q.item ? acc + s.qty : acc), 0);
            const progress = Math.min(have, q.quantity);
            const pct = Math.round((progress / q.quantity) * 100);
            const ready = have >= q.quantity;

            return (
              <div
                key={q.id}
                className={`rounded-xl px-3 py-2.5 border ${
                  ready
                    ? 'bg-emerald-900/30 border-emerald-700'
                    : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                {/* Quest giver + reward */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">{npcName}</span>
                  <span className="text-xs text-amber-300 font-mono">+{q.rewardCash}🪙</span>
                </div>
                {/* Objective */}
                <p className="text-sm text-slate-100 mb-2">
                  Entregar{' '}
                  <span className="font-semibold">
                    {q.quantity}× {itemName}
                  </span>
                </p>
                {/* Progress bar */}
                <div className="relative h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                      ready ? 'bg-emerald-400' : 'bg-amber-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {progress}/{q.quantity}
                  </span>
                  {ready && (
                    <span className="text-emerald-300 font-semibold">
                      Fale com {npcName} para entregar!
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reputation footer */}
      {Object.keys(reputation).length > 0 && (
        <footer className="px-4 py-2 border-t border-slate-700">
          <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Reputação</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {Object.entries(reputation).map(([id, rep]) => (
              <div key={id} className="flex items-center gap-1 text-xs">
                <span className="text-slate-400">{npcs[id]?.def?.name ?? id}</span>
                <span className="text-amber-300 font-mono">+{rep}</span>
              </div>
            ))}
          </div>
        </footer>
      )}

      <div className="px-4 pb-2 text-[10px] text-slate-600 text-right">Pressione Q para fechar</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestUI — main export
// ---------------------------------------------------------------------------

/**
 * QuestUI — mounts both the Q-key quest log and the ready-to-turn-in banner.
 *
 * Features:
 *   - Press Q to open/close the full quest log panel.
 *   - Auto-showing banner when a quest becomes ready_to_turn_in.
 *   - On-screen [Q] button visible in the lower-left HUD area.
 */
export function QuestUI() {
  const active = useQuestStore((s) => s.active);
  const npcs = useNpcStore((s) => s.npcs);

  // Notification banner state
  const [shownIds, setShownIds] = useState(new Set());
  const [banner, setBanner] = useState(null);
  const timerRef = useRef(null);

  // Quest log panel toggle
  const [logOpen, setLogOpen] = useState(false);

  // Watch for quests transitioning to ready_to_turn_in
  useEffect(() => {
    const readyQuests = Object.values(active).filter(
      (q) => q.status === 'ready_to_turn_in' && !shownIds.has(q.id),
    );
    if (readyQuests.length === 0) return;

    const q = readyQuests[0];
    const npc = npcs[q.giverNpcId];
    const npcName = npc?.def?.name ?? q.giverNpcId;

    setShownIds((prev) => new Set([...prev, q.id]));
    setBanner({ quest: q, npcName });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBanner(null), DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  // Q key toggles the quest log (ignores keypresses in text inputs)
  const handleToggleLog = useCallback(() => setLogOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        handleToggleLog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleToggleLog]);

  const activeCount = Object.keys(active).length;

  return (
    <>
      {/* Q-key toggle button — always visible in lower-left HUD */}
      <button
        className="absolute bottom-[4.5rem] left-4 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 hover:text-slate-100 pointer-events-auto"
        style={{ zIndex: 35 }}
        onClick={handleToggleLog}
        title="Missões (Q)"
        aria-label={logOpen ? 'Fechar diário de missões' : 'Abrir diário de missões'}
      >
        📋 Missões
        {activeCount > 0 && <span className="ml-1 text-amber-300 font-mono">{activeCount}</span>}{' '}
        [Q]
      </button>

      {/* Quest log panel (toggled) */}
      {logOpen && <QuestLogPanel onClose={() => setLogOpen(false)} />}

      {/* Ready-to-turn-in notification banner */}
      {banner && (
        <ReadyBanner
          quest={banner.quest}
          npcName={banner.npcName}
          onDismiss={() => setBanner(null)}
        />
      )}
    </>
  );
}

export default QuestUI;
