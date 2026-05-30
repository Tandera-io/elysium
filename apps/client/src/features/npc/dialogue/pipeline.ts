import { DORINHA_GREETINGS, DORINHA_TOPICS, DORINHA_SHOP_TRIGGER_PHRASES } from './dorinha';
import { NINA_GREETINGS, NINA_TOPICS, NINA_SHOP_TRIGGER_PHRASES } from './nina';
import { PADRE_PEDRO_GREETINGS, PADRE_PEDRO_TOPICS } from './padrePedro';

export interface QuickReply {
  label: string;
  input: string;
}

const GREETINGS: Record<string, readonly QuickReply[]> = {
  dorinha: DORINHA_GREETINGS,
  nina: NINA_GREETINGS,
  padre_pedro: PADRE_PEDRO_GREETINGS,
};

const TOPICS: Record<string, Record<string, readonly QuickReply[]>> = {
  dorinha: DORINHA_TOPICS,
  nina: NINA_TOPICS,
  padre_pedro: PADRE_PEDRO_TOPICS,
};

const SHOP_TRIGGERS: Record<string, readonly string[]> = {
  dorinha: DORINHA_SHOP_TRIGGER_PHRASES,
  nina: NINA_SHOP_TRIGGER_PHRASES,
};

export function getGreetings(npcId: string): readonly QuickReply[] {
  return GREETINGS[npcId] ?? [];
}

export function getTopicReplies(npcId: string, topic = 'general'): readonly QuickReply[] {
  const npcTopics = TOPICS[npcId] ?? {};
  return npcTopics[topic] ?? npcTopics['general'] ?? [];
}

export function detectShopTrigger(npcId: string, text: string): boolean {
  const triggers = SHOP_TRIGGERS[npcId] ?? [];
  const lower = text.toLowerCase();
  return triggers.some((phrase) => lower.includes(phrase));
}
