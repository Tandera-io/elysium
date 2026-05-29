/**
 * Renders a single dialogue node for an NPC choice-tree conversation.
 * Shows the NPC's line and presents selectable choices.
 */
import type { DialogueNode } from '../stores/dialogueStore';

interface NPCDialogueProps {
  npcName: string;
  node: DialogueNode;
  /** Called with the next node id, or null to close the dialogue. */
  onChoice: (next: string | null) => void;
}

export function NPCDialogue({ npcName, node, onChoice }: NPCDialogueProps) {
  return (
    <div className="px-4 py-3 space-y-3">
      <p className="text-sm text-slate-100 leading-relaxed">
        <span className="font-semibold text-amber-300">{npcName}:</span> {node.text}
      </p>
      <div className="flex flex-col gap-1.5">
        {node.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => onChoice(choice.next)}
            className="text-left text-sm px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500 text-slate-200 hover:text-slate-100 transition-colors"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
