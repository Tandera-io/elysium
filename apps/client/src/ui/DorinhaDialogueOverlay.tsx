import { useEffect } from 'react';
import { useChoiceDialogueStore } from '../stores/dialogueStore';
import { NPCDialogue } from '../components/NPCDialogue';

const DORINHA_NAME = 'Dorinha';

export function DorinhaDialogueOverlay() {
  const npcId = useChoiceDialogueStore((s) => s.npcId);
  const currentNodeId = useChoiceDialogueStore((s) => s.currentNodeId);
  const tree = useChoiceDialogueStore((s) => s.tree);
  const close = useChoiceDialogueStore((s) => s.close);
  const advance = useChoiceDialogueStore((s) => s.advance);

  useEffect(() => {
    if (!npcId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close]);

  if (!npcId || !tree || !currentNodeId) return null;
  const node = tree.nodes[currentNodeId];
  if (!node) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Conversa com ${DORINHA_NAME}`}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100"
    >
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-bold">{DORINHA_NAME}</h2>
          <p className="text-xs text-slate-400">quitandeira</p>
        </div>
        <button
          onClick={close}
          className="text-slate-400 hover:text-slate-200 text-sm"
          title="Fechar (Esc)"
          aria-label="Fechar diálogo"
        >
          ✕
        </button>
      </header>
      <NPCDialogue
        npcName={DORINHA_NAME}
        node={node}
        onChoice={(next) => {
          if (next === null) close();
          else advance(next);
        }}
      />
    </div>
  );
}
