/**
 * NPCDialogue.jsx — React component for the NPC dialogue UI.
 *
 * Renders:
 *   - Speaker name + role header
 *   - Scrollable chat history (player/NPC bubbles)
 *   - Quick-reply greeting chips and expandable topic chips
 *   - Free-text input form (same flow as DialogueBox.tsx)
 *   - Escape / close button
 *
 * Reads dialogue history and send() from dialogueStore.
 * Reads NPC chip definitions from useNpcDialogueStore (stores/npc.js).
 * Reads NPC world defs from useNpcStore (systems/npc/npcStore.ts).
 *
 * Mount once in App.tsx alongside the existing DialogueBox (ui/DialogueBox.tsx).
 * It only renders when activeNpcId is set in useNpcDialogueStore.
 *
 * For a lighter standalone variant without chip-bar functionality, see
 * components/DialogueBox.js, which is driven by stores/dialogueStore.js.
 */

import { useEffect, useRef, useState } from 'react';
import { useNpcDialogueStore } from '../stores/npc.js';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';
import { useGameStateStore } from '../stores/gameState.js';
import { getGreetings, getTopics } from '../dialogue/DialogueManager';

// ─── Topic display labels ──────────────────────────────────────────────────────

const TOPIC_LABELS = {
  general: 'Geral',
  upgrades: 'Melhorias',
  crafting: 'Forja',
  seasonal: 'Temporada',
  farm_tips: 'Dicas de Fazenda',
  relationship: 'Conversa',
  weather: 'Tempo',
  guidance: 'Conselho',
  woodwork: 'Marcenaria',
  remedies: 'Remédios',
  fish: 'Pesca',
  tools: 'Ferramentas',
  seeds: 'Sementes',
  selling: 'Vender',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * NPCDialogue — full-featured dialogue panel with quick-reply chip bar.
 *
 * Reads activeNpcId from useNpcDialogueStore. If not set, renders nothing.
 * Falls back to getGreetings/getTopics from DialogueManager when the store's
 * greetings array is empty (e.g. opened via E-key without pre-loading chips).
 */
export function NPCDialogue() {
  const activeNpcId = useNpcDialogueStore((s) => s.activeNpcId);
  const storeGreetings = useNpcDialogueStore((s) => s.greetings);
  const storeTopics = useNpcDialogueStore((s) => s.topics);
  const openTopicKey = useNpcDialogueStore((s) => s.openTopicKey);
  const showQuickReplies = useNpcDialogueStore((s) => s.showQuickReplies);
  const setOpenTopic = useNpcDialogueStore((s) => s.setOpenTopic);
  const closeDialogue = useNpcDialogueStore((s) => s.closeDialogue);

  const npcId = useDialogueStore((s) => s.npcId);
  const history = useDialogueStore((s) => s.history);
  const pending = useDialogueStore((s) => s.pending);
  const error = useDialogueStore((s) => s.error);
  const closeChat = useDialogueStore((s) => s.close);
  const send = useDialogueStore((s) => s.send);

  const npcs = useNpcStore((s) => s.npcs);
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  const heartLevel = useGameStateStore((s) => s.npcRelationships[activeNpcId]?.heartLevel ?? 0);

  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Derive the active NPC: prefer the chip store's activeNpcId, fall back to
  // the dialogue store's npcId so both code-paths work.
  const effectiveNpcId = activeNpcId ?? npcId;

  // Resolve greeting/topic chips: use store values when present, otherwise
  // fall back to the DialogueManager registry.
  const greetings = storeGreetings.length > 0 ? storeGreetings : getGreetings(effectiveNpcId ?? '');
  const topics =
    Object.keys(storeTopics).length > 0 ? storeTopics : getTopics(effectiveNpcId ?? '');
  const topicKeys = Object.keys(topics);

  // Focus input on open.
  useEffect(() => {
    if (effectiveNpcId) {
      setDraft('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [effectiveNpcId]);

  // Auto-scroll chat to bottom.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, pending]);

  // Escape key closes.
  useEffect(() => {
    if (!effectiveNpcId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [effectiveNpcId, closeChat, closeDialogue, pending]);

  if (!effectiveNpcId) return null;
  const npc = npcs[effectiveNpcId];
  if (!npc) return null;

  const world = {
    hour,
    dayInSeason,
    season: currentSeason({ seasonIndex }),
    year,
  };

  function handleClose() {
    closeDialogue();
    closeChat();
  }

  function handleQuickReply(input) {
    if (pending) return;
    void send(input, world);
    setOpenTopic(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    void send(draft, world);
    setDraft('');
  }

  // Heart bar (0-10 filled hearts)
  const MAX_HEARTS = 10;

  return (
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] flex flex-col bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100"
      role="dialog"
      aria-label={`Dialogue with ${npc.def.name}`}
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {/* NPC portrait placeholder */}
          <div
            className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-lg select-none"
            aria-hidden="true"
          >
            {npc.def.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">{npc.def.name}</h2>
            <p className="text-[11px] text-slate-400 leading-tight capitalize">{npc.def.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Heart level indicator */}
          <div className="flex gap-0.5" title={`${heartLevel} / ${MAX_HEARTS} corações`}>
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <span
                key={i}
                className={`text-[10px] ${i < heartLevel ? 'text-rose-400' : 'text-slate-700'}`}
              >
                ♥
              </span>
            ))}
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-1"
            title="Fechar (Esc)"
            aria-label="Fechar diálogo"
          >
            ✕
          </button>
        </div>
      </header>

      {/* ── Chat history ─────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="max-h-[280px] overflow-y-auto px-4 py-3 space-y-2 text-sm">
        {history.length === 0 && !pending && (
          <p className="text-slate-500 italic text-center py-4">Diga olá para {npc.def.name}…</p>
        )}

        {history.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.who === 'player' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[78%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                turn.who === 'player'
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              {turn.text}
              {turn.who === 'npc' && turn.emotion && (
                <div className="text-[10px] text-slate-400 mt-1 italic">— {turn.emotion}</div>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 px-3 py-2 rounded-xl text-sm italic">
              …pensando
            </div>
          </div>
        )}

        {error && <p className="text-rose-400 text-xs text-center">erro: {error}</p>}
      </div>

      {/* ── Quick-reply chip bar ──────────────────────────────────────────────── */}
      {showQuickReplies && (greetings.length > 0 || topicKeys.length > 0) && (
        <div className="px-3 pt-1 pb-2 border-t border-slate-800 flex flex-col gap-1.5">
          {/* Sub-chips for expanded topic */}
          {openTopicKey !== null && topics[openTopicKey] && (
            <div className="flex flex-wrap gap-1.5">
              {topics[openTopicKey].map((reply) => (
                <button
                  key={reply.input}
                  onClick={() => handleQuickReply(reply.input)}
                  disabled={pending}
                  className="bg-slate-700/90 hover:bg-slate-600 border border-slate-600 text-slate-200 text-[11px] px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                >
                  {reply.label}
                </button>
              ))}
              <button
                onClick={() => setOpenTopic(null)}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 text-[11px] px-2 py-1 rounded-full transition-colors"
                aria-label="Fechar tópico"
              >
                ✕
              </button>
            </div>
          )}

          {/* Greeting chips + topic group buttons */}
          <div className="flex flex-wrap gap-1.5">
            {greetings.map((reply) => (
              <button
                key={reply.input}
                onClick={() => handleQuickReply(reply.input)}
                disabled={pending}
                className="bg-amber-500/90 hover:bg-amber-400 text-slate-900 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {reply.label}
              </button>
            ))}

            {topicKeys.map((key) => (
              <button
                key={key}
                onClick={() => setOpenTopic(key)}
                disabled={pending}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                  openTopicKey === key
                    ? 'bg-slate-600 border-slate-500 text-slate-100'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-300'
                }`}
              >
                {TOPIC_LABELS[key] ?? key} ▾
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Free-text input ───────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t border-slate-700">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Diga algo..."
          disabled={pending}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500 disabled:opacity-60"
          aria-label="Escrever mensagem"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="bg-amber-500 text-slate-900 px-3 py-2 rounded text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default NPCDialogue;
