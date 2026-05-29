/**
 * NpcScheduler — reads each NPC's schedule and moves them to the correct
 * world-space position for the current in-game hour.
 *
 * Location → world-space mapping is defined here to avoid congestion:
 * each location has a unique anchor point plus a small per-NPC offset so
 * multiple NPCs at the same location don't stack on top of each other.
 *
 * This is a non-rendering component (returns null); it runs as a hook inside
 * the R3F canvas via <NpcScheduler /> in Scene.tsx.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useNpcStore } from './npcStore';
import { useTimeStore } from '../time/timeStore';
import type { NpcSchedule } from '@elysium/shared';

/** World-space anchor for each named location. */
const LOCATION_ANCHORS: Record<string, { x: number; z: number }> = {
  // Fazenda area
  fazenda: { x: 4, z: -8 },
  curral: { x: 8, z: -12 },
  casa_bento: { x: 6, z: -4 },
  casa_lucia: { x: 2, z: -12 },
  // Vilarejo area
  praca: { x: 0, z: 0 },
  padaria: { x: -8, z: -4 },
  mercado: { x: 6, z: 2 },
  estalagem: { x: -4, z: 4 },
  // Forja / Ferraz area
  forja: { x: 10, z: -8 },
  casa_ferraz: { x: 12, z: -4 },
  // Loja de sementes / Dorinha area
  loja_sementes: { x: -6, z: -8 },
  casa_dorinha: { x: -4, z: -12 },
};

/** Fallback anchor when a location is not in the table. */
const FALLBACK_ANCHOR = { x: 0, z: 0 };

/**
 * Per-NPC spread offset so NPCs at the same location don't overlap.
 * Spread is stable per NPC id (hash-based) to avoid jitter.
 */
function spreadOffset(_npcId: string, index: number): { x: number; z: number } {
  // Use index-based radial spread: NPCs fan out in a small circle
  const angle = (index * (Math.PI * 2)) / 8; // up to 8 NPCs per location
  const radius = 1.2;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}

/**
 * Parse "HH:MM" time string into a fractional hour (0–24).
 */
function parseHour(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

/**
 * Return the active schedule entry for the given hour, or null if idle.
 */
function activeSchedule(schedule: NpcSchedule[], hour: number): NpcSchedule | null {
  for (const entry of schedule) {
    const from = parseHour(entry.from);
    const to = parseHour(entry.to);
    if (from <= to) {
      if (hour >= from && hour < to) return entry;
    } else {
      // Wraps midnight, e.g. 22:00 → 06:00
      if (hour >= from || hour < to) return entry;
    }
  }
  return null;
}

/** NPC walk speed in units per second (same scale as player). */
const NPC_WALK_SPEED = 1.5;

export function NpcScheduler(): null {
  const setPosition = useNpcStore((s) => s.setPosition);

  // Stable ref to NPC target positions (id → target {x, z})
  const targetsRef = useRef<Record<string, { x: number; z: number }>>({});
  // Stable ref to current smooth positions (id → current {x, z})
  const smoothRef = useRef<Record<string, { x: number; z: number }>>({});

  // When the hour changes, recalculate targets for all NPCs.
  useEffect(() => {
    const unsubTime = useTimeStore.subscribe((state) => {
      const { hour } = state;
      const npcs = useNpcStore.getState().npcs;

      // Build a map: location → list of NPC ids arriving there this hour
      const locationOccupancy: Record<string, string[]> = {};
      for (const [id, entry] of Object.entries(npcs)) {
        const schedule = entry.def.schedule;
        if (!schedule || schedule.length === 0) continue;
        const active = activeSchedule(schedule, hour);
        const location = active?.location ?? 'praca';
        if (!locationOccupancy[location]) locationOccupancy[location] = [];
        locationOccupancy[location].push(id);
      }

      // Assign target positions with spread offsets to avoid congestion
      for (const [location, ids] of Object.entries(locationOccupancy)) {
        const anchor = LOCATION_ANCHORS[location] ?? FALLBACK_ANCHOR;
        ids.forEach((id, idx) => {
          const offset = spreadOffset(id, idx);
          targetsRef.current[id] = {
            x: anchor.x + offset.x,
            z: anchor.z + offset.z,
          };
        });
      }
    });

    return () => unsubTime();
  }, []);

  // Initialize targets on mount
  useEffect(() => {
    const hour = useTimeStore.getState().hour;
    const npcs = useNpcStore.getState().npcs;

    const locationOccupancy: Record<string, string[]> = {};
    for (const [id, entry] of Object.entries(npcs)) {
      const schedule = entry.def.schedule;
      if (!schedule || schedule.length === 0) continue;
      const active = activeSchedule(schedule, hour);
      const location = active?.location ?? 'praca';
      if (!locationOccupancy[location]) locationOccupancy[location] = [];
      locationOccupancy[location].push(id);
    }

    for (const [location, ids] of Object.entries(locationOccupancy)) {
      const anchor = LOCATION_ANCHORS[location] ?? FALLBACK_ANCHOR;
      ids.forEach((id, idx) => {
        const offset = spreadOffset(id, idx);
        const target = { x: anchor.x + offset.x, z: anchor.z + offset.z };
        targetsRef.current[id] = target;
        // Init smooth position to current worldPos if available
        const entry = useNpcStore.getState().npcs[id];
        if (entry && !smoothRef.current[id]) {
          smoothRef.current[id] = { ...entry.worldPos };
        }
      });
    }
  }, []);

  // Each frame: smoothly walk NPCs toward their targets
  useFrame((_state, delta) => {
    const npcs = useNpcStore.getState().npcs;

    for (const [id, entry] of Object.entries(npcs)) {
      const target = targetsRef.current[id];
      if (!target) continue;

      const cur = smoothRef.current[id] ?? { ...entry.worldPos };
      const dx = target.x - cur.x;
      const dz = target.z - cur.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.01) {
        smoothRef.current[id] = { ...target };
        setPosition(id, target);
        continue;
      }

      // Move toward target at NPC_WALK_SPEED, clamped so we don't overshoot
      const step = Math.min(NPC_WALK_SPEED * delta, dist);
      const newX = cur.x + (dx / dist) * step;
      const newZ = cur.z + (dz / dist) * step;
      smoothRef.current[id] = { x: newX, z: newZ };
      setPosition(id, { x: newX, z: newZ });
    }
  });

  return null;
}
