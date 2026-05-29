import { useEffect } from 'react';
import { useChoiceDialogueStore } from '../systems/dialogue/choiceDialogueStore';

export function ChoiceDialogueBox() {
  const npcId = useChoiceDialogueStore((s) => s.npcId);
  const npcName = useChoiceDialogueStore((s) => s.npcName);
  const selectChoice = useChoiceDialogueStore((s) => s.selectChoice);
  const close = useChoiceDialogueStore((s) => s.close);
  const currentNode = useChoiceDialogueStore((s) => s.currentNode)();

  useEffect(() => {
    if (!npcId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close]);

  if (!npcId) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h2 className="text-lg font-bold">{npcName}</h2>
        <button
          onClick={close}
          className="text-slate-400 hover:text-slate-200 text-sm"
          title="Fechar (Esc)"
        >
          ✕
        </button>
      </header>

      {currentNode && (
        <>
          <div className="px-4 py-4 text-sm leading-relaxed bg-slate-800/50">
            <p>{currentNode.text}</p>
          </div>
          <div className="px-4 py-3 border-t border-slate-700 flex flex-col gap-2">
            {currentNode.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => selectChoice(choice)}
                className="text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-900 text-sm transition-colors border border-slate-700 hover:border-amber-400"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
