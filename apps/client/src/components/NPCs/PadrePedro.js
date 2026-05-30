import { PADRE_PEDRO_DIALOGUE } from '../../features/npc/dialogue/padre_pedro';
import { useDialogueStore } from '../../systems/dialogue/dialogueStore';

const PADRE_PEDRO_SPRITE = '/src/assets/npc/padre-pedro.png';

/**
 * Padre Pedro NPC — padre da vila, oferece conselho, quests e orientacao espiritual.
 * Integra com o sistema de dialogo via useDialogueStore.
 */
export function PadrePedroNPC() {
  const open = useDialogueStore((s) => s.open);

  function handleInteract() {
    open(PADRE_PEDRO_DIALOGUE.npcId);
  }

  return {
    npcId: PADRE_PEDRO_DIALOGUE.npcId,
    sprite: PADRE_PEDRO_SPRITE,
    position: { x: 2, z: -6 },
    onInteract: handleInteract,
  };
}

export const PADRE_PEDRO_NPC_CONFIG = {
  id: PADRE_PEDRO_DIALOGUE.npcId,
  name: 'Padre Pedro',
  sprite: PADRE_PEDRO_SPRITE,
  greetings: PADRE_PEDRO_DIALOGUE.greetings,
  topics: PADRE_PEDRO_DIALOGUE.topics,
};

export default PadrePedroNPC;
