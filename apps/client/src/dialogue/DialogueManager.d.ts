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

export function registerNPC(config: NpcDialogueConfig): void;
export function getGreetings(npcId: string): QuickReply[];
export function getTopics(npcId: string): Record<string, QuickReply[]>;
export function getShopTriggerPhrases(npcId: string): string[];
export function isShopTrigger(npcId: string, replyText: string): boolean;

export declare const PLAYER_ACTIONS: Readonly<{
  GREET: 'greet';
  BUY: 'buy';
  SELL: 'sell';
  GIVE_GIFT: 'give_gift';
  HARVEST: 'harvest';
  WATER: 'water';
  PLANT: 'plant';
  TALK: 'talk';
  QUEST_ACCEPT: 'quest_accept';
  QUEST_COMPLETE: 'quest_complete';
  GOODBYE: 'goodbye';
}>;

export function triggerDialogue(
  npcId: string,
  playerAction: string,
  context?: { interactionCount?: number; heartLevel?: number },
): string[];

export function getActionResponse(
  npcId: string,
  playerAction: string,
  context?: { interactionCount?: number; heartLevel?: number },
): string;

export function getFirstMeetingLine(npcId: string, seed?: number): string;

export function getRepeatVisitLine(
  npcId: string,
  context?: { interactionCount?: number; heartLevel?: number },
): string;

export function classifyContext(context?: {
  interactionCount?: number;
  heartLevel?: number;
}): 'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend';
