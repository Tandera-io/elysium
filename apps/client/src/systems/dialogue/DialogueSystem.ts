/**
 * DialogueSystem — client-side utility for selecting time-of-day–aware
 * and interaction-count–aware dialogue lines for each NPC.
 *
 * When the server (Claude) is unavailable the UI may call
 * `getGreeting(npcId, hour, interactionCount)` to obtain a localised
 * fallback line without a network round-trip.
 */

export type TimeOfDay = 'manha' | 'tarde' | 'noite' | 'madrugada';

/** Derive a time-of-day label from an in-game hour (0–24). */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'manha';
  if (hour >= 12 && hour < 18) return 'tarde';
  if (hour >= 18 && hour < 22) return 'noite';
  return 'madrugada';
}

export interface DialogueLine {
  text: string;
  emotion: 'neutral' | 'happy' | 'annoyed' | 'sad' | 'excited';
}

/** Dialogue bank keyed by NPC id → time-of-day → interaction bucket. */
type DialogueBank = Record<string, Record<TimeOfDay, DialogueLine[]>>;

const DIALOGUE_BANK: DialogueBank = {
  marina: {
    manha: [
      { text: 'Bom dia! Acabei de tirar o pão do forno — tá quentinho ainda.', emotion: 'happy' },
      { text: 'Cedo assim? Precisa de um pãozinho pra começar bem o dia?', emotion: 'happy' },
      {
        text: 'Esse farelo de trigo tá caro demais. A safra do Bento precisa melhorar logo.',
        emotion: 'neutral',
      },
    ],
    tarde: [
      { text: 'Boa tarde! A padaria tá cheia hoje. Posso te ajudar?', emotion: 'happy' },
      {
        text: 'Tô de olho numa receita nova de bolo de milho. Você gosta de milho?',
        emotion: 'excited',
      },
      {
        text: 'O Lucas passou aqui de novo pedindo fiado… não dá pra ficar assim.',
        emotion: 'annoyed',
      },
    ],
    noite: [
      { text: 'Que noite boa pra tomar um café com pão de queijo, não?', emotion: 'happy' },
      { text: 'Amanhã acordo às cinco. Mas essa brisa da praça vale a pena.', emotion: 'neutral' },
      {
        text: 'Você sabe fazer pão? Dia desses eu te ensino a receita da vovó.',
        emotion: 'excited',
      },
    ],
    madrugada: [
      {
        text: 'Tá acordado assim tão tarde? Eu já estou aquecendo o forno pra amanhã.',
        emotion: 'neutral',
      },
      { text: 'Silêncio da madrugada é quando o pão fica mais gostoso, sabia?', emotion: 'happy' },
      { text: 'Cuida-se, hein. Essa hora não é hora de andar por aí.', emotion: 'annoyed' },
    ],
  },
  bento: {
    manha: [
      { text: 'Dia de trabalho é dia de bênção. O que você precisa?', emotion: 'neutral' },
      { text: 'Choveu de madrugada. Boa hora pra plantar trigo.', emotion: 'happy' },
      { text: 'Provérbio do meu pai: quem planta cedo, colhe com alegria.', emotion: 'neutral' },
    ],
    tarde: [
      { text: 'Meio-dia já passou. Ainda tem serviço pra fazer.', emotion: 'neutral' },
      {
        text: 'Esse calor não deixa trabalhar direito. Mas a terra não espera.',
        emotion: 'annoyed',
      },
      { text: 'Ferramenta boa faz metade do trabalho. Cuida das suas.', emotion: 'neutral' },
    ],
    noite: [
      { text: 'O dia foi longo. Mas a roça tá pronta pra amanhã.', emotion: 'neutral' },
      { text: 'À noite a terra descansa. Nós também precisamos.', emotion: 'neutral' },
      { text: 'Boa noite pra você. Dorme bem, que amanhã tem mais.', emotion: 'happy' },
    ],
    madrugada: [
      { text: 'Essa hora só eu e os grilos acordados.', emotion: 'neutral' },
      { text: 'Madrugada tem uma paz que o dia não tem.', emotion: 'happy' },
      { text: 'Se precisar de ajuda na roça, aparece cedo amanhã.', emotion: 'neutral' },
    ],
  },
  lucia: {
    manha: [
      { text: 'As galinhas já puseram os ovos! Bom sinal pra hoje.', emotion: 'excited' },
      { text: 'De manhã os animais ficam mais calmos. É minha hora favorita.', emotion: 'happy' },
      { text: 'O leite dessa manhã tá fresco. Pode pegar um pouco se precisar.', emotion: 'happy' },
    ],
    tarde: [
      { text: 'Tô dando banho nas ovelhas. Você sabe como fazer isso?', emotion: 'neutral' },
      {
        text: 'O bezerro novo tá crescendo rápido. Daqui a pouco vai precisar de espaço.',
        emotion: 'happy',
      },
      {
        text: 'A cerca do norte tá precisando de reparo. Alguém vai ter que olhar.',
        emotion: 'annoyed',
      },
    ],
    noite: [
      { text: 'Os animais já dormindo, posso descansar um pouco.', emotion: 'happy' },
      {
        text: 'Noite de lua cheia, os animais ficam agitados. Estranha essa natureza.',
        emotion: 'neutral',
      },
      { text: 'Preciso de mais feno pro inverno. Começa a ficar frio.', emotion: 'neutral' },
    ],
    madrugada: [
      {
        text: 'Tá acordada tão tarde? Eu fico de ouvido nos animais essa hora.',
        emotion: 'neutral',
      },
      { text: 'Silêncio do curral à meia-noite é lindo demais.', emotion: 'happy' },
      {
        text: 'Se ouvir barulho estranho, pode vir me chamar. Os bichos às vezes assustam.',
        emotion: 'neutral',
      },
    ],
  },
  dorinha: {
    manha: [
      { text: 'Bom dia! Chegou tomate novo hoje de manhã. Tá no ponto certo!', emotion: 'excited' },
      { text: 'Cedo assim e já tô aqui. Negócio bom não tem horário, sabe?', emotion: 'happy' },
      { text: 'A semente de milho tá com preço ótimo hoje. Aproveita!', emotion: 'happy' },
    ],
    tarde: [
      { text: 'Boa tarde! Que calor, hein? Mas a quitanda não para.', emotion: 'neutral' },
      { text: 'O trigo do Bento foi vendido tudo de manhã. Popular demais!', emotion: 'excited' },
      { text: 'Precisa de sementes? Tô com uma promoção só pra amigos!', emotion: 'happy' },
    ],
    noite: [
      { text: 'Tô fechando a quitanda. Foi um dia e tanto!', emotion: 'neutral' },
      { text: 'A Marina me contou que você tá trabalhando muito. Isso é bom!', emotion: 'happy' },
      { text: 'Amanhã chega mais mercadoria. Passa cedo pra ver o que tem.', emotion: 'excited' },
    ],
    madrugada: [
      { text: 'Essa hora? A quitanda tá fechada, mas posso bater um papo.', emotion: 'neutral' },
      { text: 'De madrugada fico organizando o estoque pro dia seguinte.', emotion: 'neutral' },
      { text: 'Vai dormir, uai! Amanhã tem mais dia pra trabalhar.', emotion: 'annoyed' },
    ],
  },
  nina: {
    manha: [
      { text: 'Olá! Tenho produtos fresquinhos da fazenda hoje de manhã.', emotion: 'happy' },
      { text: 'Bom dia! Tô animada com a colheita de hoje. Foi boa demais!', emotion: 'excited' },
      { text: 'A manhã é o melhor momento pra comprar. Tudo mais fresco!', emotion: 'happy' },
    ],
    tarde: [
      { text: 'Boa tarde! Precisa de alguma coisa da roça?', emotion: 'neutral' },
      { text: 'Esse sol da tarde tá forte, mas a safra agradece.', emotion: 'neutral' },
      { text: 'Tenho pão de queijo fresquinho se quiser experimentar!', emotion: 'excited' },
    ],
    noite: [
      {
        text: 'Boa noite! Restou pouca coisa, mas ainda tenho algumas sementes.',
        emotion: 'neutral',
      },
      { text: 'Que dia cheio! Mas foi muito produtivo.', emotion: 'happy' },
      { text: 'Amanhã vou trazer mais variedade. Pode contar comigo!', emotion: 'excited' },
    ],
    madrugada: [
      { text: 'Tô preparando as cestas pra amanhã. Que susto você me deu!', emotion: 'annoyed' },
      {
        text: 'Madrugada é hora de descanso, mas não consigo parar de pensar na colheita.',
        emotion: 'neutral',
      },
      { text: 'Até logo! Durma bem.', emotion: 'happy' },
    ],
  },
  arnaldo: {
    manha: [
      { text: 'Bom dia! O armazém tá aberto. O que precisar, é só falar.', emotion: 'neutral' },
      { text: 'Cedo aqui significa negócio bom. Que bom que você apareceu!', emotion: 'happy' },
      {
        text: 'Inventário de manhã sempre bate certo. Hoje tô cheio de surpresas.',
        emotion: 'excited',
      },
    ],
    tarde: [
      { text: 'Boa tarde! Tô aqui contabilizando o estoque. Precisa de algo?', emotion: 'neutral' },
      { text: 'O comércio dessa tarde foi movimentado. Bom pra todos!', emotion: 'happy' },
      { text: 'Vendi quase tudo de trigo hoje. Mas ainda tenho ferramentas.', emotion: 'neutral' },
    ],
    noite: [
      { text: 'Vou fechar o armazém em breve. Alguma última compra?', emotion: 'neutral' },
      { text: 'Foi um bom dia de vendas. Estou satisfeito.', emotion: 'happy' },
      { text: 'Amanhã recebo nova carga. Você devia passar antes que acabe.', emotion: 'excited' },
    ],
    madrugada: [
      { text: 'O armazém tá fechado. Volta amanhã de manhã!', emotion: 'annoyed' },
      {
        text: 'Tô fazendo os livros contábeis. Essa hora é sossegada pra trabalhar.',
        emotion: 'neutral',
      },
      {
        text: 'Quem madruga com negócio não fica sem lucro. Mas agora é hora de dormir.',
        emotion: 'neutral',
      },
    ],
  },
  'padre-pedro': {
    manha: [
      { text: 'Bom dia, meu filho. Que Deus abençoe seus trabalhos de hoje.', emotion: 'happy' },
      { text: 'A missa das seis foi linda hoje. Muita gente veio!', emotion: 'excited' },
      { text: 'De manhã peço uma bênção especial pela safra da comunidade.', emotion: 'happy' },
    ],
    tarde: [
      { text: 'Boa tarde. Acabei de visitar as famílias do norte da vila.', emotion: 'neutral' },
      { text: 'Essa terra é abençoada. Olha que beleza de dia!', emotion: 'happy' },
      { text: 'Se precisar de conselho ou oração, pode vir me ver na igreja.', emotion: 'neutral' },
    ],
    noite: [
      { text: 'Boa noite. Que o descanso seja restaurador pra você.', emotion: 'happy' },
      { text: 'A lua tá linda essa noite. Obra de Deus, não?', emotion: 'excited' },
      { text: 'Rezei pelos doentes da comunidade. Espero que melhorem logo.', emotion: 'sad' },
    ],
    madrugada: [
      {
        text: 'Ainda rezando, meu filho? Eu também. É hora de oração silenciosa.',
        emotion: 'neutral',
      },
      { text: 'O silêncio da madrugada é onde Deus fala mais claramente.', emotion: 'happy' },
      { text: 'Vá descansar. O trabalho espera, mas o corpo precisa de sono.', emotion: 'neutral' },
    ],
  },
  sofia: {
    manha: [
      { text: 'Bom dia! Acabei de abrir a escola. As crianças chegam em breve.', emotion: 'happy' },
      { text: 'Você sabe ler e escrever? Nunca é tarde pra aprender mais!', emotion: 'excited' },
      {
        text: 'Preparei uma aula sobre plantas medicinais hoje. Vai ser ótima!',
        emotion: 'excited',
      },
    ],
    tarde: [
      {
        text: 'Boa tarde! As crianças acabaram de ir almoçar. Tenho cinco minutos.',
        emotion: 'neutral',
      },
      { text: 'A turma de hoje tá muito esperta. Fico feliz demais!', emotion: 'happy' },
      {
        text: 'Precisamos de mais livros na escola. Alguém na cidade pode ajudar.',
        emotion: 'neutral',
      },
    ],
    noite: [
      { text: 'As aulas acabaram. Mas ainda estou corrigindo os cadernos.', emotion: 'neutral' },
      { text: 'Que dia produtivo! As crianças aprenderam muito hoje.', emotion: 'happy' },
      {
        text: 'Ensinar é a coisa mais bonita que existe. Cada dia aprendo junto.',
        emotion: 'excited',
      },
    ],
    madrugada: [
      { text: 'Tô preparando as lições de amanhã. Não consigo parar!', emotion: 'neutral' },
      { text: 'Madrugada é boa pra ler. Silêncio total, sabe?', emotion: 'happy' },
      {
        text: 'Vai dormir! Crianças não podem aprender com professor cansado.',
        emotion: 'annoyed',
      },
    ],
  },
};

