/**
 * Type declarations for PlayerInteractions.js
 */

import type { TileCoord } from '../engine/world/WorldGrid';
import type { ToolId } from '../store/toolStore';

export interface ToolResult {
  success: boolean;
  action: string;
  reason?: string;
  cropId?: string;
  result?: { crop: string; quantity: number };
}

/** Apply the given tool to a farm tile coordinate. */
export function applyToolToTile(coord: TileCoord, toolId: ToolId): ToolResult;

/** Attempt a farming interaction at the player's current position (legacy path). */
export function tryFarmInteraction(): string | null;

/**
 * Mount a global keydown listener for farming interactions.
 * Returns a cleanup function.
 */
export function mountFarmingInteractions(): () => void;

/**
 * React component that mounts keyboard listeners (F key = tool-aware,
 * E key = legacy auto-action). Renders nothing.
 */
export function PlayerInteractionsProvider(): null;

/**
 * Hook returning a callback to apply the active tool to a tile on click.
 */
export function useFarmTileClick(): (coord: TileCoord) => ToolResult;
