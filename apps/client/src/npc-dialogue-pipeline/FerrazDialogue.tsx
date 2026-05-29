/**
 * FerrazDialogue — Ferraz-specific dialogue pipeline component.
 *
 * Ferraz is the village blacksmith. He's gruff, practical, and passionate
 * about quality craftsmanship. This component renders his dialogue box with
 * blacksmith-themed UI decorations and exposes Ferraz-specific action hints
 * (tool upgrades, ore crafting) on top of the generic dialogue system.
 *
 * Usage: mount <FerrazDialogue /> alongside <DialogueBox /> in App.tsx, or
 * let it be rendered by App when the active NPC is "ferraz".
 */

import { useEffect, useRef, useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';

// ----------------------------------------------------------------------------
// Ferraz NPC ID constant — keep in sync with content/npcs/ferraz.json
// ----------------------------------------------------------------------------
export const FERRAZ_NPC_ID = 'ferraz' as const;

// ----------------------------------------------------------------------------
// Ferraz schedule availability helpers
// ----------------------------------------------------------------------------

/**
 * Returns a contextual greeting line based on the current in-game hour
 * and Ferraz's schedule.
 */
function getContextualGreeting(hour: number): string {
  if (hour >= 6 && hour < 9) {
    return 'Acendendo a forja. Que foi?';
  }
  if (hour >= 9 && hour < 12) {
    return 'Tô no meio de um trabalho. Seja rápido.';
  }
  if (hour >= 12 && hour < 14) {
    return 'Hora do almoço. Fala logo que tenho que comer.';
  }
  if (hour >= 14 && hour < 16) {
    return 'Que precisa? Tô atendendo.';
  }
  if (hour >= 16 && hour < 20) {
    return 'Ocupado aqui. O que quer?';
  }
  if (hour >= 20 && hour < 22) {
    return 'Dia longo. Fala rápido que quero descansar.';
  }
  // Late night / early morning
  return 'Essa hora? Vai dormir.';
}

/**
 * Returns true if Ferraz is currently in a focused forging session
 * (hours 09:00–12:00 and 16:00–20:00).
 */
function isFerrazBusy(hour: number): boolean {
  return (hour >= 9 && hour < 12) || (hour >= 16 && hour < 20);
}

// ----------------------------------------------------------------------------
// Ferraz-specific action hint display
// ----------------------------------------------------------------------------

type FerrazAction = 'upgrade_tool' | 'smelt_ore' | 'buy_tools' | null;

function FerrazActionHint({ action }: { action: FerrazAction }) {
  if (!action) return null;
  const labels: Record<NonNullable<FerrazAction>, string> = {
    upgrade_tool: '⚒ Ferramentas disponíveis para melhoria',
    smelt_ore: '🔥 Forja disponível para fundir minério',
    buy_tools: '🛒 Ferramentas à venda',
  };
  return (
    <div className="px-4 py-2 border-t border-slate-700 bg-orange-900/20 text-xs text-orange-300">
      {labels[action]}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Busy notice shown when Ferraz is deep in focused forging
// ----------------------------------------------------------------------------

function FerrazBusyBanner() {
  return (
    <div className="px-4 py-1.5 bg-red-900/30 border-b border-red-800/50 text-xs text-red-300 flex items-center gap-1.5">
      <span>🔨</span>
      <span>Ferraz está forjando — respostas curtas agora</span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main FerrazDialogue component
// ----------------------------------------------------------------------------

/**
 * FerrazDialogue renders a dialogue panel tailored to Ferraz the blacksmith.
 *
 * It wraps the generic dialogue system and adds:
 *  - Blacksmith-themed UI (forge-glow amber/orange colour scheme)
 *  - Contextual greeting injected when dialogue opens
 *  - "Busy forging" banner during active forge hours (9–12, 16–20)
 *  - Action hint strip for tool upgrades / ore smelting
 */
export function FerrazDialogue() {
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

  // Only render when Ferraz is the active NPC
  const isActive = npcId === FERRAZ_NPC_ID;

  // Auto-focus input when Ferraz's dialogue opens
  useEffect(() => {
    if (isActive) {
      setDraft('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isActive]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, pending]);

  // Keyboard: Escape closes dialogue
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, close]);

  if (!isActive) return null;

  const npc = npcs[FERRAZ_NPC_ID];
  if (!npc) return null;

  const busy = isFerrazBusy(hour);
  const greeting = getContextualGreeting(hour);

  // Derive action hint from the most recent NPC turn
  const lastNpcTurn = [...history].reverse().find((t) => t.who === 'npc');
  let actionHint: FerrazAction = null;
  if (lastNpcTurn) {
    const text = lastNpcTurn.text.toLowerCase();
    if (text.includes('ferramenta') || text.includes('melhorar') || text.includes('upgrade')) {
      actionHint = 'upgrade_tool';
    } else if (text.includes('minério') || text.includes('fundir') || text.includes('forja')) {
      actionHint = 'smelt_ore';
    } else if (text.includes('vend') || text.includes('comprar') || text.includes('loja')) {
      actionHint = 'buy_tools';
    }
  }

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
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-orange-800/70 rounded-2xl shadow-xl text-slate-100"
      data-testid="ferraz-dialogue"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-orange-800/50 bg-orange-950/30 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-lg" aria-hidden>
            🔨
          </span>
          <div>
            <h2 className="text-lg font-bold text-orange-100">{npc.def.name}</h2>
            <p className="text-xs text-orange-400 capitalize">{npc.def.role}</p>
          </div>
        </div>
        <button
          onClick={close}
          className="text-slate-400 hover:text-slate-200 text-sm"
          title="Fechar (Esc)"
          aria-label="Fechar diálogo"
        >
          ✕
        </button>
      </header>

      {/* Busy banner */}
      {busy && <FerrazBusyBanner />}

      {/* Message history */}
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {/* Show contextual greeting when history is empty */}
        {history.length === 0 && !pending && (
          <p className="text-orange-300/70 italic">{greeting}</p>
        )}

        {history.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.who === 'player' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl ${
                turn.who === 'player'
                  ? 'bg-amber-600 text-slate-900'
                  : 'bg-slate-800 text-slate-100 border border-orange-800/30'
              }`}
            >
              {turn.text}
              {turn.who === 'npc' && turn.emotion && (
                <div className="text-[10px] text-orange-400 mt-1">— {turn.emotion}</div>
              )}
            </div>
          </div>
        ))}

        {pending && <p className="text-orange-400/60 italic text-xs">🔥 Ferraz está pensando…</p>}
        {error && <p className="text-rose-400 text-xs">erro: {error}</p>}
      </div>

      {/* Action hint strip */}
      <FerrazActionHint action={actionHint} />

      {/* Input form */}
      <form onSubmit={onSubmit} className="flex gap-2 px-3 py-2 border-t border-orange-800/50">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={busy ? 'Seja breve…' : 'Fale com Ferraz…'}
          disabled={pending}
          className="flex-1 bg-slate-800 border border-orange-800/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="bg-orange-600 hover:bg-orange-500 text-slate-100 px-3 py-2 rounded text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
