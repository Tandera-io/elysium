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
export declare function triggerDialogue(
  npcId: string,
  playerAction: string,
  context?: { interactionCount?: number; heartLevel?: number },
): string[];
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
export declare function classifyContext(context?: {
  interactionCount?: number;
  heartLevel?: number;
}): 'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend';
