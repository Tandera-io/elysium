/**
 * Dorinha — seed vendor NPC definition and schedule.
 *
 * Dorinha runs the seed shop (loja_sementes) on the west side of the village.
 * She sells wheat, tomato, and corn seeds to the player.
 *
 * This module re-exports Dorinha's NpcDef from the JSON content file and
 * provides typed helpers used by NpcScheduler and NpcView.
 */

import type { NpcDef, NpcSchedule } from '@elysium/shared';
import dorinhaJson from '../content/npcs/dorinha.json';

/** Typed NPC definition for Dorinha. */
export const DORINHA_DEF: NpcDef = dorinhaJson as NpcDef;

/** Dorinha's daily walking schedule. */
export const DORINHA_SCHEDULE: NpcSchedule[] = dorinhaJson.schedule as NpcSchedule[];

/**
 * Returns Dorinha's active location name for the given hour (0–24).
 * Returns null if Dorinha is off-schedule (e.g. sleeping with no entry).
 */
export function dorinhaLocationAt(hour: number): string | null {
  for (const entry of DORINHA_SCHEDULE) {
    const [fromH, fromM] = entry.from.split(':').map(Number);
    const [toH, toM] = entry.to.split(':').map(Number);
    const from = (fromH ?? 0) + (fromM ?? 0) / 60;
    const to = (toH ?? 0) + (toM ?? 0) / 60;
    if (from <= to) {
      if (hour >= from && hour < to) return entry.location;
    } else {
      // wraps midnight
      if (hour >= from || hour < to) return entry.location;
    }
  }
  return null;
}
