import { DORINHA_DIALOGUE } from '../../features/npc/dialogue/dorinha';
import { useDialogueStore } from '../../systems/dialogue/dialogueStore';

const DORINHA_SPRITE = '/src/assets/npc/dorinha.png';

/**
 * Dorinha NPC — quitandeira, key character offering dialogue and quests.
 * Integrates with the dialogue system via useDialogueStore.
 */
export function DorinhaNPC() {
  const open = useDialogueStore((s) => s.open);

  function handleInteract() {
    open(DORINHA_DIALOGUE.npcId);
  }

  return {
    npcId: DORINHA_DIALOGUE.npcId,
    sprite: DORINHA_SPRITE,
    position: { x: 6, z: 4 },
    onInteract: handleInteract,
  };
}

export const DORINHA_NPC_CONFIG = {
  id: DORINHA_DIALOGUE.npcId,
  name: 'Dorinha',
  sprite: DORINHA_SPRITE,
  greetings: DORINHA_DIALOGUE.greetings,
  topics: DORINHA_DIALOGUE.topics,
};

export default DorinhaNPC;
