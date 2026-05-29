/**
 * NpcScheduler — reads each NPC's schedule and walks them to the correct
 * world-space position for the current in-game hour. Also tracks which NPCs
 * are currently in motion so NpcView can drive walking vs idle animations.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useNpcStore } from './npcStore';
import { useTimeStore } from '../time/timeStore';
import type { NpcSchedule } from '@elysium/shared';

const LOCATION_ANCHORS: Record<string, { x: number; z: number }> = {
  fazenda: { x: 4, z: -8 },
  curral: { x: 8, z: -12 },
  casa_bento: { x: 6, z: -4 },
  casa_lucia: { x: 2, z: -12 },
  praca: { x: 0, z: 0 },
  padaria: { x: -8, z: -4 },
  mercado: { x: 6, z: 2 },
  estalagem: { x: -4, z: 4 },
  forja: { x: 10, z: -8 },
  casa_ferraz: { x: 12, z: -4 },
  loja_sementes: { x: -6, z: -8 },
  casa_dorinha: { x: -4, z: -12 },
};

const FALLBACK_ANCHOR = { x: 0, z: 0 };

function spreadOffset(index: number): { x: number; z: number } {
  const angle = (index * (Math.PI * 2)) / 8;
  const radius = 1.2;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

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

const NPC_WALK_SPEED = 1.5;
const ARRIVAL_THRESHOLD = 0.05;

export function NpcScheduler(): null {
  const setPosition = useNpcStore((s) => s.setPosition);
  const setMoving = useNpcStore((s) => s.setMoving);

  const targetsRef = useRef<Record<string, { x: number; z: number }>>({});
  const smoothRef = useRef<Record<string, { x: number; z: number }>>({});

  function rebuildTargets(hour: number) {
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
        const offset = spreadOffset(idx);
        targetsRef.current[id] = { x: anchor.x + offset.x, z: anchor.z + offset.z };
      });
    }
  }

  useEffect(() => {
    const unsubTime = useTimeStore.subscribe((state) => rebuildTargets(state.hour));
    return () => unsubTime();
  }, []);

  useEffect(() => {
    const hour = useTimeStore.getState().hour;
    rebuildTargets(hour);
    const npcs = useNpcStore.getState().npcs;
    for (const [id, entry] of Object.entries(npcs)) {
      if (!smoothRef.current[id]) {
        smoothRef.current[id] = { ...entry.worldPos };
      }
    }
  }, []);

  useFrame((_, delta) => {
    const npcs = useNpcStore.getState().npcs;
    for (const [id, entry] of Object.entries(npcs)) {
      const target = targetsRef.current[id];
      if (!target) continue;

      const cur = smoothRef.current[id] ?? { ...entry.worldPos };
      const dx = target.x - cur.x;
      const dz = target.z - cur.z;
      const dist = Math.hypot(dx, dz);

      if (dist < ARRIVAL_THRESHOLD) {
        if (smoothRef.current[id] !== target) {
          smoothRef.current[id] = { ...target };
          setPosition(id, target);
        }
        setMoving(id, false);
        continue;
      }

      const step = Math.min(NPC_WALK_SPEED * delta, dist);
      const newX = cur.x + (dx / dist) * step;
      const newZ = cur.z + (dz / dist) * step;
      smoothRef.current[id] = { x: newX, z: newZ };
      setPosition(id, { x: newX, z: newZ });
      setMoving(id, true);
    }
  });

  return null;
}
