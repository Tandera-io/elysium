/**
 * dialogueStore — JS façade for the Zustand dialogue state.
 *
 * Re-exports the TypeScript dialogue store so that JS components
 * (e.g. apps/client/src/components/NPCs/Dorinha.js) can import it
 * without TypeScript syntax.
 *
 * The underlying store lives at:
 *   apps/client/src/systems/dialogue/dialogueStore.ts
 *
 * Re-exported here for backwards compatibility and JS interop.
 */
export { useDialogueStore } from '../systems/dialogue/dialogueStore';
