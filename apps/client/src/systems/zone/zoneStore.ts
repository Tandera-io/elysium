import { create } from 'zustand';
import { ZONES, type ZoneId } from '../../content/zones';

export interface ZoneState {
  current: ZoneId;
}

export interface ZoneActions {
  travelTo: (zoneId: ZoneId) => void;
}

export const useZoneStore = create<ZoneState & ZoneActions>((set) => ({
  current: 'fazenda',
  travelTo: (current) => {
    if (!(current in ZONES)) return;
    set({ current });
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __zone: typeof useZoneStore }).__zone = useZoneStore;
}
