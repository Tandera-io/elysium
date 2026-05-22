import { useEffect, useState } from 'react';
import { useDialogueStore } from '../dialogue/dialogueStore';
import { usePlayerStore } from '../../store/playerStore';
import { findInteractTarget } from './interaction';
import { useNpcStore } from './npcStore';

/**
 * Watches player position vs NPCs and shows a small "Press E to talk"
 * prompt when in range. Also wires the E key to open the dialogue.
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
      if (e.code !== 'KeyE') return;
      if (useDialogueStore.getState().npcId) return; // already open
      const pos = usePlayerStore.getState().position;
      const t = findInteractTarget({ x: pos.x, z: pos.z }, useNpcStore.getState().npcs);
      if (t) useDialogueStore.getState().open(t.def.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!target) return null;
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100">
      <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">E</kbd> conversar com{' '}
      <span className="font-semibold">{target.name}</span>
    </div>
  );
}
