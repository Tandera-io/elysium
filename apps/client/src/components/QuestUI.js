// apps/client/src/components/QuestUI.js
//
// QuestUI — floating banner that surfaces quest-ready notifications.
//
// Distinct from ui/QuestPanel.tsx (the full sidebar panel).
// This component renders a small centered banner whenever an active quest
// reaches 'ready_to_turn_in' status so the player knows to revisit the NPC.
//
// Mount once in the component tree alongside NPCDialog:
//   <QuestUI />
//
// The banner auto-dismisses after DISMISS_MS and can be manually closed.

import { useState, useEffect, useRef } from 'react';
import { useQuestStore } from '../systems/quest/questStore';
import { useNpcStore } from '../systems/npc/npcStore';

const DISMISS_MS = 6000;

/**
 * QuestUI — auto-dismissing quest-ready notification banner.
 *
 * Watches for quests that transition to 'ready_to_turn_in' and shows a
 * brief banner prompting the player to return to the quest giver.
 */
export function QuestUI() {
  const active = useQuestStore((s) => s.active);
  const npcs = useNpcStore((s) => s.npcs);
  const [shownIds, setShownIds] = useState(new Set());
  const [banner, setBanner] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const readyQuests = Object.values(active).filter(
      (q) => q.status === 'ready_to_turn_in' && !shownIds.has(q.id),
    );
    if (readyQuests.length === 0) return;

    const q = readyQuests[0];
    const npc = npcs[q.giverNpcId];
    const npcName = npc?.def?.name ?? q.giverNpcId;

    setShownIds((prev) => new Set([...prev, q.id]));
    setBanner({ quest: q, npcName });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBanner(null), DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]); // shownIds intentionally excluded — we track it via setState to avoid circular updates

  if (!banner) return null;

  const { quest, npcName } = banner;

  return (
    <div
      className="absolute top-24 left-1/2 -translate-x-1/2 bg-emerald-900/95 backdrop-blur border border-emerald-600 rounded-2xl shadow-xl text-slate-100 pointer-events-auto cursor-pointer"
      style={{ zIndex: 45 }}
      role="alert"
      aria-live="polite"
      onClick={() => setBanner(null)}
    >
      <div className="px-5 py-3 flex items-center gap-3">
        <span className="text-2xl">📋</span>
        <div>
          <div className="text-sm font-bold text-emerald-300">Missão pronta!</div>
          <div className="text-xs text-slate-300">
            Volte para <span className="font-semibold text-slate-100">{npcName}</span> com{' '}
            {quest.quantity}× {quest.item}
          </div>
          <div className="text-xs text-amber-300 mt-0.5">+{quest.rewardCash} moedas</div>
        </div>
        <button
          className="ml-2 text-emerald-500 hover:text-emerald-300 text-xs"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/70 rounded-b-2xl"
        style={{
          width: '100%',
          animation: `shrink-quest ${DISMISS_MS}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes shrink-quest {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export default QuestUI;
