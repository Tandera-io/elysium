import { create } from 'zustand';
import { useFarmStore } from '../farming/farmStore';
import { usePlayerStore } from '../../store/playerStore';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_SEASON = 7;
export const HOURS_PER_DAY = 24;
export const SECONDS_PER_REAL_DAY_DEFAULT = 15 * 60; // 15 real minutes = 1 in-game day

export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Primavera',
  summer: 'Verão',
  autumn: 'Outono',
  winter: 'Inverno',
};

export interface TimeState {
  /** Continuous in-game hour (0..24). */
  hour: number;
  /** 1-based day index inside the current season (1..7). */
  dayInSeason: number;
  /** 0-based season index inside the current year. */
  seasonIndex: number;
  /** 1-based year. */
  year: number;
  /** Real seconds to elapse for one in-game day. */
  realSecondsPerDay: number;
  /** Paused flag — pauses time progression (does not pause world tick). */
  paused: boolean;
}

export interface TimeActions {
  /** Advance by `realDeltaSeconds` of real time. Rolls over days/seasons/year. */
  tick: (realDeltaSeconds: number) => void;
  setPaused: (paused: boolean) => void;
  setRealSecondsPerDay: (value: number) => void;
  reset: () => void;
}

function makeInitial(): TimeState {
  return {
    hour: 6,
    dayInSeason: 1,
    seasonIndex: 0,
    year: 1,
    realSecondsPerDay: SECONDS_PER_REAL_DAY_DEFAULT,
    paused: false,
  };
}

export const useTimeStore = create<TimeState & TimeActions>((set, get) => ({
  ...makeInitial(),
  tick: (realDeltaSeconds) => {
    if (get().paused || realDeltaSeconds <= 0) return;
    const hoursPerRealSecond = HOURS_PER_DAY / get().realSecondsPerDay;
    let { hour, dayInSeason, seasonIndex, year } = get();
    hour += realDeltaSeconds * hoursPerRealSecond;
    let dayRolled = false;
    while (hour >= HOURS_PER_DAY) {
      hour -= HOURS_PER_DAY;
      dayInSeason += 1;
      dayRolled = true;
      if (dayInSeason > DAYS_PER_SEASON) {
        dayInSeason = 1;
        seasonIndex += 1;
        if (seasonIndex >= SEASONS.length) {
          seasonIndex = 0;
          year += 1;
        }
      }
    }
    set({ hour, dayInSeason, seasonIndex, year });
    if (dayRolled) {
      useFarmStore.getState().advanceDay();
      usePlayerStore.getState().drainPerDayTick();
    }
  },
  setPaused: (paused) => set({ paused }),
  setRealSecondsPerDay: (value) => set({ realSecondsPerDay: Math.max(10, value) }),
  reset: () => set(makeInitial()),
}));

export function currentSeason(state: TimeState): Season {
  return SEASONS[state.seasonIndex] ?? 'spring';
}

export function formatClock(hour: number): string {
  const total = Math.floor(hour * 60);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

if (import.meta.env.DEV) {
  (window as unknown as { __time: typeof useTimeStore }).__time = useTimeStore;
}
