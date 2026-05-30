import type { PlayerAction } from './NPCDialogueController';

export interface PersonalizedVariant {
  condition: PersonalizedCondition;
  lines: string[];
}

export interface PersonalizedCondition {
  minHeartLevel?: number;
  maxHeartLevel?: number;
  minInteractionCount?: number;
  giftGiven?: boolean;
  questCompleted?: boolean;
}

export interface PersonalizedActionResponses {
  base: string[];
  variants: PersonalizedVariant[];
}

export interface NpcPersonalizedDialogue {
  npcId: string;
  actionResponses: Partial<Record<PlayerAction, PersonalizedActionResponses>>;
  contextGreetings: PersonalizedVariant[];
}

export const MARINA_PERSONALIZED: NpcPersonalizedDialogue = {
  npcId: 'marina',
  actionResponses: {
    greet: {
      base: [
        'Oi! Bem-vindo à padaria. Tem pão fresquinho saindo do forno agora!',
        'Olá! O que posso fazer por você hoje?',
      ],
      variants: [
        {
          condition: { minHeartLevel: 6 },
          lines: [
            'Que bom te ver! Já separei um pão especial que sei que você gosta.',
            'Ah, você! Sabia que você viria hoje. Entra, entra!',
          ],
        },
        {
          condition: { minHeartLevel: 3, maxHeartLevel: 5 },
          lines: [
            'Olá, amigo! Cada vez mais te vejo por aqui — fico feliz!',
            'Que bom te ver de novo! Tenho uma receita nova que preciso que você prove.',
          ],
        },
        {
          condition: { giftGiven: true },
          lines: [
            'Ai, que bom te ver! Ainda estou pensando no presente que você me deu.',
            'Você foi tão gentil naquela vez. É sempre um prazer quando você aparece!',
          ],
        },
        {
          condition: { questCompleted: true },
          lines: [
            'Meu herói! Por causa de você, consegui ingrediente especial pra receita nova.',
            'Que alívio você aparecer. Quero te dar uma amostra do que fiz com o que você trouxe.',
          ],
        },
      ],
    },
    give_gift: {
      base: ['Obrigada pelo presente! Que gentileza!', 'Nossa, não precisava! Mas fico feliz sim.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Farinha de qualidade! Você sabe tudo que preciso pra trabalhar bem. Obrigada de coração!',
            'Mel fresquinho! Com isso eu faço um pão de mel que vai te deixar de joelho. Obrigada!',
          ],
        },
        {
          condition: { minHeartLevel: 2, maxHeartLevel: 4 },
          lines: [
            'Que surpresa boa! Isso vai entrar numa receita especial, tenha certeza.',
            'Que presente bonito! Sempre imaginei que você era uma pessoa atenciosa.',
          ],
        },
      ],
    },
    talk: {
      base: [
        'A padaria existe faz quinze anos. Minha mãe me ensinou as primeiras receitas.',
        'Todo dia acordo às quatro da manhã pra ter pão quentinho às seis. Vale cada minuto!',
      ],
      variants: [
        {
          condition: { minHeartLevel: 7 },
          lines: [
            'Sabia que tenho uma receita secreta da minha avó? Um dia te ensino, promessa.',
            'Você é uma das poucas pessoas de quem eu conto como realmente vai a padaria. Às vezes é difícil, mas amo o que faço.',
          ],
        },
        {
          condition: { minHeartLevel: 4, maxHeartLevel: 6 },
          lines: [
            'A Dorinha e eu somos amigas desde crianças. Ela me passa os melhores ingredientes da quitanda.',
            'Teve uma vez que o forno quebrou na véspera da festa da comunidade. Quase tive um ataque!',
          ],
        },
        {
          condition: { questCompleted: true },
          lines: [
            'Quando me trouxe o trigo naquela semana, salvou a padaria. Nunca esqueço isso.',
            'Graças à sua ajuda, esse mês foi o melhor da padaria em anos.',
          ],
        },
      ],
    },
    quest_accept: {
      base: ['Pode contar comigo!', 'Claro, vou ver o que posso fazer.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Por você, faço qualquer coisa! Pode deixar comigo.',
            'Claro que sim! Depois me conta como foi.',
          ],
        },
      ],
    },
    quest_complete: {
      base: ['Muito obrigada! Ficou melhor do que esperava.', 'Perfeito! Você é incrível.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Você nunca me decepciona! Obrigada de coração, vou usar isso muito bem.',
            'Sabia que podia contar com você. Isso merece um pão fresquinho de presente!',
          ],
        },
      ],
    },
    goodbye: {
      base: ['Até mais! Volte quando quiser.', 'Tchau! Boas colheitas!'],
      variants: [
        {
          condition: { minHeartLevel: 6 },
          lines: [
            'Até logo! A padaria fica mais alegre quando você está por aqui.',
            'Cuida-se! E sabe que pode contar comigo, tá?',
          ],
        },
      ],
    },
  },
  contextGreetings: [
    {
      condition: { minHeartLevel: 8 },
      lines: [
        'Meu amigo querido! Entrou na hora certa — o pão de mel acabou de sair.',
        'Que alegria! Estava pensando em você hoje de manhã enquanto amassava a massa.',
      ],
    },
    {
      condition: { minHeartLevel: 4 },
      lines: [
        'Sempre bom te ver por aqui! Tenho coisa boa pra te mostrar hoje.',
        'Que saudade! Hoje tem receita nova — você precisa experimentar.',
      ],
    },
    {
      condition: { minInteractionCount: 1 },
      lines: [
        'Voltou! Espero que o pão da última vez tenha agradado.',
        'De volta! Tem novidade no cardápio hoje.',
      ],
    },
  ],
};

