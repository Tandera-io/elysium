import { useDialogueStore } from '../../systems/dialogue/dialogueStore';
import type { DialogueNodeResponse } from '../../systems/dialogue/dialogueStore';

interface Props {
  responses: DialogueNodeResponse[];
  disabled?: boolean;
}

/**
 * Renders the player's response options for the current dialogue node.
 * Each button advances to the next node or closes the conversation (next === null).
 */
export function DialogueNodeChoices({ responses, disabled }: Props) {
  const selectNode = useDialogueStore((s) => s.selectNode);

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-slate-700">
      {responses.map((response) => (
        <button
          key={response.id}
          onClick={() => selectNode(response.text, response.next)}
          disabled={disabled}
          className={
            response.next === null
              ? 'bg-slate-700/90 hover:bg-slate-600 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50'
              : 'bg-amber-500/90 hover:bg-amber-400 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50'
          }
        >
          {response.text}
        </button>
      ))}
    </div>
  );
}
