/**
 * stores/npcStore.js — JS-compatible re-export of the NPC Zustand store.
 *
 * The canonical store implementation lives in:
 *   systems/npc/npcStore.ts
 *
 * This shim allows plain JS modules (e.g. components/NPCs/Dorinha.js) to
 * import the store without a TypeScript dependency, while keeping the
 * single source of truth in the TypeScript source.
 *
 * Exports:
 *   - useNpcStore : Zustand hook (state + actions)
 *
 * Usage:
 *   import { useNpcStore } from '../../stores/npcStore';
 *   const entry = useNpcStore(s => s.npcs['dorinha']);
 */

// Vite resolves .ts before .js when both exist at the same path, so
// importing from the TS source directly keeps bundle deduplication intact.
export { useNpcStore } from '../systems/npc/npcStore';
