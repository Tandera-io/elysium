export const FERRAZ_NPC_ID = 'ferraz';

export const FERRAZ_GREETINGS = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como estao os negocios?' },
  { label: 'Quero melhorar ferramenta', input: 'Voce faz upgrade de ferramentas?' },
  { label: 'Quero comprar ferramenta', input: 'O que voce tem pra vender hoje?' },
  { label: 'Como vai a ferraria?', input: 'Como esta o movimento na ferraria?' },
  { label: 'Bom dia, Ferraz', input: 'Bom dia! Ja ta na forja cedo hoje.' },
  { label: 'Boa tarde, Ferraz', input: 'Boa tarde, Ferraz. Posso entrar?' },
];

export const FERRAZ_TOPICS = {
  general: [
    { label: 'Falar sobre artesanato', input: 'Quanto tempo leva para forjar uma boa enxada?' },
    { label: 'Perguntar sobre Nina', input: 'Voce conhece a Nina? Ela vende ferramentas tambem.' },
    { label: 'Sobre minerio raro', input: 'Voce trabalha com minerio raro aqui na regiao?' },
    { label: 'Ferramentas e cuidado', input: 'Como eu cuido direito das minhas ferramentas?' },
    { label: 'Sobre o Bento', input: 'Voce conhece o Tio Bento? Ele e cliente seu?' },
    { label: 'Sobre a vila', input: 'Voce gosta de morar aqui na vila?' },
  ],
  upgrades: [
    { label: 'Upgrade da enxada', input: 'Quanto custa para melhorar minha enxada?' },
    { label: 'Upgrade do regador', input: 'Voce consegue melhorar um regador velho?' },
    {
      label: 'Forjar nova ferramenta',
      input: 'Quanto tempo leva para forjar uma ferramenta nova?',
    },
    { label: 'Upgrade da picareta', input: 'Voce faz upgrade de picareta tambem?' },
    { label: 'Precisa de material?', input: 'Quais materiais eu preciso trazer para o upgrade?' },
  ],
  crafting: [
    { label: 'O que preciso para forja?', input: 'Quais materiais voce precisa para trabalhar?' },
    { label: 'Sobre ferro e aco', input: 'Qual a diferenca entre ferro e aco nas ferramentas?' },
    { label: 'Ferramentas especiais', input: 'Voce faz alguma ferramenta especial sob encomenda?' },
    { label: 'Processo de forja', input: 'Como funciona o processo de forjar uma espada?' },
    { label: 'Temperatura da forja', input: 'Como voce sabe qual e a temperatura certa na forja?' },
  ],
};

export const FERRAZ_SHOP_TRIGGER_PHRASES = [
  'abrir a ferraria',
  'posso te mostrar o estoque',
  'da uma olhada no que tenho',
  'pode escolher o que precisa',
  'olha as ferramentas aqui',
];

/**
 * Contextual dialogue lines used by the AI/dialogue system to craft responses.
 * Grouped by situation to give Ferraz authentic reactions.
 */
export const FERRAZ_CONTEXTUAL_LINES = {
  about_craft: [
    'Ferro bom nao mente. Voce bate, ele responde.',
    'Vinte anos nessa bigorna. Cada peca sai do jeito que eu quero ou nao sai.',
    'Trabalho malfeito e pior que nao fazer nada. Aqui nao tem disso.',
    'A gente nao forja ferramenta — forja confianca. Se a enxada quebra, voce perde uma plantacao.',
    'Cada metal tem o seu temperamento. Ferro, aco, bronze — cada um pede um jeito diferente.',
  ],
  player_tools: [
    'Deixa eu ver essa enxada. Hmm. Serve, mas da pra melhorar.',
    'Esse regador ta com a solda fraca. Traz aqui que eu refoco.',
    'Voce ta usando isso? Milagre que ainda aguenta.',
    'Ta em bom estado. Quem fez isso sabia o que tava fazendo.',
    'Cuida melhor do equipamento. Ferrugem e inimigo silencioso.',
  ],
  offering_upgrades: [
    'Traga ferro e eu te devolvo uma ferramenta que dura dez anos.',
    'Posso reforcar o cabo e afiar a lamina. Mas preciso de material.',
    'Upgrade nao e magica — e metal certo e fogo na medida. Traz o que eu pedi.',
    'Da uma olhada no que tenho aqui, escolhe o que precisa.',
    'Com minerio raro consigo fazer algo que voce nao vai encontrar em lugar nenhum.',
  ],
  liked_gifts: [
    'Ferro de boa qualidade. Agora a gente ta se entendendo.',
    'Minerio raro de verdade. Faz tempo que nao via isso por aqui. Obrigado.',
    'Carvao bom faz toda a diferenca na temperatura da forja. Valeu.',
    'Isso aqui serve bem. Vou guardar com cuidado.',
  ],
  disliked_gifts: [
    'Isso aqui nao me serve pra nada. Guarda de volta.',
    'Eu trabalho com ferro, nao com bugiganga. Obrigado mesmo assim.',
    'Traga minerio ou ferro da proxima vez. Isso aqui nao tenho o que fazer.',
  ],
  about_village: [
    'A Nina vende ferramenta, mas nao forja nada. Cada um com seu oficio.',
    'O Bento e cliente antigo. Enxada dele ja passou pela minha bigorna umas tres vezes.',
    'Essa vila e pequena, mas tem gente que trabalha de verdade. Isso eu respeito.',
    'Nao sou de muita conversa, mas conheo todo mundo aqui. Todo mundo que trabalha, pelo menos.',
  ],
  seasonal_weather: [
    'Chuva forte enferruja o que nao ta guardado direito. Aviso dado.',
    'No verao o fogo da forja fica pesado, mas o trabalho nao para.',
    'Tempo seco e bom pra forja. Metal responde melhor quando nao tem umidade.',
    'Inverno e pesado aqui, mas bigorna quente aquece o galpao inteiro.',
  ],
  high_hearts: [
    'Voce sabe, nunca aprendi a forjar com ninguem. Meu pai deixou as ferramentas e eu fui aprendendo sozinho. Cada erro virou licao.',
    'Tem coisa que so o tempo ensina. Fogo demais quebra o metal. Paciencia e parte do oficio.',
    'Quando eu era novo, achava que forca resolvia tudo. Hoje sei que e o angulo certo que faz a diferenca.',
    'Ja pensei em fechar a ferraria. Mas sem ferreiro, a vila para. Isso me da motivo pra continuar.',
  ],
};

const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
  contextualLines: FERRAZ_CONTEXTUAL_LINES,
};

export default FERRAZ_DIALOGUE;
