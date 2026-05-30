import {
  ALL_PERSONALIZED_DIALOGUES,
  type NpcPersonalizedDialogue,
  type PersonalizedCondition,
  type PersonalizedVariant,
} from './NPCDialogueData';

export type PlayerAction =
  | 'greet'
  | 'buy'
  | 'sell'
  | 'give_gift'
  | 'harvest'
  | 'water'
  | 'plant'
  | 'talk'
  | 'quest_accept'
  | 'quest_complete'
  | 'goodbye';

export interface PlayerContext {
  heartLevel: number;
  interactionCount: number;
  giftGiven: boolean;
  questCompleted: boolean;
}

function matchesCondition(condition: PersonalizedCondition, ctx: PlayerContext): boolean {
  if (condition.minHeartLevel !== undefined && ctx.heartLevel < condition.minHeartLevel)
    return false;
  if (condition.maxHeartLevel !== undefined && ctx.heartLevel > condition.maxHeartLevel)
    return false;
  if (
    condition.minInteractionCount !== undefined &&
    ctx.interactionCount < condition.minInteractionCount
  )
    return false;
  if (condition.giftGiven !== undefined && ctx.giftGiven !== condition.giftGiven) return false;
  if (condition.questCompleted !== undefined && ctx.questCompleted !== condition.questCompleted)
    return false;
  return true;
}

function pickRandom(lines: string[]): string {
  if (lines.length === 0) return '';
  return lines[Math.floor(Math.random() * lines.length)] ?? '';
}

function selectVariant(variants: PersonalizedVariant[], ctx: PlayerContext): string[] | null {
  for (const variant of variants) {
    if (matchesCondition(variant.condition, ctx)) return variant.lines;
  }
  return null;
}

const _registry = new Map<string, NpcPersonalizedDialogue>();

function ensureRegistered(): void {
  if (_registry.size === 0) {
    for (const dialogue of ALL_PERSONALIZED_DIALOGUES) {
      _registry.set(dialogue.npcId, dialogue);
    }
  }
}

export function registerPersonalizedDialogue(dialogue: NpcPersonalizedDialogue): void {
  _registry.set(dialogue.npcId, dialogue);
}

export function getPersonalizedResponse(
  npcId: string,
  action: PlayerAction,
  ctx: PlayerContext,
): string {
  ensureRegistered();
  const dialogue = _registry.get(npcId);
  if (!dialogue) return '';

  const actionData = dialogue.actionResponses[action];
  if (!actionData) return '';

  const variantLines = selectVariant(actionData.variants, ctx);
  if (variantLines) return pickRandom(variantLines);

  return pickRandom(actionData.base);
}

export function getPersonalizedGreeting(npcId: string, ctx: PlayerContext): string {
  ensureRegistered();
  const dialogue = _registry.get(npcId);
  if (!dialogue) return '';

  const variantLines = selectVariant(dialogue.contextGreetings, ctx);
  if (variantLines) return pickRandom(variantLines);

  return '';
}

export function hasPersonalizedDialogue(npcId: string): boolean {
  ensureRegistered();
  return _registry.has(npcId);
}

export class NPCDialogueController {
  private npcId: string;

  constructor(npcId: string) {
    this.npcId = npcId;
    ensureRegistered();
  }

  respond(action: PlayerAction, ctx: PlayerContext): string {
    return getPersonalizedResponse(this.npcId, action, ctx);
  }

  greet(ctx: PlayerContext): string {
    const contextual = getPersonalizedGreeting(this.npcId, ctx);
    if (contextual) return contextual;
    return getPersonalizedResponse(this.npcId, 'greet', ctx);
  }

  hasData(): boolean {
    return hasPersonalizedDialogue(this.npcId);
  }

  get id(): string {
    return this.npcId;
  }
}