export const BENTO_PERSONALIZED: NpcPersonalizedDialogue = {
  npcId: 'bento',
  actionResponses: {
    greet: {
      base: ['Hmm. O que precisa?', 'Fala. Tô ocupado, mas pode perguntar.'],
      variants: [
        {
          condition: { minHeartLevel: 6 },
          lines: [
            'Você de novo. Bom. Tem coisa que só conto pra quem merece saber.',
            'Chegou na hora certa. Tava pensando em te falar de uma técnica nova.',
          ],
        },
        {
          condition: { minHeartLevel: 3, maxHeartLevel: 5 },
          lines: [
            'Já sei que você não vem à toa. O que quer saber sobre a roça?',
            'Voltou, hein. Bem. Pelo menos aprende rápido.',
          ],
        },
        {
          condition: { giftGiven: true },
          lines: [
            'Aquele presente que você trouxe — foi útil. Obrigado.',
            'Você sabe o que um fazendeiro precisa. Respeito isso.',
          ],
        },
        {
          condition: { questCompleted: true },
          lines: [
            'Não esperava que você desse conta. Me surpreendeu.',
            'Você fez o trabalho certo. Isso é raro.',
          ],
        },
      ],
    },
    give_gift: {
      base: ['Hmm. Obrigado.', 'Útil. Valeu.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Boa ferramenta. Você tem bom olho pra isso.',
            'Colheita boa. Você aprendeu bem — posso dizer isso agora.',
          ],
        },
        {
          condition: { minHeartLevel: 2, maxHeartLevel: 4 },
          lines: [
            'Não precisava, mas aceito. Boa qualidade.',
            'Obrigado. Isso diz alguma coisa sobre quem você é.',
          ],
        },
      ],
    },
    talk: {
      base: [
        'Terra boa exige respeito. Quem planta com pressa colhe com arrependimento.',
        'Trabalho nessa terra faz trinta anos. Aprendi mais com os erros do que com os acertos.',
      ],
      variants: [
        {
          condition: { minHeartLevel: 7 },
          lines: [
            'Minha esposa partiu cedo. A roça foi o que me manteve de pé. Não conto isso pra qualquer um.',
            'Você me lembra de quando comecei. Determinação certa. Cuida disso.',
          ],
        },
        {
          condition: { minHeartLevel: 4, maxHeartLevel: 6 },
          lines: [
            'O Romeu me acompanha na pesca às vezes. Quieto no trabalho, barulhento nas histórias.',
            'Já perdi uma safra inteira pra praga. Foi o pior ano da minha vida. Mas aprendi a plantar diferente.',
          ],
        },
        {
          condition: { questCompleted: true },
          lines: [
            'Quando você ajudou com aquela safra, me poupou semanas de trabalho. Mais do que isso.',
            'Esse trabalho que você fez — não foi pouca coisa. Vale mais do que imagina.',
          ],
        },
      ],
    },
    sell: {
      base: [
        'Boa colheita. Quanto você quer?',
        'Isso aqui tem qualidade. Posso pagar o preço justo.',
      ],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Sua safra tá melhorando a cada temporada. Vou pagar mais por essa.',
            'Você plantou do jeito certo — vejo no produto. Vale mais.',
          ],
        },
      ],
    },
    quest_accept: {
      base: ['Pode deixar. Faço o que é certo.', 'Combinado. Palavra dada, palavra cumprida.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Por você, faço. Não digo isso pra qualquer um.',
            'Tá bem. Sabe que quando eu aceito, cumpro.',
          ],
        },
      ],
    },
    quest_complete: {
      base: ['Pronto. Como prometido.', 'Feito. Sem enrolação.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Aqui está. Fiz com o mesmo cuidado que coloco na minha própria roça.',
            'Pronto. Espero que sirva bem. Você merece o melhor.',
          ],
        },
      ],
    },
    goodbye: {
      base: ['Até mais.', 'Tchau. Cuida da terra.'],
      variants: [
        {
          condition: { minHeartLevel: 6 },
          lines: [
            'Vai com cuidado. E volta quando quiser conversar.',
            'Até logo. Você sabe onde me achar.',
          ],
        },
      ],
    },
  },
  contextGreetings: [
    {
      condition: { minHeartLevel: 8 },
      lines: [
        'Você de novo. Boa companhia, essa é a verdade.',
        'Sabia que você apareceria. Tenho coisa importante pra te mostrar na lavoura.',
      ],
    },
    {
      condition: { minHeartLevel: 4 },
      lines: ['Apareceu. O que traz você por aqui hoje?', 'Voltou. Bom — tem coisa pra conversar.'],
    },
    {
      condition: { minInteractionCount: 1 },
      lines: [
        'De volta. Espero que a safra esteja indo bem.',
        'Apareceu outra vez. O que aprendeu desde a última vez?',
      ],
    },
  ],
};

