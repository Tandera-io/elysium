import { describe, expect, it } from 'vitest';
import type { NpcSchedule } from '@elysium/shared';

// --- Replicate the pure functions from NpcScheduler for unit testing ---

function parseHour(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

function activeSchedule(schedule: NpcSchedule[], hour: number): NpcSchedule | null {
  for (const entry of schedule) {
    const from = parseHour(entry.from);
    const to = parseHour(entry.to);
    if (from <= to) {
      if (hour >= from && hour < to) return entry;
    } else {
      if (hour >= from || hour < to) return entry;
    }
  }
  return null;
}

// --- Tests ---

const FERRAZ_SCHEDULE: NpcSchedule[] = [
  { from: '06:00', to: '09:00', location: 'forja', activity: 'abrir_forja' },
  { from: '09:00', to: '12:00', location: 'forja', activity: 'forjar' },
  { from: '12:00', to: '14:00', location: 'estalagem', activity: 'almoco' },
  { from: '14:00', to: '16:00', location: 'forja', activity: 'atender' },
  { from: '16:00', to: '20:00', location: 'forja', activity: 'forjar' },
  { from: '20:00', to: '22:00', location: 'casa_ferraz', activity: 'descanso' },
];

const BENTO_SCHEDULE: NpcSchedule[] = [
  { from: '05:00', to: '07:00', location: 'casa_bento', activity: 'acordar' },
  { from: '07:00', to: '12:00', location: 'fazenda', activity: 'lavrar' },
  { from: '12:00', to: '13:30', location: 'estalagem', activity: 'almoco' },
  { from: '13:30', to: '17:00', location: 'fazenda', activity: 'colher' },
  { from: '17:00', to: '19:00', location: 'praca', activity: 'descanso' },
  { from: '19:00', to: '21:00', location: 'casa_bento', activity: 'jantar' },
];

const LUCIA_SCHEDULE: NpcSchedule[] = [
  { from: '04:30', to: '06:00', location: 'curral', activity: 'ordenhar' },
  { from: '06:00', to: '08:00', location: 'casa_lucia', activity: 'cafe_manha' },
  { from: '08:00', to: '11:00', location: 'curral', activity: 'cuidar_animais' },
  { from: '11:00', to: '13:00', location: 'praca', activity: 'socializar' },
  { from: '13:00', to: '16:00', location: 'curral', activity: 'cuidar_animais' },
  { from: '16:00', to: '18:00', location: 'mercado', activity: 'compras' },
  { from: '18:00', to: '21:00', location: 'casa_lucia', activity: 'jantar' },
];

const DORINHA_SCHEDULE: NpcSchedule[] = [
  { from: '06:00', to: '07:00', location: 'casa_dorinha', activity: 'acordar' },
  { from: '07:00', to: '12:00', location: 'loja_sementes', activity: 'vender' },
  { from: '12:00', to: '14:00', location: 'praca', activity: 'almoco' },
  { from: '14:00', to: '18:00', location: 'loja_sementes', activity: 'atender' },
  { from: '18:00', to: '20:00', location: 'praca', activity: 'socializar' },
  { from: '20:00', to: '22:00', location: 'casa_dorinha', activity: 'descanso' },
];

describe('parseHour', () => {
  it('parses "06:00" → 6', () => expect(parseHour('06:00')).toBe(6));
  it('parses "13:30" → 13.5', () => expect(parseHour('13:30')).toBe(13.5));
  it('parses "00:00" → 0', () => expect(parseHour('00:00')).toBe(0));
});

describe('activeSchedule — Ferraz', () => {
  it('is at forja opening at 06:00', () => {
    expect(activeSchedule(FERRAZ_SCHEDULE, 6)).toMatchObject({
      location: 'forja',
      activity: 'abrir_forja',
    });
  });

  it('is forging at 10:00', () => {
    expect(activeSchedule(FERRAZ_SCHEDULE, 10)).toMatchObject({
      location: 'forja',
      activity: 'forjar',
    });
  });

  it('is at lunch (estalagem) at 12:30', () => {
    expect(activeSchedule(FERRAZ_SCHEDULE, 12.5)).toMatchObject({
      location: 'estalagem',
      activity: 'almoco',
    });
  });

  it('is attending customers at 15:00', () => {
    expect(activeSchedule(FERRAZ_SCHEDULE, 15)).toMatchObject({
      location: 'forja',
      activity: 'atender',
    });
  });

  it('is resting at home at 21:00', () => {
    expect(activeSchedule(FERRAZ_SCHEDULE, 21)).toMatchObject({
      location: 'casa_ferraz',
      activity: 'descanso',
    });
  });

  it('returns null after 22:00 (sleep time)', () => {
    expect(activeSchedule(FERRAZ_SCHEDULE, 23)).toBeNull();
  });
});

describe('activeSchedule — Bento', () => {
  it('is waking at 05:30', () => {
    expect(activeSchedule(BENTO_SCHEDULE, 5.5)).toMatchObject({
      location: 'casa_bento',
      activity: 'acordar',
    });
  });

  it('is farming at 08:00', () => {
    expect(activeSchedule(BENTO_SCHEDULE, 8)).toMatchObject({
      location: 'fazenda',
      activity: 'lavrar',
    });
  });

  it('is harvesting at 14:00', () => {
    expect(activeSchedule(BENTO_SCHEDULE, 14)).toMatchObject({
      location: 'fazenda',
      activity: 'colher',
    });
  });
});

describe('activeSchedule — Lúcia', () => {
  it('is milking before dawn at 05:00', () => {
    expect(activeSchedule(LUCIA_SCHEDULE, 5)).toMatchObject({
      location: 'curral',
      activity: 'ordenhar',
    });
  });

  it('is socializing at midday 11:30', () => {
    expect(activeSchedule(LUCIA_SCHEDULE, 11.5)).toMatchObject({
      location: 'praca',
      activity: 'socializar',
    });
  });

  it('is shopping at 17:00', () => {
    expect(activeSchedule(LUCIA_SCHEDULE, 17)).toMatchObject({
      location: 'mercado',
      activity: 'compras',
    });
  });
});

describe('activeSchedule — Dorinha', () => {
  it('is at home waking up at 06:30', () => {
    expect(activeSchedule(DORINHA_SCHEDULE, 6.5)).toMatchObject({
      location: 'casa_dorinha',
      activity: 'acordar',
    });
  });

  it('is selling seeds at 09:00', () => {
    expect(activeSchedule(DORINHA_SCHEDULE, 9)).toMatchObject({
      location: 'loja_sementes',
      activity: 'vender',
    });
  });

  it('is at lunch in the square at 13:00', () => {
    expect(activeSchedule(DORINHA_SCHEDULE, 13)).toMatchObject({
      location: 'praca',
      activity: 'almoco',
    });
  });

  it('is attending customers at 15:00', () => {
    expect(activeSchedule(DORINHA_SCHEDULE, 15)).toMatchObject({
      location: 'loja_sementes',
      activity: 'atender',
    });
  });

  it('is socializing in the square at 19:00', () => {
    expect(activeSchedule(DORINHA_SCHEDULE, 19)).toMatchObject({
      location: 'praca',
      activity: 'socializar',
    });
  });

  it('is resting at home at 21:00', () => {
    expect(activeSchedule(DORINHA_SCHEDULE, 21)).toMatchObject({
      location: 'casa_dorinha',
      activity: 'descanso',
    });
  });

  it('returns null after 22:00 (sleep time)', () => {
    expect(activeSchedule(DORINHA_SCHEDULE, 23)).toBeNull();
  });
});

describe('congestion avoidance — no two NPCs share exact position at same hour', () => {
  const LOCATION_ANCHORS: Record<string, { x: number; z: number }> = {
    fazenda: { x: 4, z: -8 },
    curral: { x: 8, z: -12 },
    praca: { x: 0, z: 0 },
    estalagem: { x: -4, z: 4 },
    casa_bento: { x: 6, z: -4 },
    casa_lucia: { x: 2, z: -12 },
    forja: { x: 10, z: -8 },
    casa_ferraz: { x: 12, z: -4 },
    mercado: { x: 6, z: 2 },
    padaria: { x: -8, z: -4 },
    loja_sementes: { x: -6, z: -8 },
    casa_dorinha: { x: -4, z: -12 },
  };
  const FALLBACK = { x: 0, z: 0 };

  function spreadOffset(index: number): { x: number; z: number } {
    const angle = (index * (Math.PI * 2)) / 8;
    const radius = 1.2;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  function positionsAt(hour: number) {
    const schedules = [
      { id: 'ferraz', sched: FERRAZ_SCHEDULE },
      { id: 'bento', sched: BENTO_SCHEDULE },
      { id: 'lucia', sched: LUCIA_SCHEDULE },
      { id: 'dorinha', sched: DORINHA_SCHEDULE },
    ];

    const locationOccupancy: Record<string, string[]> = {};
    for (const { id, sched } of schedules) {
      const active = activeSchedule(sched, hour);
      const location = active?.location ?? 'praca';
      if (!locationOccupancy[location]) locationOccupancy[location] = [];
      locationOccupancy[location].push(id);
    }

    const result: Record<string, { x: number; z: number }> = {};
    for (const [location, ids] of Object.entries(locationOccupancy)) {
      const anchor = LOCATION_ANCHORS[location] ?? FALLBACK;
      ids.forEach((id, idx) => {
        const offset = spreadOffset(idx);
        result[id] = { x: anchor.x + offset.x, z: anchor.z + offset.z };
      });
    }
    return result;
  }

  it('no two NPCs are at the same world position at 12:00', () => {
    const positions = positionsAt(12);
    const posStrings = Object.values(positions).map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`);
    const unique = new Set(posStrings);
    expect(unique.size).toBe(posStrings.length);
  });

  it('no two NPCs are at the same world position at 08:00', () => {
    const positions = positionsAt(8);
    const posStrings = Object.values(positions).map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`);
    const unique = new Set(posStrings);
    expect(unique.size).toBe(posStrings.length);
  });
});
