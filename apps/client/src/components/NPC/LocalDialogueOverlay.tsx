/**
 * LocalDialogueOverlay — renders the NPC DialogueBox driven by localDialogueStore.
 * Mount this once in App alongside the other UI overlays.
 */
import { useEffect } from 'react';
import { useLocalDialogueStore } from '../../systems/npc/localDialogueStore';
import { DialogueBox } from './DialogueBox';

export function LocalDialogueOverlay() {
  const active = useLocalDialogueStore((s) => s.active);
  const close = useLocalDialogueStore((s) => s.close);
  const advance = useLocalDialogueStore((s) => s.advance);

  // Close on Escape; advance on Enter
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      } else if (e.key === 'Enter') {
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close, advance]);

  const dialogue = active ? { npcName: active.npcName, text: active.text } : null;

  // Show "Continuar" only when there are multiple lines
  const hasMultipleLines = (active?.totalLines ?? 0) > 1;

  return (
    <DialogueBox
      dialogue={dialogue}
      isVisible={active !== null}
      onClose={close}
      onNext={hasMultipleLines ? advance : undefined}
    />
  );
}
