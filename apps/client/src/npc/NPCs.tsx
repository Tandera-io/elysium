/**
 * NPCs.tsx — central NPC roster and React component exports.
 *
 * This module acts as the single import surface for all NPC definitions.
 * Add new NPCs here and they will automatically appear in NpcView and
 * be picked up by NpcScheduler.
 *
 * Rendering is handled by NpcView (billboarded sprites) and NpcScheduler
 * (schedule-driven movement). This file focuses on the data layer.
 */

import type { NpcDef } from '@elysium/shared';
import marinaJson from '../content/npcs/marina.json';
import bentoJson from '../content/npcs/bento.json';
import luciaJson from '../content/npcs/lucia.json';
import dorinhaJson from '../content/npcs/dorinha.json';

/** Full roster of active NPCs in the game world. */
export const NPC_ROSTER: NpcDef[] = [
  marinaJson as NpcDef,
  bentoJson as NpcDef,
  luciaJson as NpcDef,
  dorinhaJson as NpcDef,
];

/** Lookup map: npc id → NpcDef. */
export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(
  NPC_ROSTER.map((npc) => [npc.id, npc]),
);

/** IDs of all registered NPCs. */
export type NpcId = 'marina' | 'bento' | 'lucia' | 'dorinha';
