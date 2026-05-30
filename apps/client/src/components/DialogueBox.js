/**
 * components/DialogueBox.js — Composable NPC dialogue box component.
 *
 * Renders a dialogue panel with:
 *   - NPC name + role header
 *   - NPC text (current dialogue line)
 *   - Response option buttons (when choices are available)
 *   - Free-text input form (fallback when no choices are defined)
 *   - Close button / Escape key handler
 *
 * Reads open/close state and choices from useDialogueBoxStore (stores/dialogueStore.js).
 * Reads chat history and send() from the existing useDialogueStore
 * (systems/dialogue/dialogueStore) so both stores stay in sync.
 * Reads NPC definitions from useNpcStore (systems/npc/npcStore).
 *
 * This component is intentionally separate from NPCDialogue.jsx so it can be
 * used as a lightweight drop-in where full chip-bar functionality isn't needed.
 *
 * Mount once in App.tsx (or alongside NPCDialogue) — it renders nothing when
 * the store's `open` flag is false.
 */

import { useEffect, useRef, useState } from 'react';
import { useDialogueBoxStore } from '../stores/dialogueStore.js';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DialogueBox
 *
 * Standalone dialogue panel driven by useDialogueBoxStore.
 * Renders nothing when open === false or when the NPC is not found in
 * useNpcStore.
 *
 * When the store has choices, they are rendered as option buttons.
 * When choices is empty, a free-text input + send button is shown instead,
 * delegating to the chat-history store (useDialogueStore.send).
 */
export function DialogueBox() {
  // ── DialogueBox store ────────────────────────────────────────────────────
  const open = useDialogueBoxStore((s) => s.open);
  const npcId = useDialogueBoxStore((s) => s.npcId);
  const text = useDialogueBoxStore((s) => s.text);
  const choices = useDialogueBoxStore((s) => s.choices);
  const storePending = useDialogueBoxStore((s) => s.pending);
  const storeError = useDialogueBoxStore((s) => s.error);
  const closeDialogue = useDialogueBoxStore((s) => s.closeDialogue);
  const advanceTo = useDialogueBoxStore((s) => s.advanceTo);

  // ── Chat-history store (TypeScript layer) ────────────────────────────────
  const chatHistory = useDialogueStore((s) => s.history);
  const chatPending = useDialogueStore((s) => s.pending);
  const chatError = useDialogueStore((s) => s.error);
  const chatClose = useDialogueStore((s) => s.close);
  const chatOpen = useDialogueStore((s) => s.open);
  const send = useDialogueStore((s) => s.send);

  // ── World context for send() ─────────────────────────────────────────────
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  // ── NPC definitions ──────────────────────────────────────────────────────
  const npcs = useNpcStore((s) => s.npcs);

  // ── Local state ──────────────────────────────────────────────────────────
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const pending = storePending || chatPending;
  const error = storeError || chatError;
  const hasChoices = choices.length > 0;

  // Focus input when opening in free-text mode.
  useEffect(() => {
    if (open && !hasChoices) {
      setDraft('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, hasChoices]);

  // Auto-scroll chat history to bottom.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, pending]);

  // Escape key closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Sync chat-history store when this box opens with a new NPC.
  useEffect(() => {
    if (open && npcId) {
      chatOpen(npcId);
    }
  }, [open, npcId, chatOpen]);

  // Guard: do not render when closed or NPC unknown.
  if (!open || !npcId) return null;
  const npc = npcs[npcId];
  if (!npc) return null;

  function handleClose() {
    closeDialogue();
    chatClose();
    setDraft('');
  }

  function handleChoice(choice) {
    if (pending) return;
    if (choice.next === null) {
      // Terminal choice — close dialogue.
      handleClose();
      return;
    }
    // Advance to next node text via the store's advanceTo.
    // Callers that own the dialogue tree can subscribe to npcId+nodeId changes
    // and push the next node's text/choices into the store.
    advanceTo(`…`, []);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim() || pending) return;
    const world = {
      hour,
      dayInSeason,
      season: currentSeason({ seasonIndex }),
      year,
    };
    void send(draft, world);
    setDraft('');
  }

  return (
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] flex flex-col bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={`Dialogue with ${npc.def.name}`}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {/* NPC avatar initial */}
          <div
            className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-lg font-bold select-none"
            aria-hidden="true"
          >
            {npc.def.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">{npc.def.name}</h2>
            <p className="text-[11px] text-slate-400 leading-tight capitalize">{npc.def.role}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-slate-200 text-sm px-1"
          title="Fechar (Esc)"
          aria-label="Fechar diálogo"
        >
          ✕
        </button>
      </header>

      {/* ── NPC text line ────────────────────────────────────────────────────── */}
      {text && (
        <div className="px-4 pt-3 pb-1">
          <p className="bg-slate-800 text-slate-100 rounded-xl px-3 py-2 text-sm leading-relaxed">
            {text}
          </p>
        </div>
      )}

      {/* ── Chat history (free-text mode) ─────────────────────────────────── */}
      {!hasChoices && (
        <div ref={scrollRef} className="max-h-[240px] overflow-y-auto px-4 py-3 space-y-2 text-sm">
          {chatHistory.length === 0 && !pending && !text && (
            <p className="text-slate-500 italic text-center py-4">Diga olá para {npc.def.name}…</p>
          )}

          {chatHistory.map((turn, i) => (
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
        </div>
      )}

      {/* ── Choice buttons ────────────────────────────────────────────────── */}
      {hasChoices && (
        <div className="px-4 py-3 flex flex-col gap-2">
          {choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice)}
              disabled={pending}
              className="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500/60 text-slate-200 text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Error display ────────────────────────────────────────────────── */}
      {error && <p className="px-4 pb-2 text-rose-400 text-xs text-center">erro: {error}</p>}

      {/* ── Free-text input (shown only when no choices) ─────────────────── */}
      {!hasChoices && (
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
      )}
    </div>
  );
}

export default DialogueBox;
