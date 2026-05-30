// apps/client/src/components/NPCDialog.js
//
// NPCDialog — floating NPC reaction bubble for player-action-triggered dialogue.
//
// Distinct from ui/DialogueBox.tsx (which handles full AI conversations).
// This component shows a brief, auto-dismissing speech bubble whenever an NPC
// comments on a player action (harvest, plant, water, sell, gift, etc.).
//
// Mount once in the component tree (e.g. in App.tsx):
//   <NPCDialog />
//
// Trigger via notifyNpcAction() from any game system:
//   notifyNpcAction('dorinha', PLAYER_ACTIONS.HARVEST, { interactionCount: 2 });

import { useEffect, useRef } from 'react';
import { useNpcActionStore } from '../stores/npcStore';
import { useNpcStore } from '../systems/npc/npcStore';

// Duration in ms before the bubble auto-dismisses.
const AUTO_DISMISS_MS = 4000;

/**
 * NPCDialog — auto-dismissing action-triggered NPC speech bubble.
 *
 * Renders only when useNpcActionStore has an active message.
 * Automatically clears itself after AUTO_DISMISS_MS.
 */
export function NPCDialog() {
  const npcId = useNpcActionStore((s) => s.npcId);
  const message = useNpcActionStore((s) => s.message);
  const dismiss = useNpcActionStore((s) => s.dismiss);
  const npcs = useNpcStore((s) => s.npcs);

  const timerRef = useRef(null);

  // Auto-dismiss after timeout whenever a new message arrives.
  useEffect(() => {
    if (!npcId) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [npcId, message, dismiss]);

  if (!npcId || !message) return null;

  const npc = npcs[npcId];
  const name = npc?.def?.name ?? npcId;
  const role = npc?.def?.role ?? '';

  return (
    <div
      className="absolute bottom-8 right-8 max-w-xs bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100 pointer-events-none"
      style={{ zIndex: 40 }}
      role="status"
      aria-live="polite"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-amber-400">{name}</span>
          {role && <span className="text-[10px] text-slate-500">{role}</span>}
        </div>
        <p className="text-sm leading-snug text-slate-200">{message}</p>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-amber-500/60 rounded-b-2xl"
        style={{
          width: '100%',
          animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export default NPCDialog;