export const LUCIA_PERSONALIZED: NpcPersonalizedDialogue = {
  npcId: 'lucia',
  actionResponses: {
    greet: {
      base: [
        'Oi! Tô aqui com os animais. Pode me chamar!',
        'Olá! Os bichos estão bem hoje. O que precisa?',
      ],
      variants: [
        {
          condition: { minHeartLevel: 6 },
          lines: [
            'Que bom te ver! A vaquinha tava estranha hoje cedo — achei que estava com saudades de você!',
            'Você chegou na hora! A cabra nova precisa de carinho de alguém que os bichos confiam.',
          ],
        },
        {
          condition: { minHeartLevel: 3, maxHeartLevel: 5 },
          lines: [
            'Ah, você! Os animais já te reconhecem, sabia? Bom sinal.',
            'Voltou! A galinha que você conheceu botou três ovos hoje — ela estava feliz.',
          ],
        },
        {
          condition: { giftGiven: true },
          lines: [
            'Lembro do presente que você trouxe. Fez diferença pra mim e pros animais.',
            'Você sempre pensa nos outros. Os bichos gostam de gente assim.',
          ],
        },
      ],
    },
    give_gift: {
      base: ['Obrigada! Que presente bonito.', 'Nossa, não esperava! Obrigada mesmo.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Capim fresco! Os animais vão adorar. Obrigada, você é demais!',
            'Isso aqui é perfeito pro cuidado dos bichos. Como você sabia que eu precisava?',
          ],
        },
        {
          condition: { minHeartLevel: 2, maxHeartLevel: 4 },
          lines: [
            'Que atencioso! Isso vai ser muito útil aqui no curral.',
            'Obrigada de verdade. Eu e os animais agradecemos!',
          ],
        },
      ],
    },
    talk: {
      base: [
        'Animal feliz produz mais. Parece simples, mas muita gente ignora isso.',
        'Cada bicho tem personalidade própria. A vaquinha Mimosa é a mais teimosa que já vi.',
      ],
      variants: [
        {
          condition: { minHeartLevel: 7 },
          lines: [
            'Tem dia que prefiro a companhia dos animais à de qualquer pessoa. Com você é diferente — você entende eles também.',
            'Aprendi a cuidar de gado com minha mãe. Mas aprendi a amar de verdade quando perdi meu primeiro animal. Não é fácil.',
          ],
        },
        {
          condition: { minHeartLevel: 4, maxHeartLevel: 6 },
          lines: [
            'A Sofia me ensinou plantas que ajudam a tratar os animais doentes. Medicina natural funciona!',
            'Tive um cachorro quando era criança que me seguia a roça inteira. Cheguei a chorar quando contei pra você disso.',
          ],
        },
        {
          condition: { questCompleted: true },
          lines: [
            'Depois que você ajudou com aquela vaca, ela deu o melhor leite do mês. Obrigada.',
            'O que você fez pelos meus animais não esqueço. Eles também não esquecem.',
          ],
        },
      ],
    },
    quest_accept: {
      base: ['Pode contar! Faço com todo carinho.', 'Claro! Deixa que eu cuido disso.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Por você faço qualquer coisa. Deixa comigo!',
            'Claro que sim! Os animais e eu ficamos felizes em ajudar.',
          ],
        },
      ],
    },
    quest_complete: {
      base: ['Missão cumprida! Eles estão bem agora.', 'Pronto! Foi com muito carinho.'],
      variants: [
        {
          condition: { minHeartLevel: 5 },
          lines: [
            'Fiz tudo com cuidado, como você merece. Espero que tenha gostado!',
            'Os animais estão ótimos! Você pode vir ver quando quiser.',
          ],
        },
      ],
    },
    goodbye: {
      base: ['Até logo! Cuida-se.', 'Tchau! Os animais mandam beijos!'],
      variants: [
        {
          condition: { minHeartLevel: 6 },
          lines: [
            'Vai com Deus! E volta breve — os bichos sentem sua falta.',
            'Até logo! A Mimosa já está esperando a próxima visita.',
          ],
        },
      ],
    },
  },
  contextGreetings: [
    {
      condition: { minHeartLevel: 8 },
      lines: [
        'Meu amigo favorito! Os animais todos te reconhecem agora.',
        'Que alegria! Você se tornou parte do curral — no bom sentido!',
      ],
    },
    {
      condition: { minHeartLevel: 4 },
      lines: [
        'Que bom te ver de novo! Como você tá?',
        'Voltou! Tenho coisa boa pra te contar sobre os animais.',
      ],
    },
    {
      condition: { minInteractionCount: 1 },
      lines: [
        'De volta! Os bichos lembraram de você, sabia?',
        'Voltou! Boa visita — sempre fico contente.',
      ],
    },
  ],
};

export const ALL_PERSONALIZED_DIALOGUES: NpcPersonalizedDialogue[] = [
  MARINA_PERSONALIZED,
  BENTO_PERSONALIZED,
  LUCIA_PERSONALIZED,
];
