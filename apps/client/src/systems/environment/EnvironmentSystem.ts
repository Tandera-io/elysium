/**
 * EnvironmentSystem — visual and gameplay effects driven by day/night phase.
 *
 * Responsibilities:
 *  - Expose per-phase ambient multipliers consumed by Daylight.tsx
 *  - Track NPC availability (are they "home" / active at this hour?)
 *  - Drive fog density changes between day and night
 *  - Provide a Zustand-compatible selector hook for UI overlays
 *
 * This system is intentionally stateless (pure functions + a lightweight
 * hook) so that React/R3F components control their own subscriptions.
 */

import { useTimeStore } from '../time/timeStore';
import { phaseFor, lightLevelFor, type DayPhase } from '../time/TimeSystem';

// ---------------------------------------------------------------------------
// Fog settings per phase
// ---------------------------------------------------------------------------

export interface FogSettings {
  /** CSS/THREE hex or rgb tuple for fog color (matches sky). */
  color: string;
  near: number;
  far: number;
}

const FOG_BY_PHASE: Record<DayPhase, FogSettings> = {
  dawn: { color: '#8c7090', near: 60, far: 140 },
  day: { color: '#7fbfe6', near: 80, far: 160 },
  dusk: { color: '#e0905a', near: 60, far: 130 },
  night: { color: '#0d1428', near: 40, far: 100 },
};

export function fogSettingsFor(hour: number): FogSettings {
  return FOG_BY_PHASE[phaseFor(hour)];
}

// ---------------------------------------------------------------------------
// Ambient gameplay modifiers
// ---------------------------------------------------------------------------

export interface EnvironmentModifiers {
  /** Crop growth rate multiplier (night slightly slower). */
  cropGrowthRate: number;
  /** NPC movement speed multiplier. */
  npcSpeedMultiplier: number;
  /** Whether shops are open. */
  shopsOpen: boolean;
  /** Overlay tint opacity (0 = none, 1 = full night tint). */
  nightOverlayOpacity: number;
}

export function environmentModifiersFor(hour: number): EnvironmentModifiers {
  const phase = phaseFor(hour);
  const light = lightLevelFor(hour);

  return {
    cropGrowthRate: phase === 'night' ? 0.5 : 1.0,
    npcSpeedMultiplier: phase === 'night' ? 0.4 : 1.0,
    shopsOpen: hour >= 7 && hour < 20,
    // Night overlay: lerp from 0 (full light) to 0.55 (full dark)
    nightOverlayOpacity: Math.max(0, (1 - light) * 0.55),
  };
}

// ---------------------------------------------------------------------------
// NPC home/sleep detection
// ---------------------------------------------------------------------------

/** Hours after which NPCs return home and go to sleep. */
export const NPC_SLEEP_HOUR = 21;
/** Hour NPCs wake up. */
export const NPC_WAKE_HOUR = 6;

export function isNpcAsleep(hour: number): boolean {
  return hour >= NPC_SLEEP_HOUR || hour < NPC_WAKE_HOUR;
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export interface EnvironmentState {
  phase: DayPhase;
  lightLevel: number;
  fog: FogSettings;
  modifiers: EnvironmentModifiers;
  npcAsleep: boolean;
}

/** React hook — subscribes to timeStore and returns full environment state. */
export function useEnvironmentSystem(): EnvironmentState {
  return useTimeStore((s) => {
    const h = s.hour;
    return {
      phase: phaseFor(h),
      lightLevel: lightLevelFor(h),
      fog: fogSettingsFor(h),
      modifiers: environmentModifiersFor(h),
      npcAsleep: isNpcAsleep(h),
    };
  });
}

if (import.meta.env.DEV) {
  (
    window as unknown as {
      __env: {
        fogSettingsFor: typeof fogSettingsFor;
        environmentModifiersFor: typeof environmentModifiersFor;
      };
    }
  ).__env = { fogSettingsFor, environmentModifiersFor };
}
