export const ARNALDO_NPC_ID = 'arnaldo' as const;

export interface ArnaldoQuickReply {
  label: string;
  input: string;
}

export const ARNALDO_GREETINGS: ArnaldoQuickReply[] = [
  { label: 'Oi, Arnaldo!', input: 'Oi, Arnaldo! Tudo certo?' },
  { label: 'Preciso de madeira', input: 'Você vende madeira trabalhada?' },
  { label: 'Quero uma cerca', input: 'Você consegue fazer uma cerca para minha fazenda?' },
  { label: 'Como vai o trabalho?', input: 'Como está a marcenaria, Arnaldo?' },
];

export const ARNALDO_TOPICS: Record<string, ArnaldoQuickReply[]> = {
  general: [
    { label: 'Sobre a marcenaria', input: 'Há quanto tempo você trabalha com madeira?' },
    { label: 'Parceria com Ferraz', input: 'Você e o Ferraz trabalham juntos?' },
    { label: 'Madeira local', input: 'Qual é a melhor madeira que você encontra aqui?' },
  ],
  woodwork: [
    { label: 'Comprar prancha', input: 'Quanto custa uma prancha de madeira boa?' },
    { label: 'Comprar cerca', input: 'Quanto você cobra por uma cerca?' },
    { label: 'Encomenda especial', input: 'Você faz peças sob encomenda?' },
  ],
};

export const ARNALDO_SHOP_TRIGGER_PHRASES: string[] = [
  'abrir a marcenaria',
  'posso te mostrar o estoque',
  'dá uma olhada na madeira',
  'pode escolher o que precisa',
];

export interface ChoreDialogueLines {
  assigned: string[];
  working: string[];
  completed: string[];
}

export const ARNALDO_CHORE_DIALOGUE: ChoreDialogueLines = {
  assigned: [
    'Tá bom! Madeira e trabalho braçal são o que eu sei fazer de melhor.',
    'Pode deixar na minha mão. Cuido disso com a mesma dedicação que minha marcenaria.',
    'Entendido. Vou separar o material necessário e já começo.',
  ],
  working: [
    'No ritmo certo, sem pressa e sem desleixo. É assim que funciona a marcenaria.',
    'Cada talho no lugar. Esse serviço merece atenção.',
    'Quase terminando. Não gosto de deixar coisa incompleta.',
  ],
  completed: [
    'Pronto! Ficou do jeito que eu gosto: sólido e bem acabado.',
    'Terminei! Pode conferir, não vou te decepcionar.',
    'Missão cumprida. Se quiser mais alguma coisa, é só falar comigo.',
  ],
};

export const ARNALDO_DIALOGUE = {
  npcId: ARNALDO_NPC_ID,
  greetings: ARNALDO_GREETINGS,
  topics: ARNALDO_TOPICS,
  shopTriggerPhrases: ARNALDO_SHOP_TRIGGER_PHRASES,
  choreDialogue: ARNALDO_CHORE_DIALOGUE,
} as const;

export default ARNALDO_DIALOGUE;
