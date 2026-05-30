/**
 * ferrazDialogue.js — Comprehensive dialogue definitions for Ferraz NPC.
 *
 * Ferraz is the blacksmith of Elysium. He works at the ferraria (smithy),
 * forging and upgrading tools and weapons. He is gruff but passionate about
 * craftsmanship and respects hard work and quality materials.
 *
 * Dialogue varies by:
 *   - Time of day (morning / afternoon / evening)
 *   - Season (spring / summer / fall / winter)
 *   - Player farm status (days played, crops planted, tools owned)
 *   - Friendship/heart level (0-10)
 *   - Player actions (brought ore, upgraded tool recently, etc.)
 */

// ─── NPC Identity ─────────────────────────────────────────────────────────────

export const FERRAZ_NPC_ID = 'ferraz';

// ─── Quick Reply Greetings ────────────────────────────────────────────────────

/** Initial greeting options shown when player approaches Ferraz. */
export const FERRAZ_GREETINGS = [
  { label: 'Oi, Ferraz!', input: 'Oi, Ferraz! Como você está?' },
  { label: 'Quero melhorar ferramentas', input: 'Você pode melhorar minha ferramenta?' },
  { label: 'Quero comprar equipamento', input: 'O que você tem disponível na ferraria?' },
  { label: 'Como vai o trabalho?', input: 'Como está o movimento na ferraria?' },
  { label: 'Trouxe minério', input: 'Trouxe um pouco de minério. Você compra?' },
];

// ─── Topic Trees ──────────────────────────────────────────────────────────────

/** Dialogue topics grouped by category. */
export const FERRAZ_TOPICS = {
  general: [
    {
      label: 'Dica de ferramentas',
      input: 'Qual ferramenta você recomenda para quem está começando na fazenda?',
    },
    { label: 'Sobre o minério', input: 'Onde posso encontrar bom minério de ferro por aqui?' },
    { label: 'Sobre a ferraria', input: 'Há quanto tempo você trabalha na ferraria?' },
    { label: 'Filosofia do trabalho', input: 'O que faz um bom artesão, na sua opinião?' },
    { label: 'Sobre Arnaldo', input: 'Como é sua parceria com o Arnaldo da marcenaria?' },
    { label: 'Origem do ofício', input: 'Quem te ensinou a trabalhar com metal?' },
  ],
  upgrades: [
    {
      label: 'Melhorar enxada',
      input: 'Quanto custa para melhorar minha enxada para o próximo nível?',
    },
    {
      label: 'Melhorar regador',
      input: 'Você consegue reforçar meu regador para regar mais plantas?',
    },
    { label: 'Melhorar picareta', input: 'Quero uma picareta mais resistente para minerar.' },
    { label: 'Melhorar machado', input: 'Meu machado está ficando cansado. Você melhora?' },
    { label: 'Tempo de melhoria', input: 'Quanto tempo leva para melhorar uma ferramenta?' },
    { label: 'Materiais necessários', input: 'Quais materiais você precisa para fazer o upgrade?' },
  ],
  crafting: [
    {
      label: 'Forjar espada',
      input: 'Você forja armas também, ou só ferramentas de fazenda?',
    },
    {
      label: 'Materiais especiais',
      input: 'Que materiais raros você precisa para forjar algo especial?',
    },
    {
      label: 'Tempo de produção',
      input: 'Quanto tempo leva para forjar uma ferramenta nova do zero?',
    },
    { label: 'Encomenda personalizada', input: 'Você aceita encomendas personalizadas?' },
    { label: 'Melhor material', input: 'Qual é o melhor metal que você já trabalhou?' },
    { label: 'Peça mais difícil', input: 'Qual é a peça mais difícil que você já forjou?' },
  ],
  seasonal: [
    { label: 'Primavera na ferraria', input: 'Como é a primavera para você na ferraria?' },
    {
      label: 'Verão e o calor',
      input: 'O calor do verão deve ser difícil perto da forja, né?',
    },
    {
      label: 'Outono e colheita',
      input: 'O pessoal traz mais ferramentas para consertar no outono?',
    },
    {
      label: 'Inverno na ferraria',
      input: 'Como é trabalhar na ferraria durante o inverno frio?',
    },
  ],
  farm_tips: [
    {
      label: 'Dica para iniciante',
      input: 'Qual o primeiro conselho que você daria para um fazendeiro novo?',
    },
    {
      label: 'Cuidado com ferramentas',
      input: 'Como eu devo cuidar das minhas ferramentas para durarem mais?',
    },
    {
      label: 'Ferramenta mais importante',
      input: 'Se você só pudesse ter uma ferramenta na fazenda, qual seria?',
    },
    {
      label: 'Manutenção regular',
      input: 'Com que frequência devo trazer minhas ferramentas para manutenção?',
    },
    {
      label: 'Sinais de desgaste',
      input: 'Como eu sei quando uma ferramenta está precisando de reparo?',
    },
  ],
  relationship: [
    { label: 'Falar sobre a vida', input: 'Me conta um pouco mais sobre você, Ferraz.' },
    { label: 'Família do Ferraz', input: 'Você tem família por aqui?' },
    { label: 'Sonhos e planos', input: 'Qual é o seu maior sonho como ferreiro?' },
    {
      label: 'Trabalho favorito',
      input: 'Qual tipo de trabalho você mais gosta de fazer na ferraria?',
    },
    { label: 'Descanso', input: 'O que você faz quando não está trabalhando na forja?' },
    { label: 'Presente favorito', input: 'O que te agrada receber como presente?' },
  ],
  weather: [
    { label: 'Dia chuvoso', input: 'Essa chuva está atrapalhando seu trabalho hoje?' },
    { label: 'Dia ensolarado', input: 'Um dia lindo como esse te anima para trabalhar mais?' },
    {
      label: 'Previsão do tempo',
      input: 'Você acha que vai chover muito esta semana?',
    },
  ],
};

