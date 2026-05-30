/**
 * npc-dialogue.ts
 *
 * Comprehensive dialogue data for the 6 hub NPCs:
 * Dorinha, Padre Pedro, Nina, Arnaldo, Sofia, Romeu.
 *
 * Each NPC entry includes:
 *   - id & display metadata
 *   - greetings: chips shown at conversation start
 *   - topics: topic-group → chip list (used by NPCInteractions quick-reply panel)
 *   - dialogueLines: array of standalone lines grouped by context
 *     (first_meeting, daily, seasonal, heart_1, heart_3, heart_5)
 *   - shopTriggerPhrases: substrings that open the shop UI
 *
 * These data structures complement the offline pipeline (dialogue/pipeline/index.ts)
 * and the DialogueManager registry. Components can import this file directly for
 * richer, context-aware responses without requiring a server round-trip.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface QuickReply {
  /** Short label shown on the chip button. */
  label: string;
  /** Full text sent as the player's message. */
  input: string;
}

export type DialogueContext =
  | 'first_meeting'
  | 'daily'
  | 'seasonal_spring'
  | 'seasonal_summer'
  | 'seasonal_autumn'
  | 'seasonal_winter'
  | 'heart_1'
  | 'heart_3'
  | 'heart_5';

export interface NpcDialogueLine {
  context: DialogueContext;
  text: string;
}

export interface NpcDialogueData {
  id: string;
  name: string;
  role: string;
  greetings: QuickReply[];
  topics: Record<string, QuickReply[]>;
  shopTriggerPhrases: string[];
  /** Rich standalone lines keyed by context stage. */
  dialogueLines: NpcDialogueLine[];
}

// ---------------------------------------------------------------------------
// Dorinha — quitandeira, warm seller of seeds and produce
// ---------------------------------------------------------------------------

