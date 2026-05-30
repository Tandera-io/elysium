/**
 * NPCDialog.jsx
 *
 * Thin wrapper around DialogueBox that exposes the NPC dialogue UI
 * without requiring TypeScript consumers to import the TS component.
 *
 * Renders nothing when no dialogue is active (controlled by dialogueStore).
 *
 * Example:
 *   import { NPCDialog } from './components/NPCDialog.jsx';
 *   <NPCDialog />
 */
import { DialogueBox } from '../ui/DialogueBox';

export function NPCDialog() {
  return <DialogueBox />;
}
