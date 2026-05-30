import { useEffect, useState } from 'react';
import { useDialogueStore } from '../dialogue/dialogueStore';
import { usePlayerStore } from '../../store/playerStore';
import { findInteractTarget } from './interaction';
import { useNpcStore, friendshipTier, type FriendshipTier } from './npcStore';
import { useNPCShopStore, DORINHA_SHOP_ID, NINA_SHOP_ID } from './NPCShop';

const SHOP_NPCS = new Set([DORINHA_SHOP_ID, NINA_SHOP_ID]);

/** Human-readable Portuguese labels for each friendship tier. */
const TIER_LABELS: Record<FriendshipTier, string> = {
  stranger: 'Desconhecido',
  acquaintance: 'Conhecido',
  friend: 'Amigo',
  close_friend: 'Amigo Próximo',
};

/** Tailwind colour classes for the friendship tier badge. */
const TIER_COLOURS: Record<FriendshipTier, string> = {
  stranger: 'text-slate-400',
  acquaintance: 'text-sky-300',
  friend: 'text-emerald-300',
  close_friend: 'text-amber-300',
};

/**
 * Watches player position vs NPCs and shows a small "Press E to talk / G for shop"
 * prompt when in range. Also wires the E key to open dialogue and G to open shop.
 *
 * Now also displays:
 * - Friendship tier badge for the nearby NPC.
 * - "Ocupado" cooldown notice when the NPC is in post-conversation cooldown.
 * - Task indicator when the NPC has an available task for the player.
 */
export function InteractPrompt() {
  const npcs = useNpcStore((s) => s.npcs);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  // Re-render periodically so the cooldown display stays up to date.
  const [, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const pos = usePlayerStore.getState().position;
      const t = findInteractTarget({ x: pos.x, z: pos.z }, npcs);
      if (t) {
        if (target?.id !== t.def.id) setTarget({ id: t.def.id, name: t.def.name });
      } else {
        if (target !== null) setTarget(null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [npcs, target]);

  // Tick every second so cooldown countdown updates without a full re-render loop.
  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const pos = usePlayerStore.getState().position;
      const t = findInteractTarget({ x: pos.x, z: pos.z }, useNpcStore.getState().npcs);
      if (!t) return;

      if (e.code === 'KeyE') {
        if (useDialogueStore.getState().npcId) return; // already open
        // Respect post-conversation cooldown — block dialogue if NPC is busy.
        if (t.social.cooldownUntilMs > Date.now()) return;
        useDialogueStore.getState().open(t.def.id);
      }

      if (e.code === 'KeyG') {
        if (!SHOP_NPCS.has(t.def.id)) return;
        const shopStore = useNPCShopStore.getState();
        if (shopStore.openShopId) {
          shopStore.closeShop();
        } else {
          shopStore.openShop(t.def.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!target) return null;

  const isShopkeeper = SHOP_NPCS.has(target.id);
  const entry = npcs[target.id];
  const social = entry?.social;
  const now = Date.now();
  const isBusy = social ? social.cooldownUntilMs > now : false;
  const cooldownSecsLeft = social ? Math.ceil((social.cooldownUntilMs - now) / 1000) : 0;
  const tier = social ? friendshipTier(social.friendshipLevel) : 'stranger';
  const hasAvailableTask = social?.pendingTask != null && social.pendingTask.status === 'available';

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      {/* NPC name + friendship tier */}
      <div className="flex items-center gap-2">
        <span className="font-semibold">{target.name}</span>
        <span className={`text-xs ${TIER_COLOURS[tier]}`}>{TIER_LABELS[tier]}</span>
        {social && <span className="text-xs text-slate-500">{social.friendshipLevel}/10</span>}
      </div>

      {/* Task available indicator */}
      {hasAvailableTask && <div className="text-xs text-yellow-300">! Tarefa disponível</div>}

      {/* Interaction key hints */}
      {isBusy ? (
        <div className="text-xs text-slate-400">Ocupado ({cooldownSecsLeft}s)</div>
      ) : (
        <div>
          <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">E</kbd> conversar
          com <span className="font-semibold">{target.name}</span>
        </div>
      )}

      {isShopkeeper && (
        <div>
          <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">G</kbd>{' '}
          <span className="text-amber-300">abrir loja</span>
        </div>
      )}
    </div>
  );
}