export const DORINHA_DATA: NpcDialogueData = {
  id: 'dorinha',
  name: 'Dorinha',
  role: 'quitandeira',
  greetings: [
    { label: 'Oi, Dorinha!', input: 'Oi, Dorinha! Tudo bem?' },
    { label: 'Quero comprar sementes', input: 'Você tem sementes para vender hoje?' },
    { label: 'Quero vender safra', input: 'Você compra colheita? Tenho trigo, tomate e milho.' },
    { label: 'Como vai o negócio?', input: 'Como está o movimento na quitanda?' },
  ],
  topics: {
    general: [
      { label: 'Falar sobre a colheita', input: 'Qual foi a melhor safra que você já viu aqui?' },
      { label: 'Perguntar sobre Marina', input: 'Você e a Marina se conhecem há muito tempo?' },
      {
        label: 'Concorrência da cidade',
        input: 'Você tem medo de perder clientes para a cidade?',
      },
      {
        label: 'Dicas de negócio',
        input: 'Como você aprendeu a negociar sementes e safra assim?',
      },
    ],
    selling: [
      { label: 'Vender trigo', input: 'Quanto você paga pelo trigo hoje?' },
      { label: 'Vender tomate', input: 'Preciso vender tomate. Você está comprando?' },
      { label: 'Vender milho', input: 'Você quer milho? Tenho um carregamento.' },
    ],
    seeds: [
      { label: 'Preço das sementes', input: 'Quanto custam as sementes de trigo agora?' },
      { label: 'O que plantar agora?', input: 'O que vale mais a pena plantar nessa época?' },
      { label: 'Tem desconto?', input: 'Você faz um preço especial para um amigo?' },
      {
        label: 'Semente rara',
        input: 'Você tem alguma semente especial que não está na vitrine?',
      },
    ],
  },
  shopTriggerPhrases: [
    'abrir a quitanda',
    'posso te mostrar o que tenho',
    'dá uma olhada nas sementes',
    'pode escolher o que quer',
    'olha o meu estoque',
    'veja o que tenho',
    'sementes para vender',
  ],
  dialogueLines: [
    // First meeting
    {
      context: 'first_meeting',
      text: 'Oi, oi! Nunca te vi por aqui antes. Sou a Dorinha, da quitanda. Se quiser comprar ou vender safra, é aqui mesmo!',
    },
    {
      context: 'first_meeting',
      text: 'Bem-vindo! Sou Dorinha. Tenho as melhores sementes da região — e pago bem pela colheita também. Pode chegar!',
    },
    {
      context: 'first_meeting',
      text: 'Olha quem chegou! Rosto novo por aqui é sempre boa notícia. Me chamo Dorinha. Tô aqui pra comprar e vender, pode contar comigo!',
    },
    // Daily lines
    {
      context: 'daily',
      text: 'Bom dia! Acabou de chegar um lote de sementes fresquinhas. Quer dar uma olhada?',
    },
    {
      context: 'daily',
      text: 'Hoje tá um dia bom de negócio. Tô comprando safra com preço cheio — traz o que você colheu!',
    },
    {
      context: 'daily',
      text: 'Cê sabia que o trigo do Tio Bento desse ano ficou melhor do que nunca? Comprei tudo que ele trouxe.',
    },
    {
      context: 'daily',
      text: 'Minha avó dizia: "quitanda boa é aquela que não deixa vizinho passar fome." Eu sigo esse conselho até hoje.',
    },
    {
      context: 'daily',
      text: 'A Marina foi aqui mais cedo. Me pediu farinha e troco. Parece que o pão dela tá fazendo sucesso!',
    },
    // Seasonal lines
    {
      context: 'seasonal_spring',
      text: 'Essa chuva de primavera é bênção pra lavoura, hein! Aproveita pra plantar tudo que você puder.',
    },
    {
      context: 'seasonal_spring',
      text: 'Primavera é a época que mais gosto — as sementes voam daqui! Chegou na hora certa.',
    },
    {
      context: 'seasonal_summer',
      text: 'Com esse calor, as hortaliças crescem rápido. Mas cuidado com o regador — não pode faltar água.',
    },
    {
      context: 'seasonal_summer',
      text: 'Verão é tempo de tomate e milho. Tenho semente fresca pra você se quiser!',
    },
    {
      context: 'seasonal_autumn',
      text: 'Outono é hora de colher e guardar. Se precisar vender antes do inverno, me procura!',
    },
    {
      context: 'seasonal_autumn',
      text: 'Essa época o movimento aqui dobra. Todo mundo querendo vender colheita. Venha cedo pra pegar os melhores preços.',
    },
    {
      context: 'seasonal_winter',
      text: 'Inverno é difícil pra todos, mas eu guardo semente boa o ano todo. Tô aqui quando precisar.',
    },
    {
      context: 'seasonal_winter',
      text: 'No inverno, a gente vende menos, mas eu não reclamo. É tempo de planejar o que plantar na próxima primavera.',
    },
    // Heart progression
    {
      context: 'heart_1',
      text: 'Você volta sempre — isso é bom sinal! Gente de palavra merece desconto especial de vez em quando.',
    },
    {
      context: 'heart_3',
      text: 'Já te considero cliente de confiança, viu! Se aparecer alguma semente rara, você é o primeiro que eu aviso.',
    },
    {
      context: 'heart_5',
      text: 'Você é mais do que cliente pra mim, você é amigo mesmo. A Marina e eu crescemos juntas aqui nessa terra — e quem a gente gosta a gente cuida.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Padre Pedro — padre, wise community spiritual guide
// ---------------------------------------------------------------------------

export const PADRE_PEDRO_DATA: NpcDialogueData = {
  id: 'padre_pedro',
  name: 'Padre Pedro',
  role: 'padre',
  greetings: [
    { label: 'Bom dia, Padre!', input: 'Bom dia, Padre Pedro! Como o senhor está?' },
    { label: 'Preciso de conselho', input: 'Padre Pedro, posso pedir um conselho?' },
    { label: 'Como está a comunidade?', input: 'Como está a nossa comunidade?' },
    { label: 'Posso ajudar em algo?', input: 'Tem algo em que eu possa ajudar, Padre?' },
  ],
  topics: {
    general: [
      { label: 'Sobre a comunidade', input: 'Quem mais precisa de ajuda aqui?' },
      { label: 'Sobre a fazenda', input: 'O que o senhor acha da vida no campo, Padre?' },
      { label: 'Sobre as festas', input: 'Quando é a próxima festa da comunidade?' },
      {
        label: 'Sobre os moradores',
        input: 'Quem o senhor acha que mais representa o espírito desta terra?',
      },
    ],
    guidance: [
      {
        label: 'Conselho de vida',
        input: 'Padre, qual é o melhor conselho que o senhor já deu?',
      },
      { label: 'Sobre o trabalho', input: 'Como o senhor vê o trabalho na roça?' },
      { label: 'Momento difícil', input: 'Estou passando por um momento difícil...' },
      { label: 'Sobre paciência', input: 'Como o senhor aprendeu a ter tanta paciência?' },
    ],
  },
  shopTriggerPhrases: [],
  dialogueLines: [
    // First meeting
    {
      context: 'first_meeting',
      text: 'Que bom ver você por aqui, meu filho. Sou o Padre Pedro. Esta comunidade tem braços abertos para todos que chegam com o coração sincero.',
    },
    {
      context: 'first_meeting',
      text: 'Bem-vindo à nossa terra! Sou o Padre Pedro. Há muita coisa bonita por aqui — e muita gente boa também. Fique à vontade.',
    },
    {
      context: 'first_meeting',
      text: 'Olá, rosto novo! Padre Pedro, à sua disposição. Se um dia precisar de conselho ou apenas de silêncio, as portas da igrejinha estão sempre abertas.',
    },
    // Daily lines
    {
      context: 'daily',
      text: 'Esta comunidade é como um jardim — cada pessoa é uma semente que, com cuidado, floresce à sua maneira.',
    },
    {
      context: 'daily',
      text: 'O trabalho na roça é uma oração silenciosa. Quem cuida da terra com respeito, cuida também da própria alma.',
    },
    {
      context: 'daily',
      text: 'Passei pela casa do Tio Bento ontem. Homem que ama a terra de verdade — os olhos dele brilham quando fala do trigo.',
    },
    {
      context: 'daily',
      text: 'Quando a gente ajuda o próximo, não é o próximo que fica rico — somos nós que ficamos mais inteiros.',
    },
    {
      context: 'daily',
      text: 'A Dorinha me trouxe uma bandeja de pão da Marina de manhã cedo. Esta comunidade cuida de si mesma — que beleza.',
    },
    {
      context: 'daily',
      text: 'Já vi muita coisa nessa vida, meu filho. E posso te dizer: a paz não vem do que se tem, mas do que se dá.',
    },
    // Seasonal lines
    {
      context: 'seasonal_spring',
      text: 'Primavera é o tempo da esperança renovada. Plante com fé — a terra é generosa com quem a respeita.',
    },
    {
      context: 'seasonal_spring',
      text: 'Veja só essas flores brotando! Até a terra mais humilde tem sua estação de glória.',
    },
    {
      context: 'seasonal_summer',
      text: 'O calor do verão nos convida à gratidão — o sol que cansa também amadurece o fruto.',
    },
    {
      context: 'seasonal_summer',
      text: 'Nesse calor, lembre de cuidar de si também. Trabalhador bom precisa de descanso e de água fresca.',
    },
    {
      context: 'seasonal_autumn',
      text: 'Outono nos lembra que há um tempo para plantar e um tempo para colher. Não é o fim — é o ciclo se completando.',
    },
    {
      context: 'seasonal_autumn',
      text: 'As cores do outono são um presente. Até a folha que cai faz parte do plano maior desta terra.',
    },
    {
      context: 'seasonal_winter',
      text: 'No inverno, a terra descansa. Nós também precisamos de descanso para crescer na estação que vem.',
    },
    {
      context: 'seasonal_winter',
      text: 'Inverno é tempo de reflexão e de se aproximar das pessoas que você ama. A comunidade se aquece com a presença uns dos outros.',
    },
    // Heart progression
    {
      context: 'heart_1',
      text: 'Você tem voltado sempre por aqui. Fico contente — uma alma boa é sempre bem-vinda nesta terra.',
    },
    {
      context: 'heart_3',
      text: 'Já ouço falar bem de você de todos os lados. A sua presença aqui está fazendo diferença, pode ter certeza.',
    },
    {
      context: 'heart_5',
      text: 'Meu filho, nos anos em que estou aqui, vi muita gente passar. Poucos ficaram e cuidaram desta terra com tanto amor quanto você. Isso é raro — e precioso.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Nina — ferramenteira, practical young tool-shop owner
// ---------------------------------------------------------------------------

export const NINA_DATA: NpcDialogueData = {
  id: 'nina',
  name: 'Nina',
  role: 'ferramenteira',
  greetings: [
    { label: 'Oi, Nina!', input: 'Oi, Nina! Como você está?' },
    { label: 'Quero comprar ferramenta', input: 'Você tem ferramentas para vender?' },
    { label: 'Quero sementes especiais', input: 'Quais sementes você tem disponíveis?' },
    { label: 'Como vai o negócio?', input: 'Como está o movimento na ferragem?' },
  ],
  topics: {
    general: [
      {
        label: 'Dica de plantio',
        input: 'Qual ferramenta é essencial para plantar bem?',
      },
      { label: 'Perguntar sobre Bento', input: 'O Tio Bento compra muito aqui?' },
      {
        label: 'Manutenção de ferramentas',
        input: 'Como faço para conservar minha enxada?',
      },
      {
        label: 'Novo estoque',
        input: 'Tem alguma ferramenta nova que você recebeu recentemente?',
      },
    ],
    tools: [
      { label: 'Comprar regador', input: 'Quanto custa o regador? Meu velho estragou.' },
      { label: 'Comprar enxada', input: 'Você tem enxada boa para terreno duro?' },
      { label: 'Comprar adubo', input: 'Que tipo de adubo você recomenda para hortaliças?' },
      {
        label: 'Ferramenta resistente',
        input: 'Qual é a ferramenta mais durável que você tem?',
      },
    ],
    seeds: [
      {
        label: 'Sementes de abóbora',
        input: 'Quer dizer que você vende sementes de abóbora?',
      },
      {
        label: 'Sementes de morango',
        input: 'Tenho interesse em morango. Quanto custam as sementes?',
      },
      {
        label: 'Melhor época de plantar',
        input: 'Qual é a melhor época para plantar morango aqui?',
      },
      {
        label: 'Semente mais lucrativa',
        input: 'Qual semente dá mais lucro pro meu tamanho de roça?',
      },
    ],
  },
  shopTriggerPhrases: [
    'abrir a ferragem',
    'posso te mostrar o estoque',
    'dá uma olhada nas ferramentas',
    'pode escolher o que precisa',
    'olha o que tenho aqui',
    'ferramentas para vender',
    'ver o estoque',
  ],
  dialogueLines: [
    // First meeting
    {
      context: 'first_meeting',
      text: 'Olá! Eu sou a Nina. Se precisar de ferramenta ou semente, pode contar comigo — tenho o melhor estoque da região!',
    },
    {
      context: 'first_meeting',
      text: 'Bem-vindo à ferragem! Sou a Nina. Temos tudo que você precisa para a roça, desde regador até semente especial.',
    },
    {
      context: 'first_meeting',
      text: 'Chegou em boa hora! Acabei de arrumar o estoque. Sou a Nina — é um prazer! O que você precisa?',
    },
    // Daily lines
    {
      context: 'daily',
      text: 'Uma ferramenta bem conservada dura a vida toda. Limpa depois de usar e guarda em lugar seco!',
    },
    {
      context: 'daily',
      text: 'O Tio Bento passou aqui ontem e levou três enxadas novas. Homem de bom gosto — sabe que qualidade compensa.',
    },
    {
      context: 'daily',
      text: 'Meu sonho é ter uma linha de ferramentas exclusivas, feitas especialmente para as condições do solo daqui.',
    },
    {
      context: 'daily',
      text: 'Recebi adubo novo hoje cedo. Esse é especial para terrenos áridos — se quiser, posso te explicar como usar.',
    },
    {
      context: 'daily',
      text: 'Ferramenta ruim é o maior inimigo do agricultor. Vale investir no bom desde o começo!',
    },
    // Seasonal lines
    {
      context: 'seasonal_spring',
      text: 'Primavera chegou e o estoque de sementes já quase acabou! Venha cedo se quiser garantir as melhores.',
    },
    {
      context: 'seasonal_spring',
      text: 'Essa chuva de primavera vai exigir um bom regador com bico preciso. Dá uma olhada no que tenho aqui!',
    },
    {
      context: 'seasonal_summer',
      text: 'Verão é época de regador bom. No calor, as plantas bebem o dobro — não dá pra economizar na ferramenta.',
    },
    {
      context: 'seasonal_summer',
      text: 'Com o calor que tá fazendo, o adubo certo faz toda diferença. Quer que eu indique o melhor para essa época?',
    },
    {
      context: 'seasonal_autumn',
      text: 'Outono é hora de arrumar a enxada pra nova temporada. Se a sua estiver gasta, aproveita e troca agora!',
    },
    {
      context: 'seasonal_autumn',
      text: 'Tenho sementes guardadas especialmente para plantio de outono. Boa oportunidade antes do inverno chegar.',
    },
    {
      context: 'seasonal_winter',
      text: 'Inverno é tempo de manutenção das ferramentas. Traz a sua pra eu dar uma olhada — prefiro consertar do que ver você comprar uma nova.',
    },
    {
      context: 'seasonal_winter',
      text: 'No frio assim, as sementes especiais de inverno são difíceis de encontrar. Mas eu guardo sempre um estoque. Vem ver!',
    },
    // Heart progression
    {
      context: 'heart_1',
      text: 'Você sempre cuida bem das ferramentas que compra aqui — dá pra ver. Isso é sinal de bom trabalhador.',
    },
    {
      context: 'heart_3',
      text: 'Olha, você é um dos meus melhores clientes. Quando chegar uma encomenda especial que eu sei que você vai gostar, te aviso antes de colocar na prateleira.',
    },
    {
      context: 'heart_5',
      text: 'Você sabe, quando eu abri essa ferragem todo mundo disse que ia ser difícil demais. Mas clientes como você me mostram que valeu a pena. Obrigada de verdade.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Arnaldo — carpinteiro, experienced craftsman, pragmatic
// ---------------------------------------------------------------------------

export const ARNALDO_DATA: NpcDialogueData = {
  id: 'arnaldo',
  name: 'Arnaldo',
  role: 'carpinteiro',
  greetings: [
    { label: 'Oi, Arnaldo!', input: 'Oi, Arnaldo! Tudo certo?' },
    { label: 'Preciso de madeira', input: 'Você vende madeira trabalhada?' },
    { label: 'Quero uma cerca', input: 'Você consegue fazer uma cerca para minha fazenda?' },
    { label: 'Como vai o trabalho?', input: 'Como está a marcenaria, Arnaldo?' },
  ],
  topics: {
    general: [
      {
        label: 'Sobre a marcenaria',
        input: 'Há quanto tempo você trabalha com madeira?',
      },
      {
        label: 'Parceria com Ferraz',
        input: 'Você e o Ferraz trabalham juntos?',
      },
      {
        label: 'Madeira local',
        input: 'Qual é a melhor madeira que você encontra aqui?',
      },
      {
        label: 'Sabedoria rural',
        input: 'Qual é o maior segredo de quem trabalha com madeira há tanto tempo?',
      },
    ],
    woodwork: [
      { label: 'Comprar prancha', input: 'Quanto custa uma prancha de madeira boa?' },
      { label: 'Comprar cerca', input: 'Quanto você cobra por uma cerca?' },
      { label: 'Encomenda especial', input: 'Você faz peças sob encomenda?' },
      {
        label: 'Conserto de estrutura',
        input: 'Preciso consertar uma estrutura antiga. Você tem experiência com isso?',
      },
    ],
  },
  shopTriggerPhrases: [
    'abrir a marcenaria',
    'posso te mostrar o estoque',
    'dá uma olhada na madeira',
    'pode escolher o que precisa',
    'ver material de construção',
    'comprar madeira',
  ],
  dialogueLines: [
    // First meeting
    {
      context: 'first_meeting',
      text: 'Oi. Sou o Arnaldo, carpinteiro. Trabalho com madeira desde os doze anos. Se precisar de algo sólido e bem-feito, é aqui.',
    },
    {
      context: 'first_meeting',
      text: 'Nunca te vi por aqui. Arnaldo, marceneiro. Não faço trabalho rápido — faço trabalho bom. Se souber esperar, pode me contratar.',
    },
    {
      context: 'first_meeting',
      text: 'Chega com calma. Arnaldo — madeira e estrutura. Se você precisa de alguma coisa que dure gerações, veio ao lugar certo.',
    },
    // Daily lines
    {
      context: 'daily',
      text: 'Uma estrutura bem-feita dura gerações. É isso que eu entrego — nem mais, nem menos.',
    },
    {
      context: 'daily',
      text: 'Trabalho com o Ferraz às vezes. Ele cuida do ferro, eu da madeira. Quando os dois se juntam, o resultado é sólido de verdade.',
    },
    {
      context: 'daily',
      text: 'A madeira tem memória. Cada peça tem sua história antes de virar parede ou mobília.',
    },
    {
      context: 'daily',
      text: 'Meu pai era carpinteiro também. Ele dizia: paciência é a ferramenta mais importante — sem ela, nem o talento adianta.',
    },
    {
      context: 'daily',
      text: 'Hoje tô trabalhando numa cerca pra fazenda do Bento. Homem bom, que sabe o que quer — facilita o trabalho.',
    },
    // Seasonal lines
    {
      context: 'seasonal_spring',
      text: 'Primavera é boa época pra madeira — a umidade ajuda a trabalhar sem rachar. Tenho peças lindas saindo agora.',
    },
    {
      context: 'seasonal_spring',
      text: 'Com as chuvas de primavera, muito pessoal quer reforçar telhado e cerca. Já tô com a agenda cheia!',
    },
    {
      context: 'seasonal_summer',
      text: 'No calor assim, a madeira resseca e racha fácil. Quem tem estrutura velha precisa checar agora.',
    },
    {
      context: 'seasonal_summer',
      text: 'Verão é quando eu trabalho mais devagar — trato de hidratar a madeira certa pra ela não estalar no sol.',
    },
    {
      context: 'seasonal_autumn',
      text: 'Outono é tempo de preparar a fazenda pro inverno. Se precisar de reforço na estrutura, melhor fazer agora.',
    },
    {
      context: 'seasonal_autumn',
      text: 'Tenho estoque de madeira curada pronto — se você quiser reformar antes do frio, posso te atender rápido.',
    },
    {
      context: 'seasonal_winter',
      text: 'Inverno é tempo de madeira. As paredes tremem com o vento frio — quem tem estrutura boa fica tranquilo.',
    },
    {
      context: 'seasonal_winter',
      text: 'No frio assim, eu trabalho na marcenaria aqui dentro. Ótima época pra encomendar algo que vai ficar de herança.',
    },
    // Heart progression
    {
      context: 'heart_1',
      text: 'Você volta sempre. Isso diz muito de uma pessoa — gosta de qualidade ou tá sempre precisando de conserto?',
    },
    {
      context: 'heart_3',
      text: 'Já te considero um cliente sério. Se você precisar de algo urgente, fala — vou encaixar no meu tempo.',
    },
    {
      context: 'heart_5',
      text: 'Sabe, poucos clientes entendem o valor do que faço. Você entende. Isso pra mim vale mais do que dinheiro. Quando você quiser, posso fazer uma peça especial, sem custo, só porque você merece.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Sofia — curandeira/boticária, sees beauty in nature, herbalist healer
// ---------------------------------------------------------------------------

export const SOFIA_DATA: NpcDialogueData = {
  id: 'sofia',
  name: 'Sofia',
  role: 'curandeira',
  greetings: [
    { label: 'Oi, Sofia!', input: 'Oi, Sofia! Como você está?' },
    { label: 'Preciso de remédio', input: 'Você tem algum remédio natural?' },
    { label: 'Quero aprender', input: 'Você pode me ensinar sobre as ervas daqui?' },
    { label: 'Como está a botica?', input: 'Como está o movimento na botica?' },
  ],
  topics: {
    general: [
      {
        label: 'Sobre as ervas',
        input: 'Qual é a erva mais importante que você conhece?',
      },
      { label: 'Sobre a Lucia', input: 'Você e a Lucia são amigas há muito tempo?' },
      {
        label: 'Onde colher ervas',
        input: 'Onde você colhe as ervas melhores?',
      },
      {
        label: 'Beleza da natureza',
        input: 'O que você mais ama na natureza aqui ao redor?',
      },
    ],
    remedies: [
      {
        label: 'Remédio para cansaço',
        input: 'Tem algo para dar energia depois de um dia pesado?',
      },
      {
        label: 'Remédio para safra',
        input: 'Existe algo que ajude as plantas a crescer mais fortes?',
      },
      { label: 'Poção especial', input: 'Você tem alguma poção especial?' },
      {
        label: 'Erva para sono',
        input: 'Tenho dormido mal. Tem alguma erva que possa ajudar?',
      },
    ],
  },
  shopTriggerPhrases: [
    'abrir a botica',
    'posso te mostrar os remédios',
    'dá uma olhada nas ervas',
    'pode escolher o que precisa',
    'olha o que tenho aqui',
    'remédio natural',
    'ver as poções',
  ],
  dialogueLines: [
    // First meeting
    {
      context: 'first_meeting',
      text: 'Olá! Eu sou a Sofia. Cuido da saúde da comunidade com ervas e remédios naturais. Se precisar de algum cuidado, pode me procurar.',
    },
    {
      context: 'first_meeting',
      text: 'Bem-vindo! Sou Sofia, a curandeira. A natureza tem remédio para quase tudo — é só saber onde olhar. Posso te ajudar?',
    },
    {
      context: 'first_meeting',
      text: 'Que bom te ver! Sofia, da botica. Venho de uma família de curandeiras — aprendi que toda planta é uma pergunta esperando ser respondida.',
    },
    // Daily lines
    {
      context: 'daily',
      text: 'A natureza tem remédio para quase tudo. É só saber onde olhar — e quando colher.',
    },
    {
      context: 'daily',
      text: 'Aprendi com minha avó que as ervas do campo valem ouro se você souber usá-las. Ela tinha razão.',
    },
    {
      context: 'daily',
      text: 'A Lucia me ensinou muito sobre o que faz bem para os animais — e descobri que muitas dessas ervas fazem bem às pessoas também.',
    },
    {
      context: 'daily',
      text: 'Colhi camomila hoje de manhã, com o orvalho ainda na folha. É quando a força dela está mais concentrada.',
    },
    {
      context: 'daily',
      text: 'Cada estação traz uma planta diferente para cuidar. A terra é uma farmácia infinita para quem respeita o tempo dela.',
    },
    {
      context: 'daily',
      text: 'Olha essa cor do céu hoje. Esse tipo de luz dourada do entardecer — acho impossível não parar e agradecer.',
    },
    // Seasonal lines
    {
      context: 'seasonal_spring',
      text: 'Primavera é minha estação favorita para colher! As ervas brotam com força total — eu venho cedo todo dia.',
    },
    {
      context: 'seasonal_spring',
      text: 'Olha só essas flores! Cada cor é uma propriedade diferente. A natureza pinta o mundo e nos conta o que precisa.',
    },
    {
      context: 'seasonal_summer',
      text: 'No verão as ervas ficam mais concentradas, mas é preciso saber a hora certa de colher — muito calor seca os óleos essenciais.',
    },
    {
      context: 'seasonal_summer',
      text: 'O calor forte do verão é ótimo para fazer extratos de erva. Estou preparando um estoque especial!',
    },
    {
      context: 'seasonal_autumn',
      text: 'Outono tem uma paleta de cores que me inspira como nenhuma outra estação. Até as ervas que murcham têm beleza.',
    },
    {
      context: 'seasonal_autumn',
      text: 'Essa é a época de guardar remédios para o inverno. As ervas medicinais de outono são excelentes para combater o frio.',
    },
    {
      context: 'seasonal_winter',
      text: 'Inverno é a hora das raízes. O que o inverno esconde embaixo da terra é onde está o remédio mais poderoso.',
    },
    {
      context: 'seasonal_winter',
      text: 'Frio assim, a botica fica movimentada. Todo mundo querendo chá de gengibre e mel. Tenho bastante, não precisa se preocupar.',
    },
    // Heart progression
    {
      context: 'heart_1',
      text: 'Você sempre me visita com gentileza. Isso importa — a energia de quem chega afeta as ervas também, acredite.',
    },
    {
      context: 'heart_3',
      text: 'Olha, vou te ensinar algo que não ensino a qualquer um: onde encontrar as ervas mais raras daqui. Mas vai com cuidado e respeito.',
    },
    {
      context: 'heart_5',
      text: 'Você sabe, poucas pessoas veem o que eu vejo na natureza. Mas com você, quando eu falo sobre uma flor ou uma erva, seus olhos acendem. Isso me diz que você entende — e isso é um presente raro.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Romeu — pescador, romantic storyteller, loves the river
// ---------------------------------------------------------------------------

export const ROMEU_DATA: NpcDialogueData = {
  id: 'romeu',
  name: 'Romeu',
  role: 'pescador',
  greetings: [
    { label: 'Oi, Romeu!', input: 'Oi, Romeu! Pescou bem hoje?' },
    { label: 'Quero comprar peixe', input: 'Você tem peixe fresco para vender?' },
    { label: 'Conta uma história!', input: 'Me conta uma história de pesca, Romeu!' },
    { label: 'Como está o rio?', input: 'Como está o rio hoje, Romeu?' },
  ],
  topics: {
    general: [
      {
        label: 'Sobre o rio',
        input: 'Qual é o melhor lugar para pescar por aqui?',
      },
      {
        label: 'Sobre o Bento',
        input: 'Você e o Tio Bento costumam pescar juntos?',
      },
      {
        label: 'Histórias de pesca',
        input: 'Qual foi o maior peixe que você já pegou?',
      },
      {
        label: 'O amor e o rio',
        input: 'Você acha que o rio tem personalidade própria?',
      },
    ],
    fish: [
      { label: 'Peixe fresco', input: 'Quanto você pede pelo peixe fresco?' },
      { label: 'Peixe defumado', input: 'Você tem peixe defumado disponível?' },
      { label: 'Peixe raro', input: 'Já pegou algum peixe raro no rio?' },
      {
        label: 'Peixe para presente',
        input: 'Qual peixe você indica para impressionar alguém especial?',
      },
    ],
  },
  shopTriggerPhrases: [
    'posso te mostrar o peixe',
    'dá uma olhada na peixaria',
    'olha o que pesquei hoje',
    'pode escolher o que quer',
    'peixe fresco para vender',
    'ver o peixe',
  ],
  dialogueLines: [
    // First meeting
    {
      context: 'first_meeting',
      text: 'Eita, rosto novo! Sou o Romeu, pescador. O maior peixe que já peguei tinha mais de um metro — mas isso é história pra depois! O que vai querer?',
    },
    {
      context: 'first_meeting',
      text: 'Ô! Nunca te vi por aqui. Romeu, pescador do rio. Se quiser peixe fresco ou uma boa história de aventura, tô aqui!',
    },
    {
      context: 'first_meeting',
      text: 'Chegou em boa hora! Acabei de voltar do rio com bastante coisa boa. Sou o Romeu — pode chamar. O que você procura?',
    },
    // Daily lines
    {
      context: 'daily',
      text: 'O rio tem seus segredos. Só os que respeitam a correnteza descobrem os melhores lugares.',
    },
    {
      context: 'daily',
      text: 'Certa vez peguei um peixe tão grande que o barco afundou um palmo. Juro que não tô exagerando!',
    },
    {
      context: 'daily',
      text: 'O Bento me acompanha pescar às vezes. Homem quieto, mas sabe onde os peixes estão — instinto de quem conhece a terra.',
    },
    {
      context: 'daily',
      text: 'Pesco desde os seis anos. Meu avô dizia que o peixe escolhe quem vai pegá-lo. Acho que ele tinha razão.',
    },
    {
      context: 'daily',
      text: 'O amor pelo rio é parecido com o amor por uma pessoa — você não escolhe, ele te escolhe. E quando escolhe, não tem jeito de escapar.',
    },
    {
      context: 'daily',
      text: 'Cada vez que saio pescar de manhã cedo, com o nevoeiro ainda no rio, é como se o mundo inteiro parasse e respirasse junto comigo.',
    },
    // Seasonal lines
    {
      context: 'seasonal_spring',
      text: 'Primavera é a melhor época do rio! Os peixes sobem pra desovar — a pesca é farta e o rio fica vivo de verdade.',
    },
    {
      context: 'seasonal_spring',
      text: 'Com as chuvas de primavera, o rio muda de cor e de humor. É como conversar com um velho amigo que te surpreende sempre.',
    },
    {
      context: 'seasonal_summer',
      text: 'No calor do verão, os peixes descem para as partes mais frias do rio. Precisa ir mais fundo — mas vale a pena!',
    },
    {
      context: 'seasonal_summer',
      text: 'Verão tem peixe bom de espécie rara. Se tiver sorte, talvez te mostre onde encontrar.',
    },
    {
      context: 'seasonal_autumn',
      text: 'Outono é tempo de peixe gordo — eles comem muito antes do inverno. A pesca de outono é generosa.',
    },
    {
      context: 'seasonal_autumn',
      text: 'O rio de outono tem uma cor dourada que parece pintura. Já disse que o rio é o artista mais bonito que conheço?',
    },
    {
      context: 'seasonal_winter',
      text: 'Inverno deixa o rio quieto. Mas quem sabe esperar no frio, pesca os peixes mais especiais — aqueles que só saem quando a maioria desiste.',
    },
    {
      context: 'seasonal_winter',
      text: 'Frio assim, eu pesco com cobertor e café quente. O peixe não sente frio — só nós. Mas vale cada segundo!',
    },
    // Heart progression
    {
      context: 'heart_1',
      text: 'Você gosta das minhas histórias, hein? Isso é raro. Muita gente acha exagero — mas tudo que conto é verdade, juro!',
    },
    {
      context: 'heart_3',
      text: 'Olha, tem um lugar no rio que poucos conhecem. Fica a uns dois quilômetros daqui, onde a correnteza faz uma curva. Quando você quiser, te levo.',
    },
    {
      context: 'heart_5',
      text: 'Você sabe, o rio me ensinou que o tempo não se pressa. Que cada coisa chega no momento certo. Conhecer você foi assim — na hora certa, sem forçar. É assim que eu sei que é de verdade.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

/** All hub NPC dialogue data indexed by NPC id. */
export const NPC_DIALOGUE_REGISTRY: Record<string, NpcDialogueData> = {
  dorinha: DORINHA_DATA,
  padre_pedro: PADRE_PEDRO_DATA,
  nina: NINA_DATA,
  arnaldo: ARNALDO_DATA,
  sofia: SOFIA_DATA,
  romeu: ROMEU_DATA,
};

/**
 * Returns all dialogue lines for an NPC that match the given context.
 * Falls back to 'daily' lines if no match is found.
 */
export function getDialogueLines(npcId: string, context: DialogueContext): string[] {
  const data = NPC_DIALOGUE_REGISTRY[npcId];
  if (!data) return [];
  const lines = data.dialogueLines.filter((l) => l.context === context).map((l) => l.text);
  if (lines.length > 0) return lines;
  // Fallback to daily
  return data.dialogueLines.filter((l) => l.context === 'daily').map((l) => l.text);
}

/**
 * Picks a single dialogue line for an NPC deterministically based on a seed.
 * Useful for rendering a stable greeting without randomness on first render.
 */
export function pickDialogueLine(
  npcId: string,
  context: DialogueContext,
  seed: number = 0,
): string {
  const lines = getDialogueLines(npcId, context);
  if (lines.length === 0) return '';
  return lines[seed % lines.length] ?? '';
}

/**
 * Picks a random dialogue line for an NPC.
 */
export function pickRandomDialogueLine(npcId: string, context: DialogueContext): string {
  const lines = getDialogueLines(npcId, context);
  if (lines.length === 0) return '';
  return lines[Math.floor(Math.random() * lines.length)] ?? '';
}
