/**
 * NPCDialogue — quick-reply button panel that appears during dialogue.
 *
 * Reads the active NPC from the dialogue store and renders greeting chips
 * and topic-grouped buttons from DialogueManager. Clicking a chip sends the
 * pre-filled message directly via the dialogue store.
 */

import { useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';
import { getGreetings, getTopics } from '../dialogue/DialogueManager';

const TOPIC_LABELS: Record<string, string> = {
  general: 'Geral',
  upgrades: 'Upgrades',
  crafting: 'Forja',
  tools: 'Ferramentas',
  seeds: 'Sementes',
  selling: 'Vender',
};

export function NPCDialogue() {
  const npcId = useDialogueStore((s) => s.npcId);
  const pending = useDialogueStore((s) => s.pending);
  const send = useDialogueStore((s) => s.send);
  const npcs = useNpcStore((s) => s.npcs);
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  const [openTopic, setOpenTopic] = useState<string | null>(null);

  if (!npcId) return null;
  const npc = npcs[npcId];
  if (!npc) return null;

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
      {/* Topic drawer — appears when a topic group is open */}
      {openTopic && topics[openTopic] && (
        <div className="flex flex-wrap gap-1.5 justify-center pointer-events-auto">
          {topics[openTopic].map((reply) => (
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

      {/* Quick-reply bar — greetings + topic group toggles */}
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

export default NPCDialogue;
