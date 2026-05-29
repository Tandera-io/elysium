import { useEffect, useState } from 'react';
import { useDialogueStore } from '../dialogue/dialogueStore';
import { useChoiceDialogueStore } from '../dialogue/choiceDialogueStore';
import { usePlayerStore } from '../../store/playerStore';
import { findInteractTarget } from './interaction';
import { useNpcStore } from './npcStore';
import { useNPCShopStore, DORINHA_SHOP_ID } from './NPCShop';
import { DORINHA_ID } from '../../npc/Dorinha';
import { dorinhaDialogue } from '../../dialogue/dorinhaDialog';

const SHOP_NPCS = new Set([DORINHA_SHOP_ID]);

/**
 * Watches player position vs NPCs and shows a small "Press E to talk / G for shop"
 * prompt when in range. Also wires the E key to open dialogue and G to open shop.
 */
export function InteractPrompt() {
  const npcs = useNpcStore((s) => s.npcs);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const pos = usePlayerStore.getState().position;
      const t = findInteractTarget({ x: pos.x, z: pos.z }, useNpcStore.getState().npcs);
      if (!t) return;

      if (e.code === 'KeyE') {
        if (useDialogueStore.getState().npcId) return; // already open
        if (useChoiceDialogueStore.getState().npcId) return; // already open
        if (t.def.id === DORINHA_ID) {
          useChoiceDialogueStore.getState().openDialogue(t.def.id, t.def.name, dorinhaDialogue);
        } else {
          useDialogueStore.getState().open(t.def.id);
        }
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

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">E</kbd> conversar com{' '}
        <span className="font-semibold">{target.name}</span>
      </div>
      {isShopkeeper && (
        <div>
          <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">G</kbd>{' '}
          <span className="text-amber-300">abrir loja</span>
        </div>
      )}
    </div>
  );
}
