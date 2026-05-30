/**
 * Tool manager: maps tool types to tile effects and validates tool use.
 * Returns effect descriptors that the game world can apply to tiles.
 */

/**
 * @typedef {'hoe' | 'watering_can' | 'scythe' | 'pickaxe' | 'shovel' | 'bucket'} ToolType
 *
 * @typedef {'empty' | 'tilled' | 'planted' | 'rock' | 'water' | 'harvestable'} TileType
 *
 * @typedef {{
 *   id: string;
 *   type: ToolType;
 *   durability: number;
 *   maxDurability: number;
 * }} Tool
 *
 * @typedef {{
 *   type: TileType;
 *   cropId?: string;
 *   watered?: boolean;
 *   [key: string]: unknown;
 * }} Tile
 *
 * @typedef {{
 *   action: string;
 *   tileType?: TileType;
 *   payload?: Record<string, unknown>;
 * }} ToolEffect
 */

/**
 * Defines which tile types each tool can act upon and what effect it produces.
 *
 * @type {Record<ToolType, { validTiles: TileType[]; effect: string; description: string }>}
 */
const TOOL_RULES = {
  hoe: {
    validTiles: ['empty'],
    effect: 'till',
    description: 'Tills empty soil, making it ready for planting.',
  },
  watering_can: {
    validTiles: ['tilled', 'planted'],
    effect: 'water',
    description: 'Waters tilled or planted tiles.',
  },
  scythe: {
    validTiles: ['harvestable', 'planted'],
    effect: 'harvest',
    description: 'Harvests mature crops from the tile.',
  },
  pickaxe: {
    validTiles: ['rock'],
    effect: 'breakRock',
    description: 'Breaks rocks and ore deposits.',
  },
  shovel: {
    validTiles: ['tilled', 'planted', 'empty'],
    effect: 'dig',
    description: 'Digs up tilled soil or clears planted tiles.',
  },
  bucket: {
    validTiles: ['water'],
    effect: 'collectWater',
    description: 'Collects water from rivers or water tiles.',
  },
};

/**
 * Returns the effect descriptor for a given tool type on a given tile type.
 * Returns null when the tool cannot act on that tile type.
 *
 * @param {ToolType} toolType
 * @param {TileType} tileType
 * @returns {ToolEffect | null}
 */
export function getToolEffect(toolType, tileType) {
  const rule = TOOL_RULES[toolType];
  if (!rule) return null;
  if (!rule.validTiles.includes(tileType)) return null;

  return {
    action: rule.effect,
    tileType,
    payload: {},
  };
}

/**
 * Check whether a tool can be used on a tile.
 *
 * @param {Tool} tool
 * @param {Tile} tile
 * @returns {{ allowed: boolean; reason?: string }}
 */
export function canUseTool(tool, tile) {
  if (!tool) return { allowed: false, reason: 'No tool provided.' };
  if (tool.durability <= 0) return { allowed: false, reason: 'Tool is broken.' };

  const rule = TOOL_RULES[tool.type];
  if (!rule) return { allowed: false, reason: `Unknown tool type: ${tool.type}` };

  if (!rule.validTiles.includes(tile.type)) {
    return {
      allowed: false,
      reason: `${tool.type} cannot be used on a ${tile.type} tile. Valid tile types: ${rule.validTiles.join(', ')}.`,
    };
  }

  return { allowed: true };
}

/**
 * Apply a tool to a tile within the game state.
 * Mutates and returns a new tile state object — does not modify in place.
 *
 * @param {Tool} tool
 * @param {Tile} tile
 * @param {Record<string, unknown>} [gameState]  Optional game-state context (e.g., day counter).
 * @returns {{ success: boolean; newTile?: Tile; effect?: ToolEffect; reason?: string }}
 */
export function applyToolToTile(tool, tile, gameState = {}) {
  const check = canUseTool(tool, tile);
  if (!check.allowed) {
    return { success: false, reason: check.reason };
  }

  const effect = getToolEffect(tool.type, tile.type);
  if (!effect) {
    return { success: false, reason: 'No effect defined for this tool/tile combination.' };
  }

  let newTile = { ...tile };

  switch (effect.action) {
    case 'till':
      // hoe on empty → tilled
      newTile = {
        type: 'tilled',
        watered: false,
        tilledOnDay: gameState.day ?? 1,
      };
      break;

    case 'water':
      // watering_can on tilled or planted → mark as watered
      newTile = { ...newTile, watered: true };
      break;

    case 'harvest': {
      // scythe on harvestable → return yield info in effect payload
      const cropId = tile.cropId ?? 'unknown';
      effect.payload = { cropId, quantity: 1 };
      newTile = { type: 'empty' };
      break;
    }

    case 'breakRock':
      // pickaxe on rock → remove rock, drop ore
      effect.payload = { drops: ['stone'] };
      newTile = { type: 'empty' };
      break;

    case 'dig':
      // shovel on any valid tile → clear back to empty
      newTile = { type: 'empty' };
      break;

    case 'collectWater':
      // bucket on water → water tile stays, bucket fills
      effect.payload = { waterCollected: true };
      break;

    default:
      return { success: false, reason: `Unhandled effect action: ${effect.action}` };
  }

  return { success: true, newTile, effect };
}

/**
 * Return the list of tile types a tool type can be used on.
 *
 * @param {ToolType} toolType
 * @returns {TileType[]}
 */
export function getValidTilesForTool(toolType) {
  return TOOL_RULES[toolType]?.validTiles ?? [];
}

/**
 * Return human-readable description of what a tool does.
 *
 * @param {ToolType} toolType
 * @returns {string}
 */
export function getToolDescription(toolType) {
  return TOOL_RULES[toolType]?.description ?? 'Unknown tool.';
}
