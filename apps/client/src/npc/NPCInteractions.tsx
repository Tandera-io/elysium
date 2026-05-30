import { useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { getGreetings, getTopics } from '../dialogue/DialogueManager';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';
import { useNpcStore, friendshipTier, type FriendshipTier } from '../systems/npc/npcStore';

export const HUB_NPC_IDS = ['dorinha', 'padre_pedro', 'nina', 'arnaldo', 'sofia', 'romeu'] as const;
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
};

/**
 * Picks the most contextually appropriate greeting subset based on friendship tier.
 *
 * - stranger / acquaintance: first two greetings (introductory, transactional)
 * - friend: all greetings
 * - close_friend: all greetings, with a "close friend" prefix chip added
 */
function tierFilteredGreetings(
  greetings: { label: string; input: string }[],
  tier: FriendshipTier,
): { label: string; input: string }[] {
  if (tier === 'stranger') return greetings.slice(0, 2);
  if (tier === 'acquaintance') return greetings.slice(0, 3);
  return greetings; // friend / close_friend see all options
}

/**
 * Quick-reply chip panel for the 6 hub NPCs.
 * Renders greeting chips and topic-group buttons when dialogue is active
 * with any hub NPC. Mount once in App.tsx.
 *
 * Now also:
 * - Filters greeting chips by friendship tier (strangers see fewer options).
 * - Shows a task offer chip when the NPC has an available task.
 * - Shows an "accept task" confirmation row when a task is shown.
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
  const [showTaskOffer, setShowTaskOffer] = useState(false);

  // Friendship data for the current NPC.
  const npcEntry = useNpcStore((s) => (npcId ? s.npcs[npcId] : undefined));
  const acceptTask = useNpcStore((s) => s.acceptTask);
  const social = npcEntry?.social;
  const tier: FriendshipTier = social ? friendshipTier(social.friendshipLevel) : 'stranger';
  const pendingTask = social?.pendingTask ?? null;
  const hasAvailableTask = pendingTask?.status === 'available';
  const hasAcceptedTask = pendingTask?.status === 'accepted';

  if (!npcId || !(HUB_NPC_IDS as readonly string[]).includes(npcId)) return null;

  const allGreetings = getGreetings(npcId);
  const greetings = tierFilteredGreetings(allGreetings, tier);
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
    setShowTaskOffer(false);
  };

  const handleAcceptTask = () => {
    acceptTask(npcId);
    // Let the NPC "speak" the task description so it appears in the dialogue history.
    void send(`Aceitar tarefa: ${pendingTask?.description ?? ''}`, world);
    setShowTaskOffer(false);
  };

  return (
    <div className="absolute bottom-[220px] left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] flex flex-col gap-2 pointer-events-none">
      {/* Topic sub-chip row */}
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
            className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 text-xs px-2 py-1.5 rounded-full transition-colors pointer-events-auto"
          >
            ✕
          </button>
        </div>
      )}

      {/* Task offer confirmation row */}
      {showTaskOffer && hasAvailableTask && pendingTask && (
        <div className="bg-slate-900/90 border border-yellow-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 flex flex-col gap-1.5 pointer-events-auto">
          <div className="text-yellow-300 font-semibold">Tarefa oferecida</div>
          <div>{pendingTask.description}</div>
          <div className="text-emerald-300">Recompensa: {pendingTask.reward}</div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleAcceptTask}
              disabled={pending}
              className="bg-yellow-500/80 hover:bg-yellow-400 text-slate-900 text-xs font-medium px-3 py-1 rounded-full transition-colors disabled:opacity-50"
            >
              Aceitar
            </button>
            <button
              onClick={() => setShowTaskOffer(false)}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs px-3 py-1 rounded-full transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      )}

      {/* Main chip row */}
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

        {/* Task chip — shown when an available task exists and it has not been shown yet */}
        {hasAvailableTask && !showTaskOffer && (
          <button
            onClick={() => setShowTaskOffer(true)}
            disabled={pending}
            className="bg-yellow-600/90 hover:bg-yellow-500 text-slate-100 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 border border-yellow-400/50"
          >
            ! Tarefa
          </button>
        )}

        {/* Accepted-task reminder chip */}
        {hasAcceptedTask && pendingTask && (
          <span className="bg-slate-700/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-full">
            Tarefa em curso
          </span>
        )}

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
