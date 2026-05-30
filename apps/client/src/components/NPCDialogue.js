import React from 'react';
import { DialogueBox } from '../ui/DialogueBox';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';

/**
 * NPCDialogue — thin wrapper around DialogueBox.
 * Renders the dialogue UI only when a dialogue is currently open.
 */
export function NPCDialogue() {
  const npcId = useDialogueStore((s) => s.npcId);
  if (!npcId) return null;
  return React.createElement(DialogueBox, null);
}