const interactionCounts: Record<string, number> = {};

export function getInteractionCount(npcId: string): number {
  return interactionCounts[npcId] ?? 0;
}

export function incrementInteractionCount(npcId: string): number {
  const next = (interactionCounts[npcId] ?? 0) + 1;
  interactionCounts[npcId] = next;
  return next;
}

export function resetInteractionCounts(): void {
  for (const key of Object.keys(interactionCounts)) {
    delete interactionCounts[key];
  }
}

export function getGreeting(npcId: string, hour: number, interactionCount: number): DialogueLine {
  const npcBank = DIALOGUE_BANK[npcId];
  if (!npcBank) {
    return { text: 'Olá! Tudo bem com você?', emotion: 'neutral' };
  }
  const tod = getTimeOfDay(hour);
  const lines = npcBank[tod];
  if (!lines || lines.length === 0) {
    return { text: 'Olá! Tudo bem com você?', emotion: 'neutral' };
  }
  return lines[interactionCount % lines.length]!;
}

export function getDialoguesForTime(npcId: string, hour: number): DialogueLine[] {
  const npcBank = DIALOGUE_BANK[npcId];
  if (!npcBank) return [];
  return npcBank[getTimeOfDay(hour)] ?? [];
}

export function getKnownNpcIds(): string[] {
  return Object.keys(DIALOGUE_BANK);
}
