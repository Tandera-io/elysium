/**
 * Re-exports the shared choice dialogue store so that systems/npc/InteractPrompt
 * can import it from a relative path without crossing many directory levels.
 */
export { useChoiceDialogueStore, type DialogueTree } from '../../stores/dialogueStore';
