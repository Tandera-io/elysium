/**
 * Type declarations for Dorinha.js — Dorinha NPC component.
 */

/** The canonical NPC ID for Dorinha. */
export declare const DORINHA_ID: string;

/** A predefined dialogue option displayed as a quick-select button. */
export interface DorinhaDialogueOption {
  id: string;
  text: string;
}

/** Predefined dialogue options players can choose when talking to Dorinha. */
export declare const DORINHA_DIALOGUE_OPTIONS: DorinhaDialogueOption[];

/**
 * Returns true if the given npcId belongs to Dorinha.
 * @param npcId - the NPC ID from the dialogue store
 */
export declare function isDorinha(npcId: string | null): boolean;
