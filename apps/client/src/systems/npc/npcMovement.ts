import { useNpcStore } from './npcStore';

/** Per-NPC transient movement state. Not persisted — resets each session. */
export interface NpcMovementState {
  /** Home position — NPC wanders within wanderRadius of this point. */
  anchor: { x: number; z: number };
  /** Current walk destination. */
  target: { x: number; z: number };
  /** Walk speed in world-units per second. */
  speed: number;
  /** Max distance from anchor the NPC will roam. */
  wanderRadius: number;
  /** Seconds remaining before NPC starts walking again (0 = ready to move). */
  pauseTimer: number;
}

/**
 * Create the initial movement state for one NPC.
 * @param anchor - NPC's home position (usually from def.position).
 * @param rng    - Caller-supplied random function so callers can seed for tests.
 */
export function createMovementState(
  anchor: { x: number; z: number },
  rng: () => number = Math.random,
): NpcMovementState {
  return {
    anchor,
    target: { ...anchor },
    speed: 0.6 + rng() * 0.6, // 0.6–1.2 units/s
    wanderRadius: 3 + rng() * 4, // 3–7 units from anchor
    pauseTimer: rng() * 4, // stagger first walks by 0–4 s
  };
}

/**
 * Pure movement tick for one NPC. Returns the new position and updated state.
 *
 * @param delta  - Frame delta in seconds.
 * @param pos    - Current world position.
 * @param state  - Current movement state (immutable input).
 * @param rng    - Random function (injectable for tests).
 */
export function tickMovement(
  delta: number,
  pos: { x: number; z: number },
  state: NpcMovementState,
  rng: () => number = Math.random,
): { newPos: { x: number; z: number }; newState: NpcMovementState } {
  if (state.pauseTimer > 0) {
    return {
      newPos: pos,
      newState: { ...state, pauseTimer: Math.max(0, state.pauseTimer - delta) },
    };
  }

  const dx = state.target.x - pos.x;
  const dz = state.target.z - pos.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.1) {
    // Reached target — pick next random destination and pause.
    const angle = rng() * Math.PI * 2;
    const radius = rng() * state.wanderRadius;
    const newTarget = {
      x: state.anchor.x + Math.cos(angle) * radius,
      z: state.anchor.z + Math.sin(angle) * radius,
    };
    return {
      newPos: pos,
      newState: { ...state, target: newTarget, pauseTimer: 2 + rng() * 4 },
    };
  }

  const step = Math.min(state.speed * delta, dist);
  return {
    newPos: {
      x: pos.x + (dx / dist) * step,
      z: pos.z + (dz / dist) * step,
    },
    newState: state,
  };
}

/** Registry of movement states keyed by NPC id. Module-level so it survives re-renders. */
const _movementStates = new Map<string, NpcMovementState>();

/**
 * Advance all registered NPCs by one frame delta.
 * Call this from a useFrame hook. Writes new positions to the NpcStore.
 */
export function tickAllNpcs(delta: number): void {
  const { npcs, setPosition } = useNpcStore.getState();

  for (const [id, entry] of Object.entries(npcs)) {
    if (!_movementStates.has(id)) {
      _movementStates.set(id, createMovementState(entry.worldPos));
    }
    const state = _movementStates.get(id)!;
    const { newPos, newState } = tickMovement(delta, entry.worldPos, state);
    _movementStates.set(id, newState);
    if (newPos.x !== entry.worldPos.x || newPos.z !== entry.worldPos.z) {
      setPosition(id, newPos);
    }
  }
}

/** Reset movement state for a specific NPC (e.g. after a schedule teleport). */
export function resetNpcMovement(id: string): void {
  _movementStates.delete(id);
}
