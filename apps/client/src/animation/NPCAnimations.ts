/**
 * Shared animation constants for NPC sprites.
 *
 * NPC_ANIM_FPS  – frames per second for the walk-cycle SpriteAnimator.
 * NPC_MOVE_THRESHOLD – minimum world-unit delta per frame to count as "moving"
 *                      (used by NpcView to toggle the walk animation).
 */

export const NPC_ANIM_FPS = 6;

/** Minimum per-frame position change (world units) to treat an NPC as moving. */
export const NPC_MOVE_THRESHOLD = 0.001;
