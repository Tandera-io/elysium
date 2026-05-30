export const FERRAZ_NPC_ID = 'ferraz' as const;

export interface FerrazQuickReply {
  label: string;
  input: string;
}

/** A single scripted dialogue entry in the Ferraz series. */
export interface FerrazDialogueLine {
  id: string;
  /** Condition that unlocks this line (heartLevel threshold, or 'always'). */
  trigger: 'always' | 'heart_1' | 'heart_2' | 'heart_3' | 'heart_5';
  /** The line Ferraz speaks. */
  text: string;
  /** Optional player choices after this line. */
  choices?: FerrazQuickReply[];
}

/**
 * Hand-written scripted dialogue series for Ferraz.
 * Lines are displayed in order of encounter; trigger gates each one.
 * When ANTHROPIC_API_KEY is absent the server falls back to these.
 */
export const FERRAZ_DIALOGUE_SERIES: FerrazDialogueLine[] = [
  // ── First meeting ──────────────────────────────────────────────────────────
  {
    id: 'ferraz_intro',
    trigger: 'always',
    text: 'Ei, rosto novo. Bem-vindo à ferraria. Sou o Ferraz — ferreiro há trinta anos. Se o seu equipamento tiver frouxo, eu resolvo. Se vier só dar uma olhada, tudo bem também, mas não fica no caminho da bigorna.',
    choices: [
      { label: 'O que você faz aqui?', input: 'Quais serviços você oferece na ferraria?' },
      { label: 'Quero ver as ferramentas', input: 'Me mostra o que você tem disponível.' },
      { label: 'Até mais!', input: 'Obrigado, até mais.' },
    ],
  },
  // ── Personality depth — craft pride ───────────────────────────────────────
  {
    id: 'ferraz_craft_pride',
    trigger: 'always',
    text: 'Ferramenta ruim é pior que nenhuma — você trabalha mais e entrega menos. Aprendi isso com meu pai. Ele dizia: paga uma vez pelo bom, ou paga duas vezes pelo barato. Metal que saiu dessa bigorna dura geração.',
    choices: [
      {
        label: 'Quanto tempo leva um upgrade?',
        input: 'Qual é o prazo para você reforçar uma ferramenta?',
      },
      {
        label: 'Quais materiais você usa?',
        input: 'Que tipo de minério você precisa para trabalhar?',
      },
    ],
  },
  // ── Personality depth — ore scarcity ──────────────────────────────────────
  {
    id: 'ferraz_ore_scarcity',
    trigger: 'always',
    text: 'Minério bom tá difícil aqui. Ferro bruto chega em quantidade, mas qualidade... aí é outra história. Se você encontrar minério especial lá fora, me traz. Pago bem e você me faz um favor que não tem preço.',
    choices: [
      {
        label: 'Onde encontrar minério especial?',
        input: 'Tem algum lugar aqui perto onde posso achar minério especial?',
      },
      { label: 'Qual o preço que você paga?', input: 'Quanto você paga pelo minério especial?' },
    ],
  },
  // ── Heart-gated: 1 heart ──────────────────────────────────────────────────
  {
    id: 'ferraz_heart1',
    trigger: 'heart_1',
    text: 'Você tem aparecido bastante. Isso fala bem de você — trabalhador não fica inventando desculpa pra não aparecer. Reconheço quem respeita o ofício.',
    choices: [
      {
        label: 'Aprendi a valorizar boa ferramenta',
        input: 'Trabalhar com ferramentas de qualidade faz diferença sim.',
      },
      {
        label: 'Tenho muito pra aprender ainda',
        input: 'Ainda estou aprendendo como usar os equipamentos direito.',
      },
    ],
  },
  // ── Heart-gated: 2 hearts ─────────────────────────────────────────────────
  {
    id: 'ferraz_heart2',
    trigger: 'heart_2',
    text: 'Olha... trouxe um pouco de minério de reserva. Pra você. Pra o seu trabalho. Não precisa fazer cara estranha — considere um bônus por aparecer aqui tanto. Não conta pra ninguém, senão todo mundo vai querer.',
    choices: [
      {
        label: 'Agradeço muito, Ferraz!',
        input: 'Valeu demais, Ferraz. Isso vai ajudar bastante.',
      },
      {
        label: 'Você não precisava disso',
        input: 'Não precisava me dar nada, mas obrigado de verdade.',
      },
    ],
  },
  // ── Heart-gated: 3 hearts ─────────────────────────────────────────────────
  {
    id: 'ferraz_heart3',
    trigger: 'heart_3',
    text: 'Sabe o que? Você é alright. Poucas pessoas passam por aqui com juízo. A maioria quer milagre sem dar o material certo, reclamam do preço, saem sem agradecer. Você é diferente. Da próxima vez que precisar de forja, sem taxa extra. É minha palavra.',
    choices: [
      {
        label: 'Significa muito pra mim',
        input: 'Isso significa muito vindo de você. Obrigado, Ferraz.',
      },
      {
        label: 'Posso te ajudar de alguma forma?',
        input: 'Tem alguma coisa em que eu posso te ajudar em troca?',
      },
    ],
  },
  // ── Heart-gated: 5 hearts — teaching moment ───────────────────────────────
  {
    id: 'ferraz_heart5',
    trigger: 'heart_5',
    text: 'Tô pensando em te ensinar a usar a forja pra trabalhos simples — reparos básicos, amolar lâmina. Não vou te ensinar a forjar do zero, isso leva anos. Mas o suficiente pra você se virar quando eu estiver ocupado. Interessa?',
    choices: [
      {
        label: 'Com certeza, quero aprender!',
        input: 'Quero muito aprender. Quando você pode me ensinar?',
      },
      {
        label: 'Tenho medo de estragar algo',
        input: 'Tenho um pouco de medo de estragar o equipamento.',
      },
    ],
  },
];

export const FERRAZ_GREETINGS: FerrazQuickReply[] = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como você está?' },
  { label: 'Quero melhorar ferramentas', input: 'Você pode melhorar minha ferramenta?' },
  { label: 'Quero comprar equipamento', input: 'O que você tem disponível na ferraria?' },
  { label: 'Como vai o trabalho?', input: 'Como está o movimento na ferraria?' },
];

export const FERRAZ_TOPICS: Record<string, FerrazQuickReply[]> = {
  general: [
    {
      label: 'Dica de ferramentas',
      input: 'Qual ferramenta você recomenda para quem está começando?',
    },
    { label: 'Sobre o minério', input: 'Onde posso encontrar bom minério de ferro por aqui?' },
    { label: 'Sobre a ferraria', input: 'Há quanto tempo você trabalha na ferraria?' },
  ],
  upgrades: [
    { label: 'Melhorar enxada', input: 'Quanto custa para melhorar minha enxada?' },
    { label: 'Melhorar regador', input: 'Você consegue reforçar meu regador?' },
    { label: 'Melhorar picareta', input: 'Quero uma picareta mais resistente.' },
  ],
  crafting: [
    { label: 'Forjar espada', input: 'Você forja armas também?' },
    {
      label: 'Materiais necessários',
      input: 'Que materiais você precisa para forjar algo especial?',
    },
    { label: 'Tempo de produção', input: 'Quanto tempo leva para forjar uma ferramenta nova?' },
  ],
};

export const FERRAZ_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a ferraria',
  'posso te mostrar o que tenho',
  'dá uma olhada no estoque',
  'pode escolher o que quer',
  'olha o que tenho aqui',
];

export const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
  dialogueSeries: FERRAZ_DIALOGUE_SERIES,
} as const;

export default FERRAZ_DIALOGUE;
