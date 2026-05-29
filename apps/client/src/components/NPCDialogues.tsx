/**
 * NPCDialogues — Stardew Valley-style dialogue with predefined choice buttons.
 *
 * Opens when a player interacts with an NPC via the dialogue store (key E).
 * Uses the static dialogue trees in npcDialogueData.ts for known NPCs
 * (especially Dorinha). Returns null for NPCs without a static tree so the
 * existing <DialogueBox /> (free-form chat) can handle them instead.
 *
 * Wired into App.tsx alongside the existing <DialogueBox />.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { getDialogueNode, getStartNode, type DialogueNode } from '../data/npcDialogueData';

// ── Sub-components ────────────────────────────────────────────────────────────

/** Portrait letter-badge shown in the dialogue header. */
function NpcAvatar({ name }: { name: string }) {
  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-lg select-none">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/** A single predefined-choice button. */
function ChoiceButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-900 text-slate-100 text-sm transition-colors border border-slate-700 hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
    >
      ▶ {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Stardew-style NPC dialogue component.
 *
 * Only renders when a dialogue is open AND the NPC has a static dialogue tree.
 * Returns null otherwise — the existing <DialogueBox> covers free-form NPCs.
 */
export function NPCDialogues() {
  const npcId = useDialogueStore((s) => s.npcId);
  const close = useDialogueStore((s) => s.close);
  const npcs = useNpcStore((s) => s.npcs);

  const [currentNode, setCurrentNode] = useState<DialogueNode | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // When npcId changes, reset to the start node for that NPC (or null if none).
  useEffect(() => {
    if (!npcId) {
      setCurrentNode(null);
      setDisplayedText('');
      return;
    }
    const node = getStartNode(npcId);
    setCurrentNode(node);
  }, [npcId]);

  // Typewriter effect whenever the current node changes.
  useEffect(() => {
    if (!currentNode) return;
    const fullText = currentNode.text;
    setDisplayedText('');
    setIsTyping(true);

    clearInterval(typeTimerRef.current);
    let i = 0;
    typeTimerRef.current = setInterval(() => {
      i += 1;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(typeTimerRef.current);
        setIsTyping(false);
      }
    }, 22); // ~22 ms per character ≈ Stardew pacing

    return () => clearInterval(typeTimerRef.current);
  }, [currentNode]);

  /** Skip the typewriter animation and show full text instantly. */
  const skipTypewriter = useCallback(() => {
    if (isTyping && currentNode) {
      clearInterval(typeTimerRef.current);
      setDisplayedText(currentNode.text);
      setIsTyping(false);
    }
  }, [isTyping, currentNode]);

  // Keyboard: Escape closes, Space/Enter skips typewriter.
  useEffect(() => {
    if (!npcId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === ' ' || e.key === 'Enter') skipTypewriter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close, skipTypewriter]);

  // Only handle NPCs with a static dialogue tree.
  if (!npcId || !currentNode) return null;
  const npc = npcs[npcId];
  if (!npc) return null;

  /** Advance to the next dialogue node, or close if next is null. */
  const handleChoice = (nextId: string | null) => {
    if (nextId === null) {
      close();
      return;
    }
    const next = getDialogueNode(npcId, nextId);
    if (!next) {
      close();
      return;
    }
    setCurrentNode(next);
  };

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[680px] max-w-[95vw] bg-slate-900/98 backdrop-blur border-2 border-amber-500/60 rounded-2xl shadow-2xl text-slate-100 select-none"
      onClick={skipTypewriter}
      role="dialog"
      aria-modal="true"
      aria-label={`Diálogo com ${npc.def.name}`}
    >
      {/* ── Header: NPC name + role ── */}
      <header className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-slate-700">
        <NpcAvatar name={npc.def.name} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold leading-tight">{npc.def.name}</h2>
          <p className="text-xs text-amber-400/80 truncate">{npc.def.role}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="text-slate-500 hover:text-slate-200 text-sm px-1"
          title="Fechar (Esc)"
          aria-label="Fechar diálogo"
        >
          ✕
        </button>
      </header>

      {/* ── Dialogue text with typewriter effect ── */}
      <div className="px-5 py-4 min-h-[72px]">
        <p className="text-sm leading-relaxed text-slate-100">
          {displayedText}
          {isTyping && <span className="animate-pulse text-amber-400 ml-0.5">▌</span>}
        </p>
        {isTyping && (
          <p className="text-[10px] text-slate-500 mt-1">(Clique ou pressione Espaço para pular)</p>
        )}
      </div>

      {/* ── Choice buttons (shown only when typewriter is done) ── */}
      {!isTyping && currentNode.choices.length > 0 && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {currentNode.choices.map((choice, idx) => (
            <ChoiceButton
              key={idx}
              label={choice.label}
              onClick={(e?: React.MouseEvent) => {
                e?.stopPropagation();
                handleChoice(choice.next);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
