export const DORINHA_ID = 'dorinha';

export interface ScheduleSlot {
  fromHour: number;
  toHour: number;
  pos: { x: number; z: number };
}

// Named waypoints for Dorinha's daily route on the fazenda.
// - quitanda (shop stall): near x=6, z=4
// - roça (crop field inspection): near x=4, z=2
// - casa (home): near x=2, z=8
export const DORINHA_WAYPOINTS = {
  quitanda: { x: 6, z: 4 },
  roca: { x: 4, z: 2 },
  casa: { x: 2, z: 8 },
} as const;

// Dorinha's daily walking schedule:
//  07-09  Opens shop, tends crops in the field (roça)
//  09-12  Back at the shop stall (quitanda) to receive customers
//  12-14  Lunch break at home (casa)
//  14-18  Returns to shop stall (quitanda) for the afternoon shift
//  18-07  Rests at home (casa)
export const DORINHA_SCHEDULE: ScheduleSlot[] = [
  { fromHour: 7, toHour: 9, pos: DORINHA_WAYPOINTS.roca },
  { fromHour: 9, toHour: 12, pos: DORINHA_WAYPOINTS.quitanda },
  { fromHour: 12, toHour: 14, pos: DORINHA_WAYPOINTS.casa },
  { fromHour: 14, toHour: 18, pos: DORINHA_WAYPOINTS.quitanda },
  { fromHour: 18, toHour: 24, pos: DORINHA_WAYPOINTS.casa },
  { fromHour: 0, toHour: 7, pos: DORINHA_WAYPOINTS.casa },
];
