export const PLAYER_ACTIONS = Object.freeze({
  GREET: 'greet',
  BUY: 'buy',
  SELL: 'sell',
  GIVE_GIFT: 'give_gift',
  HARVEST: 'harvest',
  WATER: 'water',
  PLANT: 'plant',
  TALK: 'talk',
  QUEST_ACCEPT: 'quest_accept',
  QUEST_COMPLETE: 'quest_complete',
  GOODBYE: 'goodbye',
} as const);
type CS = 'first_meeting' | 'repeat_early' | 'repeat_regular' | 'friend';
interface Ctx {
  interactionCount?: number;
  heartLevel?: number;
}
const FM: Record<string, string[]> = {
  ferraz: [
    'Ei, rosto novo! Bem-vindo à ferraria. Sou o Ferraz.',
    'Nunca te vi por aqui. O nome é Ferraz.',
  ],
  nina: ['Olá! Eu sou Nina. Se precisar de ferramenta ou semente, pode contar comigo!'],
  dorinha: ['Oi, oi! Sou a Dorinha, da quitanda.'],
  marina: ['Que bom ver um rosto novo! Sou a Marina, da padaria.'],
  bento: ['Hmm. Novo por aqui. Bento.'],
  lucia: ['Oi! Sou a Lucia. Cuido dos animais por aqui.'],
  padre_pedro: [
    'Que bom ver você por aqui, meu filho. Sou o Padre Pedro.',
    'Bem-vindo à nossa comunidade! Sou o Padre Pedro.',
  ],
  arnaldo: ['Oi. Sou o Arnaldo, carpinteiro.', 'Nunca te vi por aqui. Arnaldo, marceneiro.'],
  sofia: [
    'Olá! Eu sou Sofia. Cuido da saúde da comunidade.',
    'Bem-vindo! Sou Sofia, a curandeira.',
  ],
  romeu: [
    'Eita, rosto novo! Sou o Romeu, pescador.',
    'Ô! Nunca te vi por aqui. Romeu, pescador do rio.',
  ],
};
const RV: Record<string, Record<string, string[]>> = {
  padre_pedro: {
    repeat_early: ['Que bom te ver de novo, meu filho.'],
    repeat_regular: ['Sempre uma alegria te ver por aqui.'],
    friend: ['Meu amigo querido!'],
  },
  arnaldo: {
    repeat_early: ['De volta. Precisando de madeira?'],
    repeat_regular: ['Sempre bom te ver.'],
    friend: ['Meu cliente fiel.'],
  },
  sofia: {
    repeat_early: ['Voltou! Precisando de mais remédio?'],
    repeat_regular: ['Sempre uma alegria!'],
    friend: ['Minha amiga de sempre!'],
  },
  romeu: {
    repeat_early: ['Ei, voltou! Quer mais peixe?'],
    repeat_regular: ['Meu cliente fiel!'],
    friend: ['Meu parceiro de pesca favorito!'],
  },
};
const AR: Record<string, Record<string, string[]>> = {
  padre_pedro: {
    greet: ['A paz esteja com você!'],
    buy: ['Não tenho muito para vender.'],
    sell: ['Não me ocupo com comércio.'],
    give_gift: ['Que gentileza!'],
    talk: ['Esta comunidade é como um jardim.'],
    quest_accept: ['Pode contar comigo!'],
    quest_complete: ['Graças a Deus!'],
    goodbye: ['Que Deus te ilumine!'],
  },
  arnaldo: {
    greet: ['Oi. Precisando de madeira?'],
    buy: ['Boa escolha.'],
    sell: ['Compro madeira boa.'],
    give_gift: ['Madeira boa? Isso sim é presente.'],
    talk: ['Uma estrutura bem-feita dura gerações.'],
    quest_accept: ['Pode deixar.'],
    quest_complete: ['Pronto.'],
    goodbye: ['Até mais.'],
  },
  sofia: {
    greet: ['Olá! Precisa de algum remédio?'],
    buy: ['Boa escolha!'],
    sell: ['Compro ervas medicinais!'],
    give_gift: ['Mel e ervas! Você sabe o caminho para o meu coração.'],
    talk: ['A natureza tem remédio para quase tudo.'],
    quest_accept: ['Pode contar!'],
    quest_complete: ['Perfeito!'],
    goodbye: ['Cuida-se!'],
  },
  romeu: {
    greet: ['Oi! Quer peixe fresco ou uma história?'],
    buy: ['Pode escolher!'],
    sell: ['Peixe seco eu aceito.'],
    give_gift: ['Que isso! Obrigado.'],
    talk: ['Certa vez peguei um peixe tão grande que o barco afundou!'],
    quest_accept: ['Pode deixar comigo!'],
    quest_complete: ['Consegui!'],
    goodbye: ['Até mais!'],
  },
};
const FB: Record<string, string[]> = {
  greet: ['Olá!'],
  buy: ['Pode escolher.'],
  sell: ['Me conta.'],
  give_gift: ['Obrigado!'],
  talk: ['...'],
  quest_accept: ['Combinado!'],
  quest_complete: ['Muito bem!'],
  goodbye: ['Até mais!'],
  default: ['...'],
};
function pr(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)] ?? '';
}
function pk(arr: string[], s = 0) {
  return arr[s % arr.length] ?? '';
}
export function classifyContext(ctx: Ctx = {}): CS {
  const c = ctx.interactionCount ?? 0,
    h = ctx.heartLevel ?? 0;
  if (c <= 0) return 'first_meeting';
  if (h >= 6 || c >= 20) return 'friend';
  if (c >= 5) return 'repeat_regular';
  return 'repeat_early';
}
export function getFirstMeetingLine(npcId: string, seed = 0): string {
  const l = FM[npcId];
  if (l && l.length > 0) return pk(l, seed);
  return FB.greet?.[0] ?? '';
}
export function getRepeatVisitLine(npcId: string, ctx: Ctx = {}): string {
  const s = classifyContext(ctx);
  if (s === 'first_meeting') return getFirstMeetingLine(npcId);
  const r = RV[npcId];
  if (r) {
    const b = r[s] ?? r['repeat_early'];
    if (b && b.length > 0) return pr(b);
  }
  return FB.greet?.[0] ?? '';
}
export function getActionResponse(npcId: string, action: string, ctx: Ctx = {}): string {
  const s = classifyContext(ctx);
  if (s === 'first_meeting' && action === PLAYER_ACTIONS.GREET)
    return getFirstMeetingLine(npcId, ctx.interactionCount ?? 0);
  const r = AR[npcId];
  if (r) {
    const b = r[action];
    if (b && b.length > 0) return pr(b);
  }
  const fb = FB[action] ?? FB['default'];
  return pr(fb ?? []) || '...';
}
export function triggerDialogue(npcId: string, action: string, ctx: Ctx = {}): string[] {
  return [getActionResponse(npcId, action, ctx)];
}
