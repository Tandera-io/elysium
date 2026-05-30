// NPCDialogue — primary NPC conversation UI.
//
// Replaces DialogueBox. The key difference: the NPC speaks first when the
// dialogue opens, handled transparently by useNPCDialogue.
//
// Renders: NPC header, scrollable message history, quest banner, text input.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNPCDialogue } from '../hooks/useNPCDialogue';
import { useQuestStore } from '../systems/quest/questStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { proposeQuestFor } from '../systems/quest/generator';
import { makeSeedMarket } from '../systems/economy/seed';
import { ITEMS } from '../systems/economy/itemDefs';
import { useTimeStore } from '../systems/time/timeStore';

export function NPCDialogue() {
  const { npcId, npc, history, pending, error, close, send } = useNPCDialogue();
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const dayInSeason = useTimeStore((s) => s.dayInSeason);

  const acceptQuest = useQuestStore((s) => s.accept);
  const turnInQuest = useQuestStore((s) => s.turnIn);
  const activeQuest = useQuestStore((s) =>
    npcId ? (Object.values(s.active).find((q) => q.giverNpcId === npcId) ?? null) : null,
  );
  const invSlots = useInventoryStore((s) => s.slots);

  const offered = useMemo(() => {
    if (!npcId) return null;
    const seed = makeSeedMarket();
    const actor = seed.actors[npcId];
    if (!actor) return null;
    return proposeQuestFor(actor, dayInSeason);
  }, [npcId, dayInSeason]);

  useEffect(() => {
    if (npcId) {
      setDraft('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [npcId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, pending]);

  useEffect(() => {
    if (!npcId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close]);

  if (!npcId || !npc) return null;

  const haveForActive = activeQuest
    ? invSlots.reduce((acc, s) => (s?.id === activeQuest.item ? acc + s.qty : acc), 0)
    : 0;
  const canTurnIn = activeQuest !== null && haveForActive >= activeQuest.quantity;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim() || pending) return;
    send(draft);
    setDraft('');
  };

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
        {pending && history.length === 0 && <p className="text-slate-500 italic">…</p>}
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
        {pending && history.length > 0 && <p className="text-slate-500 italic">…pensando</p>}
        {error && <p className="text-rose-400 text-xs">erro: {error}</p>}
      </div>

      {activeQuest && (
        <div className="px-4 py-2 border-t border-slate-700 bg-emerald-900/20 flex items-center justify-between text-xs">
          <span>
            Quest ativa: entregar {activeQuest.quantity}×{' '}
            {ITEMS[activeQuest.item]?.name ?? activeQuest.item} ({haveForActive}/
            {activeQuest.quantity})
          </span>
          {canTurnIn && (
            <button
              onClick={() => {
                const removed = useInventoryStore
                  .getState()
                  .remove(activeQuest.item, activeQuest.quantity);
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
            {npc.def.name} precisa de {offered.quantity}×{' '}
            {ITEMS[offered.item]?.name ?? offered.item}. Recompensa: 🪙{offered.rewardCash} +
            {offered.rewardReputation} rep.
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
          placeholder="Responder…"
          disabled={pending}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="bg-amber-500 text-slate-900 px-3 py-2 rounded text-sm font-semibold disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
