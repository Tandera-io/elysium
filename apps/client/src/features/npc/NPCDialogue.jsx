import { useState } from 'react';
import { useDialogueStore } from '../../systems/dialogue/dialogueStore';
import { useTimeStore, currentSeason } from '../../systems/time/timeStore';
import marinaDialogue from '../../assets/dialogue/npc-marina.json';

const MARINA_ID = 'marina';

const TOPIC_LABELS = {
  receitas: 'Receitas',
  ingredientes: 'Ingredientes',
  conversa: 'Conversa',
};

function getTimeKey(hour) {
  if (hour >= 5 && hour < 7) return 'early_morning';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

function pickLine(lines, seed) {
  if (!lines || lines.length === 0) return null;
  return lines[seed % lines.length];
}

function getContextualGreeting(hour, season, historyLength) {
  const dialogues = marinaDialogue.dialogues;

  if (historyLength === 0) {
    return pickLine(dialogues.greeting.first_time, 0);
  }

  const timeKey = getTimeKey(hour);
  const timeLines =
    dialogues.time_of_day[timeKey] ?? dialogues.time_of_day.morning;
  const seasonLines =
    dialogues.season[season] ?? dialogues.season.spring;

  if (historyLength % 4 < 2) {
    return pickLine(timeLines, Math.floor(historyLength / 2));
  }
  return pickLine(seasonLines, Math.floor(historyLength / 4));
}

export function NPCDialogue() {
  const npcId = useDialogueStore((s) => s.npcId);
  const history = useDialogueStore((s) => s.history);
  const pending = useDialogueStore((s) => s.pending);
  const send = useDialogueStore((s) => s.send);
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);
  const [openTopic, setOpenTopic] = useState(null);

  if (npcId !== MARINA_ID) return null;

  const season = currentSeason({ seasonIndex });
  const world = { hour, dayInSeason, season, year };
  const contextualLine = getContextualGreeting(hour, season, history.length);
  const greetings = marinaDialogue.greetings ?? [];
  const topics = marinaDialogue.topics ?? {};
  const topicKeys = Object.keys(topics);

  const handleQuickReply = (input) => {
    if (pending) return;
    void send(input, world);
    setOpenTopic(null);
  };

  return (
    <div className="absolute bottom-[220px] left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] flex flex-col gap-2 pointer-events-none">
      {contextualLine && (
        <div className="flex justify-center pointer-events-none">
          <p className="bg-amber-950/80 border border-amber-700/50 text-amber-200 text-xs px-4 py-1.5 rounded-xl max-w-[520px] text-center italic">
            {contextualLine}
          </p>
        </div>
      )}

      {openTopic !== null && topics[openTopic] !== undefined && (
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
