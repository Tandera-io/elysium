/**
 * Overlay UI for choice-based NPC dialogue (Dorinha and future NPCs).
 * Reads from useChoiceDialogueStore and renders NPCDialogue.
 */
import { useChoiceDialogueStore } from '../stores/dialogueStore';
import { NPCDialogue } from '../components/NPCDialogue';
import { useNpcStore } from '../systems/npc/npcStore';
import { useEffect } from 'react';

export function ChoiceDialogueBox() {
  const npcId = useChoiceDialogueStore((s) => s.npcId);
  const npcName = useChoiceDialogueStore((s) => s.npcName);
  const tree = useChoiceDialogueStore((s) => s.tree);
  const currentNodeId = useChoiceDialogueStore((s) => s.currentNodeId);
  const advance = useChoiceDialogueStore((s) => s.advance);
  const close = useChoiceDialogueStore((s) => s.close);

  const npcs = useNpcStore((s) => s.npcs);

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

  const npc = npcs[npcId];
  const displayName = npcName ?? npc?.def.name ?? npcId;

  const handleChoice = (next: string | null) => {
    if (next === null) {
      close();
    } else {
      advance(next);
    }
  };

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-bold">{displayName}</h2>
          {npc && <p className="text-xs text-slate-400">{npc.def.role}</p>}
        </div>
        <button
          onClick={close}
          className="text-slate-400 hover:text-slate-200 text-sm"
          title="Fechar (Esc)"
        >
          ✕
        </button>
      </header>
      <NPCDialogue npcName={displayName} node={node} onChoice={handleChoice} />
    </div>
  );
}
