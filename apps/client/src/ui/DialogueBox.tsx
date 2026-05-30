import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { currentSeason, useTimeStore } from '../systems/time/timeStore';
import { useQuestStore } from '../systems/quest/questStore';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { proposeQuestFor } from '../systems/quest/generator';
import { makeSeedMarket } from '../systems/economy/seed';
import { ITEMS } from '../systems/economy/itemDefs';
import { useMarinaCropTaskStore, CROP_PT_NAMES } from '../systems/farming/marinaCropTask';

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

  const acceptQuest = useQuestStore((s) => s.accept);
  const declineQuest = useQuestStore((s) => s.decline);
  const turnInQuest = useQuestStore((s) => s.turnIn);
  const declinedIds = useQuestStore((s) => s.declined);
  const activeQuest = useQuestStore((s) =>
    npcId ? (Object.values(s.active).find((q) => q.giverNpcId === npcId) ?? null) : null,
  );
  const invSlots = useInventoryStore((s) => s.slots);

  const offered = useMemo(() => {
    if (!npcId) return null;
    const seed = makeSeedMarket();
    const actor = seed.actors[npcId];
    if (!actor) return null;
    const q = proposeQuestFor(actor, dayInSeason);
    return q && !declinedIds.includes(q.id) ? q : null;
  }, [npcId, dayInSeason, declinedIds]);

  const marinaCropTask = useMarinaCropTaskStore((s) => s.current);
  const marinaCropTaskOffer = useMarinaCropTaskStore((s) => s.offer);
  const marinaCropTaskAccept = useMarinaCropTaskStore((s) => s.accept);
  const marinaCropTaskDecline = useMarinaCropTaskStore((s) => s.decline);
  const marinaCropTaskComplete = useMarinaCropTaskStore((s) => s.complete);

  useEffect(() => {
    if (npcId === 'marina') {
      const cur = useMarinaCropTaskStore.getState().current;
      if (!cur || cur.status === 'declined' || cur.status === 'completed') {
        marinaCropTaskOffer(dayInSeason);
      }
    }
  }, [npcId, dayInSeason, marinaCropTaskOffer]);

  const haveForMarinaTask =
    marinaCropTask && marinaCropTask.status === 'accepted'
      ? invSlots.reduce((acc, s) => (s?.id === marinaCropTask.crop ? acc + s.qty : acc), 0)
      : 0;
  const canCompleteMarinaTask =
    marinaCropTask?.status === 'accepted' && haveForMarinaTask >= marinaCropTask.quantity;

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(draft, {
      hour,
      dayInSeason,
      season: currentSeason({ seasonIndex } as Parameters<typeof currentSeason>[0]),
      year,
    });
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
        <div className="px-4 py-2 border-t border-slate-700 bg-amber-900/20 text-xs">
          <p className="mb-2">
            {npc.def.name} precisa de {offered.quantity}× {ITEMS[offered.item].name}. Recompensa: 🪙
            {offered.rewardCash} +{offered.rewardReputation} rep.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => acceptQuest(offered)}
              className="bg-amber-500 text-slate-900 px-2 py-1 rounded font-semibold"
            >
              Aceitar
            </button>
            <button
              onClick={() => declineQuest(offered.id)}
              className="bg-slate-700 text-slate-300 px-2 py-1 rounded hover:bg-slate-600"
            >
              Recusar
            </button>
          </div>
        </div>
      )}
      {npcId === 'marina' && marinaCropTask?.status === 'accepted' && (
        <div className="px-4 py-2 border-t border-slate-700 bg-emerald-900/20 flex items-center justify-between text-xs">
          <span>
            Tarefa: entregar {marinaCropTask.quantity}× {CROP_PT_NAMES[marinaCropTask.crop]} (
            {haveForMarinaTask}/{marinaCropTask.quantity}) — recompensa: {marinaCropTask.rewardGold}
            g
          </span>
          {canCompleteMarinaTask && (
            <button
              onClick={() => {
                const removed = useInventoryStore
                  .getState()
                  .remove(marinaCropTask.crop, marinaCropTask.quantity);
                if (removed) {
                  useInventoryStore.getState().addGold(marinaCropTask.rewardGold);
                  marinaCropTaskComplete();
                }
              }}
              className="bg-emerald-500 text-slate-900 px-2 py-1 rounded font-semibold"
            >
              Entregar
            </button>
          )}
        </div>
      )}
      {npcId === 'marina' && marinaCropTask?.status === 'completed' && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/60 text-xs text-slate-400 text-center">
          Tarefa concluída! Volte amanhã para uma nova encomenda.
        </div>
      )}
      {npcId === 'marina' && marinaCropTask?.status === 'offered' && (
        <div className="px-4 py-2 border-t border-slate-700 bg-amber-900/20 text-xs">
          <p className="mb-2">
            Marina precisa de {marinaCropTask.quantity}× {CROP_PT_NAMES[marinaCropTask.crop]} da sua
            roça. Recompensa: {marinaCropTask.rewardGold}g
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => marinaCropTaskAccept()}
              className="bg-amber-500 text-slate-900 px-2 py-1 rounded font-semibold"
            >
              Aceitar
            </button>
            <button
              onClick={() => marinaCropTaskDecline()}
              className="bg-slate-700 text-slate-300 px-2 py-1 rounded hover:bg-slate-600"
            >
              Recusar
            </button>
          </div>
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
