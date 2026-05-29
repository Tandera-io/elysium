/**
 * Dorinha — Seed Seller NPC component.
 *
 * Provides predefined dialogue options for interacting with Dorinha.
 * When ANTHROPIC_API_KEY is not configured on the server, the dialogue
 * route falls back to the mock_responses defined in dorinha.json.
 *
 * Usage:
 *   import { DORINHA_ID, DORINHA_DIALOGUE_OPTIONS } from './Dorinha';
 *   // Use DORINHA_ID to open dialogue: useDialogueStore.getState().open(DORINHA_ID)
 *   // Use DORINHA_DIALOGUE_OPTIONS to pre-populate quick replies in the UI
 */

/** The canonical NPC ID for Dorinha — matches dorinha.json and npcStore. */
export const DORINHA_ID = 'dorinha';

/**
 * Predefined dialogue option texts that players can choose when talking to Dorinha.
 * Each option maps to a player input that triggers a contextual response from Dorinha.
 * These are displayed as quick-select buttons in the DialogueBox when npcId === DORINHA_ID.
 */
export const DORINHA_DIALOGUE_OPTIONS = [
  { id: 'greeting', text: 'Oi, Dorinha! Tudo bem?' },
  { id: 'seeds', text: 'Quero comprar sementes.' },
  { id: 'tips', text: 'Tem alguma dica de plantio?' },
  { id: 'weather', text: 'Como tá o tempo pra plantar?' },
  { id: 'bye', text: 'Até mais, Dorinha!' },
];

/**
 * Returns true if the given npcId belongs to Dorinha.
 * Use this to conditionally render Dorinha-specific dialogue options.
 *
 * @param {string | null} npcId
 * @returns {boolean}
 */
export function isDorinha(npcId) {
  return npcId === DORINHA_ID;
}
