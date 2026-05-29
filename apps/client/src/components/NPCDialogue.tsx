import type { DialogueTreeNode } from '../stores/dialogueStore';

interface Props {
  npcName: string;
  node: DialogueTreeNode;
  onChoice: (next: string | null) => void;
}

export function NPCDialogue({ npcName, node, onChoice }: Props) {
  return (
    <div className="px-4 py-4 space-y-3 text-sm">
      <p className="bg-slate-800 px-3 py-2 rounded-xl text-slate-100 leading-relaxed">
        {node.text}
      </p>
      {node.choices.length > 0 ? (
        <div className="flex flex-col gap-2">
          {node.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => onChoice(choice.next)}
              className="text-left bg-slate-700 hover:bg-amber-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg text-slate-100 text-sm"
            >
              {choice.text}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => onChoice(null)}
          className="text-left bg-slate-700 hover:bg-amber-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg text-slate-100 text-sm w-full"
        >
          Tchau, {npcName}!
        </button>
      )}
    </div>
  );
}
