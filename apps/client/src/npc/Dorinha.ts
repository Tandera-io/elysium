/** Dorinha — quitandeira do vilarejo. Spawns at tile (6, 4) on the farm. */
export const DORINHA_ID = 'dorinha' as const;
export const DORINHA_SPAWN = { x: 6, z: 4 } as const;
export const DORINHA_SPRITE = 'sprites/cache/86c32aed8fdfe173.png' as const;

/** World-space waypoints driven by Dorinha's daily schedule. */
export const DORINHA_SCHEDULE = [
  { fromHour: 7, toHour: 12, pos: { x: 6, z: 4 } }, // quitanda (manhã)
  { fromHour: 12, toHour: 14, pos: { x: 2, z: 8 } }, // casa (almoço)
  { fromHour: 14, toHour: 18, pos: { x: 6, z: 4 } }, // quitanda (tarde)
  { fromHour: 18, toHour: 24, pos: { x: 2, z: 8 } }, // casa (noite)
  { fromHour: 0, toHour: 7, pos: { x: 2, z: 8 } }, // casa (madrugada)
] as const;

export {
  DORINHA_DIALOGUE,
  DORINHA_DIALOGUE_ENTRY,
  type DialogueChoice,
  type DialogueNode,
} from '../dialogue/dorinhaDialogue';
