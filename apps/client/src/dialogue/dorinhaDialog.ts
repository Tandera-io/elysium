import type { DialogueData } from '../systems/dialogue/choiceDialogueStore';

export const dorinhaDialogue: DialogueData = {
  version: 1,
  npc_id: 'dorinha',
  entry: 'root',
  dialogues: [
    {
      id: 'root',
      text: 'Ei, chegou na hora certa! A quitanda tá bem sortida hoje. O que você precisa?',
      choices: [
        { id: 'ask_shop', text: 'O que você vende aqui?', next: 'shop_overview' },
        { id: 'ask_story', text: 'Me conta um pouco sobre você.', next: 'backstory_1' },
        { id: 'ask_tips', text: 'Tem alguma dica pra plantação?', next: 'farming_tip' },
        { id: 'goodbye', text: 'Só passei pra dizer oi. Até logo!', action: 'close' },
      ],
    },

    // ── Branch A: Shop ──────────────────────────────────────────────────────
    {
      id: 'shop_overview',
      text: 'Tenho sementes frescas, compro o que você colher e às vezes aparece coisa especial. Quer saber mais de alguma coisa?',
      choices: [
        { id: 'ask_seeds', text: 'Quais sementes estão disponíveis?', next: 'shop_seeds' },
        { id: 'ask_sell', text: 'Como funciona vender pra você?', next: 'shop_sell' },
        { id: 'ask_special', text: 'O que é essa "coisa especial"?', next: 'shop_special' },
        { id: 'back_root_from_shop', text: 'Voltarei depois.', next: 'root' },
      ],
    },
    {
      id: 'shop_seeds',
      text: 'Alface, tomate, abóbora — dependendo da estação. Ah, e pra abrir a loja é só apertar G quando tiver perto de mim!',
      choices: [
        { id: 'back_shop_from_seeds', text: 'Entendido, obrigado!', next: 'shop_overview' },
        { id: 'close_from_seeds', text: 'Vou dar uma olhada na loja agora.', action: 'close' },
      ],
    },
    {
      id: 'shop_sell',
      text: 'Traga sua colheita e eu pago um preço justo. Quanto mais fresca, melhor o valor. Qualidade conta muito!',
      choices: [{ id: 'back_shop_from_sell', text: 'Bom saber, obrigada!', next: 'shop_overview' }],
    },
    {
      id: 'shop_special',
      text: 'Às vezes recebo itens raros de fornecedores de fora. Quem tem bom relacionamento comigo fica sabendo primeiro...',
      choices: [
        {
          id: 'back_shop_from_special',
          text: 'Interessante! Vou construir essa confiança.',
          next: 'shop_overview',
        },
      ],
    },

    // ── Branch B: Backstory ─────────────────────────────────────────────────
    {
      id: 'backstory_1',
      text: 'Hm, não costumo falar muito de mim... mas tudo bem. Cresci aqui na fazenda mesmo. Desde pequenininha já sabia o nome de cada semente.',
      choices: [
        {
          id: 'ask_grandmother',
          text: 'Quem te ensinou tudo isso?',
          next: 'backstory_grandmother',
        },
        { id: 'ask_fear', text: 'Parece que você ama esse lugar.', next: 'backstory_fear' },
        {
          id: 'back_root_from_story',
          text: 'Que história bonita. Obrigado por compartilhar.',
          next: 'root',
        },
      ],
    },
    {
      id: 'backstory_grandmother',
      text: 'Minha vó Nena. Ela dizia que plantar é uma conversa com a terra — você cuida dela, ela cuida de você. Saudades dela...',
      choices: [
        { id: 'ask_marina', text: 'E a Marina? Vocês se conhecem?', next: 'backstory_marina' },
        { id: 'back_story_1', text: 'Ela soa incrível.', next: 'backstory_1' },
      ],
    },
    {
      id: 'backstory_marina',
      text: 'A Marina? Sim, somos vizinhas de longa data. Às vezes brigamos por preço — ela acha que eu cobro caro demais nas sementes. Mas no fundo nos respeitamos.',
      choices: [
        {
          id: 'ask_fear_from_marina',
          text: 'E você nunca quis sair daqui?',
          next: 'backstory_fear',
        },
        {
          id: 'back_grandmother',
          text: 'Que relacionamento interessante.',
          next: 'backstory_grandmother',
        },
      ],
    },
    {
      id: 'backstory_fear',
      text: 'Sair? Uma vez pensei nisso, quando era moça. Mas aí lembrei da promessa que fiz pra vó Nena. Essa terra precisa de alguém que a conheça de verdade.',
      choices: [
        { id: 'ask_promise', text: 'Que promessa foi essa?', next: 'backstory_promise' },
        { id: 'back_root_from_fear', text: 'Fico feliz que você ficou.', next: 'root' },
      ],
    },
    {
      id: 'backstory_promise',
      text: 'Prometi que nunca deixaria as sementes antigas se perderem. Guardo variedades que ninguém mais cultiva por aqui. Já que você sabe disso... deixa eu te dar um desconto especial da próxima vez que comprar sementes, tá?',
      choices: [
        {
          id: 'close_from_promise',
          text: 'Muito obrigado, Dorinha. Isso significa muito.',
          action: 'close',
        },
        { id: 'back_root_from_promise', text: 'Que presente! Vou voltar em breve.', next: 'root' },
      ],
    },

    // ── Branch C: Farming tips ──────────────────────────────────────────────
    {
      id: 'farming_tip',
      text: 'Ah, boa pergunta! Tem várias coisas que fazem diferença. O que você quer saber mais?',
      choices: [
        { id: 'tip_water', text: 'Quanto devo regar?', next: 'farming_tip_water' },
        {
          id: 'tip_quality',
          text: 'Como melhorar a qualidade da colheita?',
          next: 'farming_tip_quality',
        },
        { id: 'tip_rotation', text: 'Devo alternar as culturas?', next: 'farming_tip_rotation' },
        { id: 'back_root_from_tips', text: 'Essas dicas já bastam, obrigado!', next: 'root' },
      ],
    },
    {
      id: 'farming_tip_water',
      text: 'Regue todo dia, mas sem exagero. Solo encharcado apodrece a raiz. Cheque sempre se a terra tá úmida antes de regar de novo.',
      choices: [
        { id: 'back_tips_from_water', text: 'Bom saber. Mais alguma dica?', next: 'farming_tip' },
        { id: 'close_from_water', text: 'Perfeito, obrigado!', action: 'close' },
      ],
    },
    {
      id: 'farming_tip_quality',
      text: 'Colha no ponto certo — nem cedo demais, nem tarde demais. E cuide do solo: composto orgânico faz toda a diferença na qualidade final.',
      choices: [
        {
          id: 'back_tips_from_quality',
          text: 'Vou tentar isso. Mais alguma?',
          next: 'farming_tip',
        },
        { id: 'close_from_quality', text: 'Ótimo conselho, valeu!', action: 'close' },
      ],
    },
    {
      id: 'farming_tip_rotation',
      text: 'Com certeza! Plantar a mesma coisa no mesmo lugar esgota a terra. Alterne entre raízes, folhas e frutas. A terra agradece e você colhe mais.',
      choices: [
        { id: 'back_tips_from_rotation', text: 'Faz sentido. Mais alguma?', next: 'farming_tip' },
        { id: 'close_from_rotation', text: 'Excelente, muito obrigado!', action: 'close' },
      ],
    },
  ],
};
