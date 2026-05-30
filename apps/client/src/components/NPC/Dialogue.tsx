import dialogueData from '../../data/dialogue.json';

interface DialogueChoice {
  id: string;
  label: string;
  input: string;
}

type DialogueJson = Record<string, { choices: DialogueChoice[] }>;

interface Props {
  npcId: string;
  onChoose: (input: string) => void;
  disabled?: boolean;
}

/**
 * Renders preset response choices for an NPC dialogue.
 * Choice data is loaded from data/dialogue.json.
 */
export function Dialogue({ npcId, onChoose, disabled }: Props) {
  const data = (dialogueData as DialogueJson)[npcId];
  if (!data) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-slate-700">
      {data.choices.map((choice) => (
        <button
          key={choice.id}
          onClick={() => onChoose(choice.input)}
          disabled={disabled}
          className="bg-amber-500/90 hover:bg-amber-400 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
