/**
 * TimeSystem — derived day/night phase state and NPC schedule helpers.
 *
 * Builds on top of timeStore (which owns the canonical hour/day/season/year).
 * This module exposes:
 *   - DayPhase enum: dawn | day | dusk | night
 *   - phaseFor(hour) — pure helper
 *   - useTimeSystem() — React hook returning enriched time state
 *   - NPC schedule helpers: isNpcActive(), currentNpcActivity()
 *   - Light-level accessor: lightLevelFor(hour) → 0..1
 */

import { useTimeStore } from './timeStore';

// ---------------------------------------------------------------------------
// Day/Night Phases
// ---------------------------------------------------------------------------

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/**
 * Map an in-game hour (0..24) to a named phase.
 *
 * dawn  05:00–07:00
 * day   07:00–17:00
 * dusk  17:00–20:00
 * night 20:00–05:00 (wraps)
 */
export function phaseFor(hour: number): DayPhase {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/** Whether shops / outdoor NPCs are open (day + dawn + dusk). */
export function isDaytime(hour: number): boolean {
  return hour >= 5 && hour < 20;
}

// ---------------------------------------------------------------------------
// Light level (0 = full dark, 1 = full bright noon)
// ---------------------------------------------------------------------------

const LIGHT_KEYS: { hour: number; level: number }[] = [
  { hour: 0, level: 0.05 },
  { hour: 5, level: 0.25 },
  { hour: 7, level: 0.75 },
  { hour: 12, level: 1.0 },
  { hour: 17, level: 0.8 },
  { hour: 20, level: 0.2 },
  { hour: 24, level: 0.05 },
];

/** Returns a normalized 0..1 light level for the given hour. */
export function lightLevelFor(hour: number): number {
  for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
    const a = LIGHT_KEYS[i]!;
    const b = LIGHT_KEYS[i + 1]!;
    if (hour >= a.hour && hour <= b.hour) {
      const t = (hour - a.hour) / Math.max(0.001, b.hour - a.hour);
      return a.level + (b.level - a.level) * t;
    }
  }
  return LIGHT_KEYS[0]!.level;
}

// ---------------------------------------------------------------------------
// NPC schedule helpers
// ---------------------------------------------------------------------------

export interface ScheduleEntry {
  from: string; // "HH:MM"
  to: string;
  location: string;
  activity: string;
}

function parseHourMin(time: string): number {
  const [hh = '0', mm = '0'] = time.split(':');
  return parseInt(hh, 10) + parseInt(mm, 10) / 60;
}

/**
 * Returns the active schedule entry for an NPC at the given in-game hour,
 * or null if no schedule entry covers that time.
 */
export function currentNpcActivity(schedule: ScheduleEntry[], hour: number): ScheduleEntry | null {
  for (const entry of schedule) {
    const from = parseHourMin(entry.from);
    const to = parseHourMin(entry.to);
    if (hour >= from && hour < to) return entry;
  }
  return null;
}

/** Whether the NPC has any schedule entry active at the given hour. */
export function isNpcActive(schedule: ScheduleEntry[], hour: number): boolean {
  return currentNpcActivity(schedule, hour) !== null;
}

/**
 * Returns a contextual greeting hint for an NPC at the given hour.
 * Used by dialogue systems to prepend time-aware remarks.
 */
export function npcTimeGreeting(hour: number): string {
  const phase = phaseFor(hour);
  switch (phase) {
    case 'dawn':
      return 'Bom dia cedo!';
    case 'day':
      if (hour < 12) return 'Bom dia!';
      if (hour < 15) return 'Boa tarde!';
      return 'Boa tarde!';
    case 'dusk':
      return 'Boa tarde! O dia já está acabando.';
    case 'night':
      return 'Boa noite! Já é tarde.';
  }
}

// ---------------------------------------------------------------------------
// Zustand selector hook (enriched time state)
// ---------------------------------------------------------------------------

export interface TimeSystemState {
  hour: number;
  phase: DayPhase;
  isDaytime: boolean;
  lightLevel: number;
  dayInSeason: number;
  seasonIndex: number;
  year: number;
}

/** React hook — returns enriched time state derived from timeStore. */
export function useTimeSystem(): TimeSystemState {
  return useTimeStore((s) => {
    const h = s.hour;
    return {
      hour: h,
      phase: phaseFor(h),
      isDaytime: isDaytime(h),
      lightLevel: lightLevelFor(h),
      dayInSeason: s.dayInSeason,
      seasonIndex: s.seasonIndex,
      year: s.year,
    };
  });
}

if (import.meta.env.DEV) {
  (
    window as unknown as {
      __timeSystem: { phaseFor: typeof phaseFor; lightLevelFor: typeof lightLevelFor };
    }
  ).__timeSystem = { phaseFor, lightLevelFor };
}
