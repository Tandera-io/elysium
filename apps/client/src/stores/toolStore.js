/**
 * Tool inventory store for the player's farming and mining tools.
 * Tracks equipped tool, tool inventory, durability, and storage capacity.
 */

import { create } from 'zustand';

/**
 * @typedef {'hoe' | 'watering_can' | 'scythe' | 'pickaxe' | 'shovel' | 'bucket'} ToolType
 *
 * @typedef {{
 *   id: string;
 *   name: string;
 *   type: ToolType;
 *   durability: number;
 *   maxDurability: number;
 *   sprite: string;
 * }} Tool
 *
 * @typedef {{
 *   tools: Tool[];
 *   equippedTool: string | null;
 *   toolSlots: number;
 * }} ToolState
 *
 * @typedef {{
 *   equipTool: (toolId: string) => void;
 *   unequipTool: () => void;
 *   useTool: () => boolean;
 *   addTool: (tool: Tool) => boolean;
 *   removeTool: (toolId: string) => boolean;
 *   repairTool: (toolId: string) => boolean;
 *   getEquipped: () => Tool | null;
 *   reset: () => void;
 * }} ToolActions
 */

const TOOL_SLOTS_DEFAULT = 6;

const DEFAULT_DURABILITY = {
  hoe: 60,
  watering_can: 80,
  scythe: 60,
  pickaxe: 100,
  shovel: 70,
  bucket: 50,
};

const TOOL_NAMES = {
  hoe: 'Enxada',
  watering_can: 'Regador',
  scythe: 'Foice',
  pickaxe: 'Picareta',
  shovel: 'Pa',
  bucket: 'Balde',
};

/** @returns {ToolState} */
function makeInitial() {
  return {
    tools: [],
    equippedTool: null,
    toolSlots: TOOL_SLOTS_DEFAULT,
  };
}

/**
 * @param {ToolType} type
 * @returns {Tool}
 */
export function makeToolTemplate(type) {
  const max = DEFAULT_DURABILITY[type] ?? 50;
  return {
    id: `${type}_${Date.now()}`,
    name: TOOL_NAMES[type] ?? type,
    type,
    durability: max,
    maxDurability: max,
    sprite: `sprites/crafts/${type}.svg`,
  };
}

export const useToolStore = create((set, get) => ({
  ...makeInitial(),

  /**
   * Equip a tool by its id. No-op if tool does not exist.
   * @param {string} toolId
   */
  equipTool: (toolId) => {
    const found = get().tools.find((t) => t.id === toolId);
    if (!found) return;
    set({ equippedTool: toolId });
  },

  /** Unequip whatever is currently equipped. */
  unequipTool: () => {
    set({ equippedTool: null });
  },

  /**
   * Use the currently equipped tool — reduces durability by 1.
   * If durability reaches 0 the tool breaks and is removed from inventory.
   * Returns true when a tool was used, false when no tool is equipped.
   */
  useTool: () => {
    const { equippedTool, tools } = get();
    if (!equippedTool) return false;

    const idx = tools.findIndex((t) => t.id === equippedTool);
    if (idx === -1) return false;

    const tool = tools[idx];
    const newDurability = tool.durability - 1;

    if (newDurability <= 0) {
      // Tool breaks — remove from inventory and unequip
      const remaining = tools.filter((t) => t.id !== equippedTool);
      set({ tools: remaining, equippedTool: null });
    } else {
      const updated = [...tools];
      updated[idx] = { ...tool, durability: newDurability };
      set({ tools: updated });
    }
    return true;
  },

  /**
   * Add a tool to inventory. Returns false if inventory is full.
   * @param {Tool} tool
   */
  addTool: (tool) => {
    const { tools, toolSlots } = get();
    if (tools.length >= toolSlots) return false;
    set({ tools: [...tools, tool] });
    return true;
  },

  /**
   * Remove a tool from inventory by id. Unequips it first if it was equipped.
   * Returns true if found and removed.
   * @param {string} toolId
   */
  removeTool: (toolId) => {
    const { tools, equippedTool } = get();
    const found = tools.find((t) => t.id === toolId);
    if (!found) return false;
    const remaining = tools.filter((t) => t.id !== toolId);
    const nextEquipped = equippedTool === toolId ? null : equippedTool;
    set({ tools: remaining, equippedTool: nextEquipped });
    return true;
  },

  /**
   * Restore a tool's durability to its maximum.
   * Returns true if the tool was found and repaired.
   * @param {string} toolId
   */
  repairTool: (toolId) => {
    const { tools } = get();
    const idx = tools.findIndex((t) => t.id === toolId);
    if (idx === -1) return false;
    const tool = tools[idx];
    if (tool.durability === tool.maxDurability) return false;
    const updated = [...tools];
    updated[idx] = { ...tool, durability: tool.maxDurability };
    set({ tools: updated });
    return true;
  },

  /**
   * Return the currently equipped Tool object, or null.
   * @returns {Tool | null}
   */
  getEquipped: () => {
    const { equippedTool, tools } = get();
    if (!equippedTool) return null;
    return tools.find((t) => t.id === equippedTool) ?? null;
  },

  /** Reset store to initial state (for testing / new game). */
  reset: () => set(makeInitial()),
}));

if (typeof globalThis !== 'undefined' && import.meta.env?.DEV) {
  globalThis.__toolStore = useToolStore;
}
