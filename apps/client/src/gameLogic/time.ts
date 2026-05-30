import type { NpcSchedule } from '@elysium/shared';
import type { Season } from '../systems/time/timeStore';

export type DayPhase = 'night' | 'dawn' | 'morning' | 'afternoon' | 'evening';

const PHASE_BREAKS: { from: number; to: number; phase: DayPhase }[] = [
  { from: 0, to: 5, phase: 'night' },
  { from: 5, to: 7, phase: 'dawn' },
  { from: 7, to: 12, phase: 'morning' },
  { from: 12, to: 17, phase: 'afternoon' },
  { from: 17, to: 20, phase: 'evening' },
  { from: 20, to: 24, phase: 'night' },
];

export function getDayPhase(hour: number): DayPhase {
  for (const { from, to, phase } of PHASE_BREAKS) {
    if (hour >= from && hour < to) return phase;
  }
  return 'night';
}

const SEASON_BASE_TEMP: Record<Season, number> = {
  spring: 20,
  summer: 30,
  autumn: 15,
  winter: 5,
};

const HOUR_TEMP_CURVE: { hour: number; delta: number }[] = [
  { hour: 0, delta: -8 },
  { hour: 6, delta: -5 },
  { hour: 12, delta: 5 },
  { hour: 15, delta: 6 },
  { hour: 20, delta: -2 },
  { hour: 24, delta: -8 },
];

function interpHourDelta(hour: number): number {
  for (let i = 0; i < HOUR_TEMP_CURVE.length - 1; i++) {
    const a = HOUR_TEMP_CURVE[i]!;
    const b = HOUR_TEMP_CURVE[i + 1]!;
    if (hour >= a.hour && hour <= b.hour) {
      const t = (hour - a.hour) / (b.hour - a.hour);
      return a.delta + (b.delta - a.delta) * t;
    }
  }
  return 0;
}

/** Returns simulated temperature in °C for the given hour and season. */
export function getTemperature(hour: number, season: Season): number {
  return Math.round(SEASON_BASE_TEMP[season] + interpHourDelta(hour));
}

/** Parses "HH:MM" time string into a fractional hour (e.g. "06:30" → 6.5). */
function parseHour(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number);
  return (hh ?? 0) + (mm ?? 0) / 60;
}

/**
 * Returns true if the NPC's schedule has any block covering `hour`.
 * Falls back to daytime-active (6:00-20:00) when no schedule is provided.
 */
export function isNpcScheduleActive(schedule: NpcSchedule[] | undefined, hour: number): boolean {
  if (!schedule || schedule.length === 0) {
    return hour >= 6 && hour < 20;
  }
  return schedule.some((block) => {
    const from = parseHour(block.from);
    const to = parseHour(block.to);
    if (from <= to) return hour >= from && hour < to;
    // overnight wrap (e.g. 22:00 → 02:00)
    return hour >= from || hour < to;
  });
}

export const DAY_PHASE_LABEL: Record<DayPhase, string> = {
  night: 'Noite',
  dawn: 'Amanhecer',
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Anoitecer',
};

export const DAY_PHASE_ICON: Record<DayPhase, string> = {
  night: '🌙',
  dawn: '🌅',
  morning: '☀️',
  afternoon: '🌤️',
  evening: '🌆',
};
