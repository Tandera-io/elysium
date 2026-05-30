/**
 * Tool upgrade definitions and helper functions.
 *
 * Each tool has five tiers: basic → copper → iron → gold → iridium.
 * Higher tiers improve crop yield, action speed, and energy efficiency.
 */

export const TOOLS = {
  shovel: { id: 'shovel', name: 'Shovel', emoji: '⛏️', description: 'Clears plots and digs soil' },
  rake: { id: 'rake', name: 'Rake', emoji: '🌾', description: 'Prepares soil for planting' },
  wateringCan: {
    id: 'wateringCan',
    name: 'Watering Can',
    emoji: '🪣',
    description: 'Waters crops to aid growth',
  },
  hoe: { id: 'hoe', name: 'Hoe', emoji: '🌱', description: 'Tills soil for planting' },
};

export const UPGRADE_TIERS = ['basic', 'copper', 'iron', 'gold', 'iridium'];

const TIER_RANK = { basic: 0, copper: 1, iron: 2, gold: 3, iridium: 4 };

/**
 * Tier definitions shared across all tools.
 * cropYieldBonus: multiplier on harvest quantity (1.0 = no change).
 * speedBonus: multiplier on action speed (higher = faster).
 * energyCostMultiplier: multiplier on energy per use (lower = cheaper).
 */
const TIER_STATS = {
  basic: {
    name: 'Basic',
    description: 'Standard tool. Gets the job done.',
    cost: 0,
    materials: [],
    cropYieldBonus: 1.0,
    speedBonus: 1.0,
    energyCostMultiplier: 1.0,
  },
  copper: {
    name: 'Copper',
    description: 'Light copper head. Slightly faster.',
    cost: 2000,
    materials: [{ item: 'Copper Bar', qty: 5 }],
    cropYieldBonus: 1.1,
    speedBonus: 1.2,
    energyCostMultiplier: 0.9,
  },
  iron: {
    name: 'Iron',
    description: 'Solid iron construction. Noticeably stronger.',
    cost: 5000,
    materials: [{ item: 'Iron Bar', qty: 5 }],
    cropYieldBonus: 1.25,
    speedBonus: 1.4,
    energyCostMultiplier: 0.75,
  },
  gold: {
    name: 'Gold',
    description: 'Gleaming gold edge. Exceptional efficiency.',
    cost: 10000,
    materials: [{ item: 'Gold Bar', qty: 5 }],
    cropYieldBonus: 1.5,
    speedBonus: 1.6,
    energyCostMultiplier: 0.6,
  },
  iridium: {
    name: 'Iridium',
    description: 'Forged from rare iridium. The pinnacle of craftsmanship.',
    cost: 25000,
    materials: [{ item: 'Iridium Bar', qty: 5 }],
    cropYieldBonus: 2.0,
    speedBonus: 2.0,
    energyCostMultiplier: 0.4,
  },
};

/** Returns the full stats object for a tool at a given tier. */
export function getToolUpgrade(toolId, tier) {
  if (!TOOLS[toolId]) return null;
  if (!TIER_STATS[tier]) return null;
  return { tool: TOOLS[toolId], tier, ...TIER_STATS[tier] };
}

/** Returns the next tier upgrade for a tool, or null if already at max. */
export function getNextUpgrade(toolId, currentTier) {
  const currentRank = TIER_RANK[currentTier] ?? 0;
  const nextTierName = UPGRADE_TIERS[currentRank + 1];
  if (!nextTierName) return null;
  return getToolUpgrade(toolId, nextTierName);
}

/**
 * Checks whether the player can afford the next upgrade.
 * playerState shape: { gold: number, toolTiers: Record<string, string> }
 */
export function canUpgrade(playerState, toolId) {
  const currentTier = playerState.toolTiers?.[toolId] ?? 'basic';
  const next = getNextUpgrade(toolId, currentTier);
  if (!next) return false;
  return (playerState.gold ?? 0) >= next.cost;
}

/** Returns the effective stats for a tool at the player's current tier. */
export function getEffectiveStats(playerState, toolId) {
  const tier = playerState.toolTiers?.[toolId] ?? 'basic';
  return getToolUpgrade(toolId, tier);
}
