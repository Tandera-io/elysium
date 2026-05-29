/**
 * NpcScheduler — reads each NPC's schedule and walks them toward the correct
 * world-space position for the current in-game hour. Marks NPCs as moving or
 * idle so NpcView can drive the appropriate animation.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useNpcStore } from './npcStore';
import { useTimeStore } from '../time/timeStore';
import type { NpcSchedule } from '@elysium/shared';
import schedulesJson from '../../data/npcSchedules.json';

type LocationMap = Record<string, { x: number; z: number }>;
const LOCATION_ANCHORS: LocationMap = schedulesJson.locations;
const FALLBACK_ANCHOR = { x: 0, z: 0 };

const NPC_WALK_SPEED = 1.5;
const ARRIVAL_THRESHOLD = 0.05;

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

function spreadOffset(index: number): { x: number; z: number } {
  const angle = (index * (Math.PI * 2)) / 8;
  const radius = 1.2;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

function buildTargets(hour: number): Record<string, { x: number; z: number }> {
  const npcs = useNpcStore.getState().npcs;
  const occupancy: Record<string, string[]> = {};
  for (const [id, entry] of Object.entries(npcs)) {
    const schedule = entry.def.schedule;
    if (!schedule || schedule.length === 0) continue;
    const active = activeSchedule(schedule, hour);
    const location = active?.location ?? '';
    if (!location) continue;
    if (!occupancy[location]) occupancy[location] = [];
    occupancy[location].push(id);
  }
  const targets: Record<string, { x: number; z: number }> = {};
  for (const [location, ids] of Object.entries(occupancy)) {
    const anchor = LOCATION_ANCHORS[location] ?? FALLBACK_ANCHOR;
    ids.forEach((id, idx) => {
      const offset = spreadOffset(idx);
      targets[id] = { x: anchor.x + offset.x, z: anchor.z + offset.z };
    });
  }
  return targets;
}

/** Null-rendering component that drives NPC movement each frame. */
export function NpcScheduler(): null {
  const setPosition = useNpcStore((s) => s.setPosition);
  const setMoving = useNpcStore((s) => s.setMoving);

  const targetsRef = useRef<Record<string, { x: number; z: number }>>({});
  const smoothRef = useRef<Record<string, { x: number; z: number }>>({});

  useEffect(() => {
    const hour = useTimeStore.getState().hour;
    targetsRef.current = buildTargets(hour);
    const npcs = useNpcStore.getState().npcs;
    for (const [id, entry] of Object.entries(npcs)) {
      if (!smoothRef.current[id]) {
        smoothRef.current[id] = { ...entry.worldPos };
      }
    }
  }, []);

  useEffect(() => {
    const unsubTime = useTimeStore.subscribe((state) => {
      targetsRef.current = buildTargets(state.hour);
    });
    return () => unsubTime();
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
        smoothRef.current[id] = { ...target };
        setPosition(id, target);
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
