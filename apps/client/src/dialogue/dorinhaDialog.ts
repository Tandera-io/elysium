/**
 * Dorinha's branching dialogue tree — imported by InteractPrompt when the
 * player presses E near her.
 */
import type { DialogueTree } from '../stores/dialogueStore';
import dorinhaTreeJson from '../assets/dialogue/dorinha.json';

export const dorinhaDialogue: DialogueTree = dorinhaTreeJson as unknown as DialogueTree;
