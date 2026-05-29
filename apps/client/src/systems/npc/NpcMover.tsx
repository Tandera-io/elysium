/**
 * NpcMover — scene-level system component that drives NPC world-position
 * updates each frame.
 *
 * Phase 1 (current): NPCs stay at their spawn positions defined in each NPC
 * JSON's `position` field.  The component exists so that future schedule-based
 * or pathfinding-driven movement can be added here without changing Scene.tsx.
 *
 * Renders nothing; all work is done as a side-effect inside useFrame.
 */

export function NpcMover(): null {
  // No per-frame movement logic yet — NPCs sit at their spawn positions.
  // Future: subscribe to useTimeStore to drive schedule-based pathing.
  return null;
}