// ─── Shop Trigger Phrases ─────────────────────────────────────────────────────

/** Phrases in Ferraz's responses that should trigger opening the shop UI. */
export const FERRAZ_SHOP_TRIGGER_PHRASES = [
  'abrir a ferraria',
  'posso te mostrar o que tenho',
  'dá uma olhada no estoque',
  'pode escolher o que quer',
  'olha o que tenho aqui',
  'vamos ver o que tem disponível',
  'abre a loja pra mim',
];

// ─── Contextual Dialogue Lines ────────────────────────────────────────────────

/**
 * Static dialogue lines keyed by context.
 * Used by the server mock when ANTHROPIC_API_KEY is not set.
 * Also used as examples in the AI system prompt.
 */
export const FERRAZ_CONTEXTUAL_LINES = {
  // Time-of-day greetings
  greeting_morning: [
    'Bom dia! Cheguei cedo hoje para acabar umas peças antes do calor pegar.',
    'Manhã boa pra trabalhar! A forja já está quente.',
    'Acordei com o sol pra adiantar umas encomendas. O que precisa?',
  ],
  greeting_afternoon: [
    'Boa tarde. Tô no meio de uma peça, mas pode falar.',
    'Passando bem, mãos cheias de carvão como sempre. Precisa de algo?',
    'À tarde a ferraria ferve — no sentido literal! Entre.',
  ],
  greeting_evening: [
    'Quase fechando por hoje, mas ainda dá tempo. O que precisa?',
    'Boa noite. Tô terminando os retoques nas ferramentas do Bento.',
    'Já tô guardando as ferramentas. Tem alguma urgência?',
  ],

  // Friendship tiers
  first_meeting: [
    'Ah, você é o novo fazendeiro da propriedade antiga. Sou Ferraz, ferreiro da cidade. Se precisar melhorar suas ferramentas, aqui é o lugar certo.',
    'Bem-vindo. Eu sou Ferraz. Trabalho com metal há vinte anos. Se sua enxada ou regador precisar de reforço, já sabe onde me achar.',
  ],
  low_friendship: [
    'Pode falar. Não sou de papo longo, mas ajudo no que precisar.',
    'Sim? Está precisando de alguma melhoria?',
    'Ferramentas são como a extensão dos seus braços — cuide bem delas.',
    'Por aqui eu só faço trabalho de qualidade. Nada pela metade.',
  ],
  medium_friendship: [
    'Boa ver você por aqui. Como está indo a fazenda?',
    'Cada vez que você aparece com as ferramentas, percebo que está levando a sério. Gosto disso.',
    'Vi sua plantação passando pela estrada. Ficou bonita, viu.',
    'Sua enxada está aguentando bem. Você cuida bem das suas coisas, eu respeito isso.',
  ],
  high_friendship: [
    'Ah, meu amigo! Sempre bom ver você. Tem alguma peça especial que você quer que eu faça?',
    'Você me lembra quando eu era jovem, cheio de energia pra trabalhar a terra. Guardo isso com carinho.',
    'Tenho guardado um minério especial que achei. Achei que você poderia usar em algo bom.',
    'Sua fazenda virou a mais bonita da região. Fico feliz de ter ajudado com as ferramentas.',
  ],

  // Seasonal dialogue
  spring: [
    'Primavera chegou e todo mundo quer afiar a enxada. Tô ocupado que só vendo.',
    'Na primavera, preparo ferramentas para plantio. É meu período mais movimentado.',
    'Com o solo amolecendo após o inverno, é hora de ter uma enxada afiada. Posso ajudar com isso.',
    'Cada primavera é assim: correria de serviço, mas gosto de ver o povo animado pra plantar.',
  ],
  summer: [
    'Esse calor do verão junto com a forja... é quente mas não tem jeito. O trabalho não para.',
    'No verão peço ao Lucas para buscar água do rio mais cedo. A forja consome bastante.',
    'Olha, trabalhar no verão com o fogo da forja não é fácil, mas é minha vida.',
    'Verão é bom pra trabalho ao ar livre. Às vezes processo o metal aqui fora mesmo.',
  ],
  fall: [
    'No outono pessoal traz ferramentas desgastadas da colheita. Tenho bastante serviço.',
    'Outono é bom: colheita farta, dinheiro circulando, minha oficina movimentada.',
    'Aproveitando o outono para repor o estoque de ferramentas antes do inverno.',
    'As folhas caindo me lembram que preciso estocar carvão antes do frio chegar.',
  ],
  winter: [
    'No inverno a forja aquece bem a ferraria. Até tem vantagem.',
    'Inverno é tempo de fazer peças ornamentais e experimentar novos designs. Tempo criativo.',
    'Com menos gente na rua, consigo me concentrar em peças mais complexas no inverno.',
    'Neve ou frio, a forja não apaga. Venha quando quiser, estou sempre aqui.',
  ],

  // Farm-status-aware dialogue
  new_farmer: [
    'Você está começando agora? Então ouve: uma boa enxada vale mais que cem sementes ruins.',
    'Fazendeiro novo precisa investir nas ferramentas antes de tudo. Sem ferramenta boa, a terra não cede.',
    'Comece simples: enxada, regador, e dedicação. O resto vem com o tempo.',
  ],
  experienced_farmer: [
    'Sua fazenda já cresceu bastante. Hora de dar um upgrade nas ferramentas também.',
    'Com tanta coisa plantada, suas ferramentas devem estar suando. Traz pra dar uma olhada.',
    'Um fazendeiro experiente como você sabe: ferramenta boa economiza horas de trabalho.',
  ],
  just_upgraded: [
    'Espero que a melhoria esteja servindo bem. Trabalho com orgulho naquelas peças.',
    'Como está a ferramenta que melhorei? Deve estar valendo cada centavo.',
    'Ferramenta nova sempre traz energia, não é? Aproveita bem.',
  ],
  brought_ore: [
    'Boa pedra de minério essa. Pago bem por material de qualidade.',
    'Ferro de qualidade, esse. Tenho projetos bons que precisam exatamente disso.',
    'Quem traz bom minério é parceiro certo. Obrigado pela confiança.',
  ],

  // Craftsmanship philosophy
  craftsmanship: [
    'Cada peça que sai daqui leva meu nome. Não entrego algo que não me orgulho.',
    'Meu avô dizia: a ferramenta reflete quem a fez. Por isso nunca apresso um trabalho.',
    'Qualidade leva tempo. Quem quer rápido vai à cidade grande. Quem quer bom, vem aqui.',
    'Ferramenta mal feita é pior que não ter ferramenta. Pelo menos sem ferramenta você sabe que precisa de uma.',
  ],

  // Tools and farming advice
  tools_advice: [
    'Uma boa enxada precisa de cabo firme e lâmina afiada. Descuide de qualquer um e vai perder rendimento.',
    'O regador de cobre que eu faço aguenta dez anos sem enferrujar. Vale cada moeda.',
    'Nunca deixe ferramentas de ferro molharem sem secar depois. Ferrugem é o inimigo do fazendeiro.',
    'Um machado bem equilibrado cansa menos o braço. Postura e ferramenta andam juntos.',
    'Depois da colheita, limpa e engraxas as ferramentas. Um minuto de cuidado vale uma hora de conserto.',
  ],

  // Ore and materials info
  ore_info: [
    'Ferro você acha nas rochas do norte, perto do riacho. Cobre é mais raro, mas tem na caverna do morro.',
    'Minério de ouro é especial — eu raramente trabalho com ele, mas quando vem, faço algo extraordinário.',
    'Traz o minério bruto aqui que eu processo. Pago bem por pedra de qualidade.',
    'Carvão é tão importante quanto o minério. Sem carvão, a forja não fica quente o suficiente.',
  ],

  // Upgrade costs/info
  upgrade_info: [
    'Para melhorar a enxada preciso de cinco lingotes de ferro e dois dias de trabalho.',
    'O regador de cobre aguenta muito mais — vale o custo. Dois lingotes de cobre bastam.',
    'Upgradar a picareta para ferro é a melhor decisão de um minerador. Quebra pedra três vezes mais rápido.',
    'Machado de aço? Preciso de três lingotes de aço e um dia completo na forja. Vale o investimento.',
  ],

  // Weather reactions
  rainy_day: [
    'Chuva boa pra você irrigar a fazenda de graça, né? Pra mim é dia de trabalho dobrado — todo mundo traz ferramenta enferrujada.',
    'Esse cheiro de chuva com fumaça da forja... tem algo de especial.',
  ],
  sunny_day: [
    'Dia de sol sempre anima. Trabalho melhor quando está claro.',
    'Com esse sol gostoso, fico com a porta aberta. Entra, fica à vontade.',
  ],
  drought: [
    'Seca pesada essa. Minhas ferramentas de irrigação tão saindo muito. Pessoal desesperado pra regar.',
    'Com essa estiagem, cuida bem do seu regador. Se quebrar agora, sua plantação sofre.',
  ],
};

// ─── Aggregate Export ─────────────────────────────────────────────────────────

const FERRAZ_DIALOGUE = {
  npcId: FERRAZ_NPC_ID,
  greetings: FERRAZ_GREETINGS,
  topics: FERRAZ_TOPICS,
  shopTriggerPhrases: FERRAZ_SHOP_TRIGGER_PHRASES,
  contextualLines: FERRAZ_CONTEXTUAL_LINES,
};

export default FERRAZ_DIALOGUE;
