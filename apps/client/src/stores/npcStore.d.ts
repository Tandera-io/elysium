// Type declarations for the JS adapter module stores/npcStore.js
// Allows TypeScript consumers to import with full types.

import type { StoreApi, UseBoundStore } from 'zustand';
import type { NpcState, NpcActions, NpcStateEntry } from '../systems/npc/npcStore';
import type { DialogueState, DialogueActions } from '../systems/dialogue/dialogueStore';

// ---------------------------------------------------------------------------
// Re-exported TS stores
// ---------------------------------------------------------------------------

export declare const useNpcStore: UseBoundStore<StoreApi<NpcState & NpcActions>>;
export declare const useDialogueStore: UseBoundStore<StoreApi<DialogueState & DialogueActions>> & {
  setState: (
    partial:
      | Partial<DialogueState & DialogueActions>
      | ((state: DialogueState & DialogueActions) => Partial<DialogueState & DialogueActions>),
  ) => void;
  getState: () => DialogueState & DialogueActions;
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export declare function useNpcs(): Record<string, NpcStateEntry>;
export declare function useNpcById(id: string): NpcStateEntry | null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export declare const NPC_IDS: {
  readonly NINA: 'nina';
  readonly DORINHA: 'dorinha';
  readonly MARINA: 'marina';
  readonly BENTO: 'bento';
  readonly LUCIA: 'lucia';
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export declare const NPC_GREETINGS: Record<string, string>;

export declare function getNpcGreeting(
  npcId: string,
  context?: { interactionCount?: number; heartLevel?: number },
): string;

export interface QuickReply {
  label: string;
  input: string;
}

export interface NpcDialogueConfig {
  npcId: string;
  greetings: QuickReply[];
  topics: Record<string, QuickReply[]>;
  shopTriggerPhrases: string[];
}

export declare function getNpcDialogue(npcId: string): NpcDialogueConfig | null;

// ---------------------------------------------------------------------------
// Pipeline re-exports
// ---------------------------------------------------------------------------

export declare const PLAYER_ACTIONS: {
  readonly GREET: 'greet';
  readonly BUY: 'buy';
  readonly SELL: 'sell';
  readonly GIVE_GIFT: 'give_gift';
  readonly HARVEST: 'harvest';
  readonly WATER: 'water';
  readonly PLANT: 'plant';
  readonly TALK: 'talk';
  readonly QUEST_ACCEPT: 'quest_accept';
  readonly QUEST_COMPLETE: 'quest_complete';
  readonly GOODBYE: 'goodbye';
};

export type RelationshipTier = 'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend';

export declare function classifyContext(context?: {
  interactionCount?: number;
  heartLevel?: number;
}): RelationshipTier;

export declare function getActionResponse(
  npcId: string,
  playerAction: string,
  context?: { interactionCount?: number; heartLevel?: number },
): string;

export declare function getFirstMeetingLine(npcId: string, seed?: number): string;

export declare function getRepeatVisitLine(
  npcId: string,
  context?: { interactionCount?: number; heartLevel?: number },
): string;

// ---------------------------------------------------------------------------
// Conversation-tree types
// ---------------------------------------------------------------------------

export interface DialogueChoice {
  id: string;
  label: string;
  next: string | null;
}

export interface DialogueNode {
  id: string;
  text: string;
  choices: DialogueChoice[];
}

export declare const NPC_DIALOGUES: Record<
  string,
  { name: string; role: string; tree: Record<string, DialogueNode> }
>;

// ---------------------------------------------------------------------------
// Per-NPC dialogue state entry
// ---------------------------------------------------------------------------

export interface NpcDialogueEntry {
  hasGreeted: boolean;
  interactionCount: number;
  heartLevel: number;
  currentLines: string[];
}

// ---------------------------------------------------------------------------
// Zustand conversation-tree store with per-NPC dialogue state tracking
// ---------------------------------------------------------------------------

export interface NpcDialogueStoreState {
  activeNpcId: string | null;
  currentNodeId: string;
  npcState: Record<string, NpcDialogueEntry>;
  open: (npcId: string) => void;
  close: () => void;
  choose: (choiceId: string) => void;
  triggerAction: (npcId: string, action: string) => string[];
  gainHeart: (npcId: string, amount?: number) => void;
}

export declare const useNpcDialogueStore: UseBoundStore<StoreApi<NpcDialogueStoreState>> & {
  getState: () => NpcDialogueStoreState;
};

// ---------------------------------------------------------------------------
// Action-reaction bubble store
// ---------------------------------------------------------------------------

export interface NpcActionState {
  npcId: string | null;
  message: string;
  action: string | null;
  trigger: (
    npcId: string,
    playerAction: string,
    context?: { interactionCount?: number; heartLevel?: number },
  ) => void;
  dismiss: () => void;
}

export declare const useNpcActionStore: UseBoundStore<StoreApi<NpcActionState>>;

export declare function notifyNpcAction(
  npcId: string,
  playerAction: string,
  context?: { interactionCount?: number; heartLevel?: number },
): void;

// ---------------------------------------------------------------------------
// Imperative helpers
// ---------------------------------------------------------------------------

export declare function openNpcDialogue(npcId: string): void;
export declare function closeNpcDialogue(): void;
export declare function advanceDialogue(choiceId: string): void;
