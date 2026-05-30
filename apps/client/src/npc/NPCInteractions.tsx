import { useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { getGreetings, getTopics } from '../dialogue/DialogueManager';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';

export const HUB_NPC_IDS = [
  'marina',
  'bento',
  'lucia',
  'dorinha',
  'padre_pedro',
  'nina',
  'arnaldo',
  'sofia',
  'romeu',
] as const;
export type HubNpcId = (typeof HUB_NPC_IDS)[number];

const TOPIC_LABELS: Record<string, string> = {
  general: 'Geral',
  guidance: 'Conselho',
  woodwork: 'Marcenaria',
  remedies: 'Remédios',
  fish: 'Peixe',
  tools: 'Ferramentas',
  seeds: 'Sementes',
  selling: 'Vender',
  baking: 'Padaria',
  farming: 'Lavoura',
  animals: 'Animais',
  quests: 'Missões',
  info: 'Conversa',
};

/**
 * Quick-reply chip panel for the 6 hub NPCs.
 * Renders greeting chips and topic-group buttons when dialogue is active
 * with any hub NPC. Mount once in App.tsx.
 */
export function NPCInteractions() {
  const npcId = useDialogueStore((s) => s.npcId);
  const pending = useDialogueStore((s) => s.pending);
  const send = useDialogueStore((s) => s.send);
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  if (!npcId || !(HUB_NPC_IDS as readonly string[]).includes(npcId)) return null;

  const greetings = getGreetings(npcId);
  const topics = getTopics(npcId);
  const topicKeys = Object.keys(topics);

  const world = {
    hour,
    dayInSeason,
    season: currentSeason({ seasonIndex } as Parameters<typeof currentSeason>[0]),
    year,
  };

  const handleQuickReply = (input: string) => {
    if (pending) return;
    void send(input, world);
    setOpenTopic(null);
  };

  return (
    <div className="absolute bottom-[220px] left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] flex flex-col gap-2 pointer-events-none">
      {openTopic !== null && topics[openTopic] !== undefined && (
        <div className="flex flex-wrap gap-1.5 justify-center pointer-events-auto">
          {topics[openTopic]!.map((reply) => (
            <button
              key={reply.input}
              onClick={() => handleQuickReply(reply.input)}
              disabled={pending}
              className="bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {reply.label}
            </button>
          ))}
          <button
            onClick={() => setOpenTopic(null)}
            className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 text-xs px-2 py-1.5 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 justify-center pointer-events-auto">
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
            onClick={() => setOpenTopic(openTopic === key ? null : key)}
            disabled={pending}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
              openTopic === key
                ? 'bg-slate-600 border-slate-500 text-slate-100'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-300'
            }`}
          >
            {TOPIC_LABELS[key] ?? key} ▾
          </button>
        ))}
      </div>
    </div>
  );
}
