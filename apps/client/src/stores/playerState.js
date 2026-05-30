/**
 * Player state store — tracks persistent player attributes including tool tiers.
 *
 * Tool tiers are stored here so they persist across gameplay sessions and
 * can be read by both the upgrade menu and the farming system.
 */

import { create } from 'zustand';
import { getToolUpgrade } from '../features/farming/toolUpgrades.js';

const DEFAULT_TOOL_TIERS = {
  shovel: 'basic',
  rake: 'basic',
  wateringCan: 'basic',
  hoe: 'basic',
};

export const usePlayerStateStore = create((set, get) => ({
  /** Current tier for each upgradeable tool. */
  toolTiers: { ...DEFAULT_TOOL_TIERS },

  /**
   * Upgrade a tool to the specified tier.
   * Caller is responsible for deducting gold before calling this.
   */
  upgradeToolTier(toolId, newTier) {
    set((s) => ({
      toolTiers: { ...s.toolTiers, [toolId]: newTier },
    }));
  },

  /** Returns the current upgrade tier for a tool. */
  getToolTier(toolId) {
    return get().toolTiers[toolId] ?? 'basic';
  },

  /**
   * Returns the full stats object for a tool at its current tier.
   * Returns null if toolId is unknown.
   */
  getToolStats(toolId) {
    const tier = get().toolTiers[toolId] ?? 'basic';
    return getToolUpgrade(toolId, tier);
  },

  /** Reset all tools to basic (new game). */
  resetTools() {
    set({ toolTiers: { ...DEFAULT_TOOL_TIERS } });
  },
}));
