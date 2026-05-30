/**
 * NPCDialogue.tsx
 *
 * Reusable NPC dialogue panel component.
 *
 * Features:
 * - Shows a personality-driven greeting line on open (from npc-dialogue.ts data)
 * - Renders quick-reply greeting chips and topic-group buttons
 * - Delegates full chat to DialogueBox (via useDialogueStore)
 * - Works for all 6 hub NPCs: Dorinha, Padre Pedro, Nina, Arnaldo, Sofia, Romeu
 *
 * Usage:
 *   <NPCDialogue npcId="dorinha" />
 *
 * Mount one per visible NPC, or use the <NPCDialoguePanel /> convenience
 * wrapper which auto-selects from the active dialogue store npcId.
 */

import { useEffect, useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { getGreetings, getTopics } from '../dialogue/DialogueManager';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';
import {
  pickRandomDialogueLine,
  NPC_DIALOGUE_REGISTRY,
  type DialogueContext,
  type NpcDialogueData,
} from '../data/npc-dialogue';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NPCDialogueProps {
  /** NPC identifier (e.g. 'dorinha', 'padre_pedro'). */
  npcId: string;
  /** Optional override for the displayed NPC name. Defaults to data registry name. */
  displayName?: string;
  /** Optional override for the displayed role label. Defaults to data registry role. */
  displayRole?: string;
  /** Called when the player closes this dialogue panel. */
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Season → dialogue context mapping
// ---------------------------------------------------------------------------

function seasonToContext(season: string): DialogueContext {
  const s = season.toLowerCase();
  if (s.includes('prim') || s === 'spring') return 'seasonal_spring';
  if (s.includes('ver') || s === 'summer') return 'seasonal_summer';
  if (s.includes('out') || s === 'autumn' || s === 'fall') return 'seasonal_autumn';
  if (s.includes('inv') || s === 'winter') return 'seasonal_winter';
  return 'daily';
}

// ---------------------------------------------------------------------------
// HeartLevel context helper
// ---------------------------------------------------------------------------

function heartContext(heartLevel: number): DialogueContext | null {
  if (heartLevel >= 5) return 'heart_5';
  if (heartLevel >= 3) return 'heart_3';
  if (heartLevel >= 1) return 'heart_1';
  return null;
}

// ---------------------------------------------------------------------------
// NPCDialogue component
// ---------------------------------------------------------------------------

/**
 * Self-contained NPC dialogue panel. Shows a greeting line,
 * quick-reply chips, and dispatches messages via useDialogueStore.
 *
 * Does NOT render the full chat history — that is handled by DialogueBox.
 * This component is specifically the "intro + quick replies" layer.
 */
export function NPCDialogue({ npcId, displayName, displayRole, onClose }: NPCDialogueProps) {
  const send = useDialogueStore((s) => s.send);
  const pending = useDialogueStore((s) => s.pending);
  const close = useDialogueStore((s) => s.close);

  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  const [openTopicKey, setOpenTopicKey] = useState<string | null>(null);
  const [greetingLine, setGreetingLine] = useState<string>('');

  const npcData: NpcDialogueData | undefined = NPC_DIALOGUE_REGISTRY[npcId];
  const greetings = getGreetings(npcId);
  const topics = getTopics(npcId);
  const topicKeys = Object.keys(topics);

  const season = currentSeason({ seasonIndex } as Parameters<typeof currentSeason>[0]);

  // Pick a greeting line on mount — prefer heart context, fall back to seasonal or daily
  useEffect(() => {
    if (!npcData) return;
    // Determine context priority: heart > seasonal > daily
    const hCtx = heartContext(0); // future: pass heartLevel from npc store
    const sCtx = seasonToContext(season);
    const ctx: DialogueContext = hCtx ?? sCtx;
    setGreetingLine(pickRandomDialogueLine(npcId, ctx));
  }, [npcId, season, npcData]);

  const world = { hour, dayInSeason, season, year };

  const handleQuickReply = (input: string) => {
    if (pending) return;
    void send(input, world);
    setOpenTopicKey(null);
  };

  const handleClose = () => {
    close();
    onClose?.();
  };

  if (!npcData) return null;

  const name = displayName ?? npcData.name;
  const role = displayRole ?? npcData.role;

  return (
    <div className="flex flex-col gap-3 w-full" role="region" aria-label={`Diálogo com ${name}`}>
      {/* NPC identity strip */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-base font-bold text-slate-100">{name}</span>
          <span className="ml-2 text-xs text-slate-400 capitalize">{role}</span>
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

      {/* Personality greeting line */}
      {greetingLine && (
        <p className="text-sm text-slate-300 italic leading-relaxed border-l-2 border-amber-500/60 pl-3">
          {greetingLine}
        </p>
      )}

      {/* Topic chip tray (expanded sub-list) */}
      {openTopicKey !== null && topics[openTopicKey] !== undefined && (
        <div className="flex flex-wrap gap-1.5">
          {topics[openTopicKey]!.map((reply) => (
            <button
              key={reply.input}
              onClick={() => handleQuickReply(reply.input)}
              disabled={pending}
              className="bg-slate-700/90 hover:bg-slate-600 border border-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {reply.label}
            </button>
          ))}
          <button
            onClick={() => setOpenTopicKey(null)}
            className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 text-xs px-2 py-1.5 rounded-full transition-colors"
            aria-label="Fechar tópicos"
          >
            ✕
          </button>
        </div>
      )}

      {/* Greetings + topic group toggles */}
      <div className="flex flex-wrap gap-1.5">
        {greetings.map((reply) => (
          <button
            key={reply.input}
            onClick={() => handleQuickReply(reply.input)}
            disabled={pending}
            className="bg-amber-500/90 hover:bg-amber-400 text-slate-900 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            {reply.label}
          </button>
        ))}

        {topicKeys.map((key) => (
          <button
            key={key}
            onClick={() => setOpenTopicKey(openTopicKey === key ? null : key)}
            disabled={pending}
            aria-expanded={openTopicKey === key}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
              openTopicKey === key
                ? 'bg-slate-600 border-slate-500 text-slate-100'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-300'
            }`}
          >
            {TOPIC_LABEL_MAP[key] ?? key} ▾
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NPCDialoguePanel — auto-selects npcId from the store
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper: renders NPCDialogue for whichever NPC is currently
 * active in the dialogue store. Returns null when no dialogue is open or
 * when the active NPC is not a hub NPC tracked in NPC_DIALOGUE_REGISTRY.
 *
 * Mount once in App.tsx alongside DialogueBox.
 */
export function NPCDialoguePanel() {
  const npcId = useDialogueStore((s) => s.npcId);
  if (!npcId || !NPC_DIALOGUE_REGISTRY[npcId]) return null;
  return <NPCDialogue npcId={npcId} />;
}

// ---------------------------------------------------------------------------
// Label map (matches NPCInteractions.tsx TOPIC_LABELS)
// ---------------------------------------------------------------------------

const TOPIC_LABEL_MAP: Record<string, string> = {
  general: 'Geral',
  guidance: 'Conselho',
  woodwork: 'Marcenaria',
  remedies: 'Remédios',
  fish: 'Peixe',
  tools: 'Ferramentas',
  seeds: 'Sementes',
  selling: 'Vender',
};
