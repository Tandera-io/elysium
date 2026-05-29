import { useEffect, useCallback } from 'react';
import { useChoiceDialogueStore } from '../../stores/dialogueStore';
import dorinhaTree from '../../assets/dialogue/dorinha.json';

const DORINHA_ID = 'dorinha';
const DORINHA_NAME = 'Dorinha';
const DORINHA_INTERACT_RADIUS = 2.5;

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function useDorinhaDialogue(playerPos, dorinhaPos) {
  const open = useChoiceDialogueStore((s) => s.open);
  const npcId = useChoiceDialogueStore((s) => s.npcId);
  const isOpen = npcId === DORINHA_ID;
  const inRange = distance2D(playerPos, dorinhaPos) <= DORINHA_INTERACT_RADIUS;

  const handleKey = useCallback(
    (e) => {
      if (!inRange) return;
      if (e.code !== 'KeyE') return;
      if (isOpen) return;
      open(DORINHA_ID, dorinhaTree);
    },
    [inRange, isOpen, open],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return { inRange, isOpen };
}

export function DorinhaInteractHint() {
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">E</kbd> conversar com{' '}
        <span className="font-semibold">{DORINHA_NAME}</span>
      </div>
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">G</kbd>{' '}
        <span className="text-amber-300">abrir loja</span>
      </div>
    </div>
  );
}
