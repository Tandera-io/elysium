import { useTimeStore, formatClock } from '../systems/time/timeStore';
import type { Season } from '../systems/time/timeStore';

export type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk';

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 20 || hour < 5) return 'night';
  if (hour < 7) return 'dawn';
  if (hour < 17) return 'day';
  return 'dusk';
}

export interface UseTimeResult {
  /** Continuous in-game hour (0..24). */
  hour: number;
  /** Integer minute within the current hour (0..59). */
  minute: number;
  /** Human-readable clock string, e.g. "06:30". */
  formattedTime: string;
  /** Coarse time-of-day period. */
  timeOfDay: TimeOfDay;
  /** Current season. */
  season: Season;
  /** 1-based day within the current season. */
  dayInSeason: number;
  /** 1-based year. */
  year: number;
}

/**
 * Convenience hook that exposes the most commonly needed time values derived
 * from the central timeStore, avoiding repeated selector boilerplate across
 * components.
 */
export function useTime(): UseTimeResult {
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const season: Season = seasons[seasonIndex] ?? 'spring';
  const minute = Math.floor((hour % 1) * 60);
  const formattedTime = formatClock(hour);
  const timeOfDay = getTimeOfDay(hour);

  return { hour, minute, formattedTime, timeOfDay, season, dayInSeason, year };
}
