import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { currentSeason, useTimeStore } from '../systems/time/timeStore';
import { useQuestStore } from '../systems/quest/questStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { proposeQuestFor } from '../systems/quest/generator';
import { makeSeedMarket } from '../systems/economy/seed';
import { ITEMS } from '../systems/economy/itemDefs';
import { useNPCShopStore, DORINHA_SHOP_ID } from '../systems/npc/NPCShop';
import { DialogueTree, hasDialogueTree } from '../components/DialogueTree';

interface QuickChoice {
  label: string;
  text: string;
}

const NPC_CHOICES: Record<string, QuickChoice[]> = {
  [DORINHA_SHOP_ID]: [
    { label: 'Comprar sementes', text: 'Quero comprar sementes' },
    { label: 'Vender colheita', text: 'Quero vender minha colheita' },
    { label: 'Como vai?', text: 'Como você está?' },
  ],
};

export function DialogueBox() {
  const npcId = useDialogueStore((s) => s.npcId);
  const history = useDialogueStore((s) => s.history);
  const pending = useDialogueStore((s) => s.pending);
  const error = useDialogueStore((s) => s.error);
  const close = useDialogueStore((s) => s.close);
  const send = useDialogueStore((s) => s.send);
  const npcs = useNpcStore((s) => s.npcs);
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (npcId) {
      setDraft('');
      // Focus the input when dialogue opens
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [npcId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, pending]);

  useEffect(() => {
    if (!npcId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close]);

  // Quest state (recomputed cheaply when dialogue opens)
  const acceptQuest = useQuestStore((s) => s.accept);
  const turnInQuest = useQuestStore((s) => s.turnIn);
  const activeQuest = useQuestStore((s) =>
    npcId ? (Object.values(s.active).find((q) => q.giverNpcId === npcId) ?? null) : null,
  );
  const invSlots = useInventoryStore((s) => s.slots);

  // Generate a candidate quest from the static seed market (Phase 11 will
  // wire this to a live economy state).
  const offered = useMemo(() => {
    if (!npcId) return null;
    const seed = makeSeedMarket();
    const actor = seed.actors[npcId];
    if (!actor) return null;
    return proposeQuestFor(actor, dayInSeason);
  }, [npcId, dayInSeason]);

  if (!npcId) return null;
  const npc = npcs[npcId];
  if (!npc) return null;

  const haveForActive = activeQuest
    ? invSlots.reduce(
        (acc, s) => (s?.id === (activeQuest.item as unknown as string) ? acc + s.qty : acc),
        0,
      )
    : 0;
  const canTurnIn = activeQuest !== null && haveForActive >= activeQuest.quantity;

  // World context helper
  const worldCtx = () => ({
    hour,
    dayInSeason,
    season: currentSeason({ seasonIndex } as Parameters<typeof currentSeason>[0]),
    year,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    void sendText(draft);
    setDraft('');
  };

  const sendText = async (text: string) => {
    await send(text, worldCtx());
    // After sending, check the latest NPC reply for actionHint
    // We check the store state directly after the await resolves
    const latestHistory = useDialogueStore.getState().history;
    const lastNpcTurn = [...latestHistory].reverse().find((t) => t.who === 'npc');
    // actionHint is not stored in DialogueTurn yet; open_shop hint is handled
    // via quick-choice buttons instead (see below).
    void lastNpcTurn; // suppress unused warning
  };

  const onQuickChoice = async (text: string) => {
    // If this is a "buy seeds" or "sell crops" choice for a shop NPC, also open the shop
    const isShopChoice = text.includes('sementes') || text.includes('colheita');
    if (isShopChoice && npcId === DORINHA_SHOP_ID) {
      // Send the dialogue message first so she can react, then open shop
      void send(text, worldCtx());
      // Open the shop after a brief moment so the player sees her response
      setTimeout(() => {
        const shopStore = useNPCShopStore.getState();
        if (!shopStore.openShopId) shopStore.openShop(npcId);
      }, 600);
    } else {
      void send(text, worldCtx());
    }
  };

  const quickChoices = NPC_CHOICES[npcId] ?? null;
  const useTree = hasDialogueTree(npcId);

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-bold">{npc.def.name}</h2>
          <p className="text-xs text-slate-400">{npc.def.role}</p>
        </div>
        <button
          onClick={close}
          className="text-slate-400 hover:text-slate-200 text-sm"
          title="Fechar (Esc)"
        >
          ✕
        </button>
      </header>
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {history.length === 0 && !pending && (
          <p className="text-slate-500 italic">Diga olá para {npc.def.name}…</p>
        )}
        {history.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.who === 'player' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl ${
                turn.who === 'player'
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              {turn.text}
              {turn.who === 'npc' && turn.emotion && (
                <div className="text-[10px] text-slate-400 mt-1">— {turn.emotion}</div>
              )}
            </div>
          </div>
        ))}
        {pending && <p className="text-slate-500 italic">…pensando</p>}
        {error && <p className="text-rose-400 text-xs">erro: {error}</p>}
      </div>

      {/* Dialogue tree (static choices) shown when NPC has a defined tree */}
      {useTree && <DialogueTree npcId={npcId} />}

      {/* Quick-choice buttons (shown for other NPCs without a tree) */}
      {!useTree && quickChoices && !pending && (
        <div className="px-4 py-2 border-t border-slate-700/60 flex flex-wrap gap-2">
          {quickChoices.map((choice: QuickChoice) => (
            <button
              key={choice.label}
              onClick={() => void onQuickChoice(choice.text)}
              disabled={pending}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-full transition-colors disabled:opacity-40"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {activeQuest && (
        <div className="px-4 py-2 border-t border-slate-700 bg-emerald-900/20 flex items-center justify-between text-xs">
          <span>
            Quest ativa: entregar {activeQuest.quantity}× {ITEMS[activeQuest.item].name} (
            {haveForActive}/{activeQuest.quantity})
          </span>
          {canTurnIn && (
            <button
              onClick={() => {
                const removed = useInventoryStore
                  .getState()
                  .remove(activeQuest.item as unknown as never, activeQuest.quantity);
                if (removed) turnInQuest(activeQuest.id);
              }}
              className="bg-emerald-500 text-slate-900 px-2 py-1 rounded font-semibold"
            >
              Entregar
            </button>
          )}
        </div>
      )}
      {!activeQuest && offered && (
        <div className="px-4 py-2 border-t border-slate-700 bg-amber-900/20 flex items-center justify-between text-xs">
          <span>
            {npc.def.name} precisa de {offered.quantity}× {ITEMS[offered.item].name}. Recompensa: 🪙
            {offered.rewardCash} +{offered.rewardReputation} rep.
          </span>
          <button
            onClick={() => acceptQuest(offered)}
            className="bg-amber-500 text-slate-900 px-2 py-1 rounded font-semibold"
          >
            Aceitar
          </button>
        </div>
      )}
      <form onSubmit={onSubmit} className="flex gap-2 px-3 py-2 border-t border-slate-700">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Diga algo..."
          disabled={pending}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="bg-amber-500 text-slate-900 px-3 py-2 rounded text-sm font-semibold disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
