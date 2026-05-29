/** Dorinha — quitandeira do vilarejo. Spawns at tile (6, 4) on the farm. */
export const DORINHA_ID = 'dorinha' as const;
export const DORINHA_SPAWN = { x: 6, z: 4 } as const;
export const DORINHA_SPRITE = 'sprites/cache/86c32aed8fdfe173.png' as const;

export {
  DORINHA_DIALOGUE,
  DORINHA_DIALOGUE_ENTRY,
  type DialogueChoice,
  type DialogueNode,
} from '../dialogue/dorinhaDialogue';
