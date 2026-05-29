/**
 * Dorinha — seed-merchant NPC component.
 *
 * Renders Dorinha in the 3-D world and wires her predefined dialogues into the
 * dialogue store so players can talk to her even when ANTHROPIC_API_KEY is not
 * configured.
 *
 * Usage:
 *   <Dorinha />   — drop inside the R3F canvas (handled by NpcView already).
 *
 * The component also exposes a standalone hook `useDorinhaDialogue` that the
 * DialogueBox can call to seed Dorinha's opening line from the predefined set.
 */

import { useEffect } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useTimeStore } from '../systems/time/timeStore';
import { getDorinhaGreeting, getDorinhaDialogue } from '../dialogue/DorinhaDialogues';

const DORINHA_NPC_ID = 'dorinha';

/**
 * Hook: when dialogue with Dorinha opens and the history is empty, pre-populates
 * the first NPC turn with a time-appropriate greeting from the predefined set.
 *
 * This provides immediate feedback to the player without needing an API round-trip.
 */
export function useDorinhaDialogue() {
  const npcId = useDialogueStore((s) => s.npcId);
  const history = useDialogueStore((s) => s.history);
  const hour = useTimeStore((s) => s.hour);

  useEffect(() => {
    if (npcId !== DORINHA_NPC_ID) return;
    if (history.length > 0) return; // already has messages — don't overwrite

    const greeting = getDorinhaGreeting(hour);
    // Inject the greeting directly into the dialogue history as an NPC turn.
    useDialogueStore.setState((s) => ({
      history: [
        ...s.history,
        {
          who: 'npc' as const,
          text: greeting.text,
          emotion: greeting.emotion,
          timestamp: Date.now(),
        },
      ],
    }));
  }, [npcId, history.length, hour]);
}

/**
 * Resolves a dialogue node id to a Dorinha dialogue line and appends it to the
 * dialogue history. Used when the player selects a predefined choice that maps
 * to a local dialogue node (e.g. 'farewell', 'chat', etc.) rather than sending
 * free text to the server.
 */
export function resolveDorinhaChoice(nodeId: string): boolean {
  if (nodeId === '__open_shop__') return false; // caller handles shop opening
  const line = getDorinhaDialogue(nodeId);
  if (!line) return false;

  useDialogueStore.setState((s) => ({
    history: [
      ...s.history,
      {
        who: 'npc' as const,
        text: line.text,
        emotion: line.emotion,
        timestamp: Date.now(),
      },
    ],
  }));
  return true;
}

/**
 * Dorinha component — mounts the dialogue hook so predefined lines are
 * injected when the player opens a conversation with her.
 *
 * This is a UI-layer component (no 3-D geometry — the 3-D sprite is handled
 * by NpcView). Mount it once at the app level alongside DialogueBox.
 */
export function Dorinha() {
  useDorinhaDialogue();
  return null; // no DOM output; side-effects only
}
