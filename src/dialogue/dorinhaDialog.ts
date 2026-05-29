/**
 * dorinhaDialog.ts
 *
 * Static choice-based dialogue tree for Dorinha (quitandeira / market vendor).
 * Consumed by NPCDialogue via useLocalDialogueStore.openDialogue().
 *
 * Design goals:
 *   - Branch A  → Ask about shop/wares   → leads into seed-shop info
 *   - Branch B  → Ask about her story    → backstory / lore reveal
 *   - Branch C  → Ask for farming tips   → practical in-game hint
 *   - Branch D  → Goodbye                → closes the dialogue
 *
 * Each leaf either transitions to another node (next) or closes the
 * dialogue (action: "close"). Nodes referencing the live NPCShopModal
 *  (G key) must be triggered from game code; this tree only handles
 * the conversational half of the interaction.
 */
import type { DialogueData } from '../stores/dialogueStore';

export const dorinhaDialogue: DialogueData = {
  version: 2,
  npc_id: 'dorinha',
  entry: 'greeting',
  dialogues: [
    // ── Root ────────────────────────────────────────────────────────────────
    {
      id: 'greeting',
      text: 'Ei, chegou na hora certa! A quitanda tá bem sortida hoje. O que você precisa?',
      choices: [
        { id: 'ask_shop', text: 'O que você vende por aqui?', next: 'shop_overview' },
        { id: 'ask_story', text: 'Me conta um pouco de você.', next: 'backstory_1' },
        { id: 'ask_tip', text: 'Você tem alguma dica de cultivo?', next: 'farming_tip' },
        { id: 'farewell', text: 'Até logo!', action: 'close' },
      ],
    },

    // ── Branch A — Shop / Wares ──────────────────────────────────────────────
    {
      id: 'shop_overview',
      text: 'Tenho semente de trigo, tomate e milho — tudo de boa procedência! Também compro colheita, e o preço que dou não tem igual na região.',
      choices: [
        { id: 'ask_prices', text: 'Como funciona a compra de sementes?', next: 'shop_seeds' },
        { id: 'ask_selling', text: 'E vender minha colheita, como é?', next: 'shop_sell' },
        { id: 'ask_special', text: 'Tem algum produto especial?', next: 'shop_special' },
        { id: 'back', text: 'Entendi, obrigado.', next: 'farewell_soft' },
      ],
    },
    {
      id: 'shop_seeds',
      text: 'Aperta G perto de mim que abre a loja completa — dá pra ver tudo lá! Trigo sai mais barato, tomate tem boa margem e milho rende bem no verão.',
      choices: [
        { id: 'ask_selling', text: 'E vender minha colheita?', next: 'shop_sell' },
        { id: 'done', text: 'Certo, vou usar o G. Obrigado!', action: 'close' },
      ],
    },
    {
      id: 'shop_sell',
      text: 'Me traz o que colheu e eu avalio na hora. Quanto melhor a qualidade, melhor o preço. Tomate e milho maduros pagam bem, hein!',
      choices: [
        { id: 'ask_tip', text: 'Como eu melhoro a qualidade?', next: 'farming_tip_quality' },
        { id: 'done', text: 'Ótimo, vou guardar os melhores pra você!', action: 'close' },
      ],
    },
    {
      id: 'shop_special',
      text: 'De vez em quando aparece coisa rara — cesta de temperos, corante natural, essas coisas. Mas não são todo dia. Volta amanhã de manhã que às vezes tem surpresa!',
      choices: [
        { id: 'ask_selling', text: 'Entendido. E comprar minha colheita?', next: 'shop_sell' },
        { id: 'done', text: 'Legal! Vou ficar de olho.', action: 'close' },
      ],
    },

    // ── Branch B — Backstory / Lore ──────────────────────────────────────────
    {
      id: 'backstory_1',
      text: 'Ah, boa pergunta! Sou da família Pereira de Oliveira — minha avó montou a primeira barraca aqui na praça. Aprendi a negociar com ela desde pequena.',
      choices: [
        { id: 'ask_avoh', text: 'Sua avó ainda está por aqui?', next: 'backstory_grandmother' },
        { id: 'ask_marina', text: 'Você conhece a Marina desde quando?', next: 'backstory_marina' },
        { id: 'back', text: 'Que história bonita! Obrigado.', next: 'farewell_soft' },
      ],
    },
    {
      id: 'backstory_grandmother',
      text: 'Dona Eunice foi embora pra cidade há uns dez anos, mas o legado dela ficou. Cada caixinha de madeira que você vê aqui foi ela quem fez. Saudade…',
      choices: [
        {
          id: 'ask_marina',
          text: 'E a Marina, vocês são amigas antigas?',
          next: 'backstory_marina',
        },
        { id: 'done', text: 'Que legado lindo. Cuida bem disso.', action: 'close' },
      ],
    },
    {
      id: 'backstory_marina',
      text: 'A Marina e eu crescemos juntas! Ela na padaria, eu na quitanda — a gente sempre trocava ingrediente e segredo de receita. Até hoje ela me passa farinha quando falto estoque.',
      choices: [
        { id: 'ask_fear', text: 'O que te preocupa no futuro?', next: 'backstory_fear' },
        { id: 'back', text: 'Que amizade linda. Boa pra vocês!', next: 'farewell_soft' },
      ],
    },
    {
      id: 'backstory_fear',
      text: 'O que me preocupa? Que a garotada vá pra cidade e a gente fique sem agricultor aqui. Se você ficar e cuidar da terra, a vila sobrevive. É sério isso.',
      choices: [
        { id: 'promise', text: 'Pode contar comigo, Dorinha.', next: 'backstory_promise' },
        { id: 'done', text: 'Vou pensar nisso. Até mais.', action: 'close' },
      ],
    },
    {
      id: 'backstory_promise',
      text: 'Isso me alegra o coração! E sabe o quê? Pra quem fica e trabalha duro, eu dou desconto especial nas sementes. Não conta pra ninguém, tá?',
      choices: [{ id: 'done', text: 'Combinado! Obrigado, Dorinha.', action: 'close' }],
    },

    // ── Branch C — Farming Tips ──────────────────────────────────────────────
    {
      id: 'farming_tip',
      text: 'Claro! Primeiro: começa com trigo. Cresce em qualquer estação, não precisa muito cuidado. Depois que pegar o jeito, vai pro tomate.',
      choices: [
        { id: 'tip_water', text: 'Precisa regar todo dia?', next: 'farming_tip_water' },
        {
          id: 'tip_quality',
          text: 'Como melhoro a qualidade da colheita?',
          next: 'farming_tip_quality',
        },
        {
          id: 'tip_rotation',
          text: 'Devo plantar só um tipo de vez?',
          next: 'farming_tip_rotation',
        },
        { id: 'done', text: 'Boa dica! Obrigado.', action: 'close' },
      ],
    },
    {
      id: 'farming_tip_water',
      text: 'Todo dia é o ideal — mas se perder um dia não é fim de mundo. O que mata mesmo é dois dias seguidos de seco. Usa o regador cedo pela manhã, gasta menos energia.',
      choices: [
        { id: 'tip_quality', text: 'E a qualidade, como melhora?', next: 'farming_tip_quality' },
        { id: 'done', text: 'Entendi! Muito útil.', action: 'close' },
      ],
    },
    {
      id: 'farming_tip_quality',
      text: 'Qualidade depende do solo! Adubo orgânico faz diferença enorme. Se tiver composto ou adubo de animal, aplica antes de plantar. O resultado fica muito melhor.',
      choices: [
        { id: 'tip_rotation', text: 'Devo rotacionar as culturas?', next: 'farming_tip_rotation' },
        { id: 'done', text: 'Adubo orgânico — anotado. Valeu!', action: 'close' },
      ],
    },
    {
      id: 'farming_tip_rotation',
      text: 'Sim! Não planta a mesma coisa no mesmo canteiro estação atrás de estação. O solo cansa. Alterna: trigo, depois tomate, depois milho ou pousio. Rende mais no longo prazo.',
      choices: [
        { id: 'done', text: 'Rotação de culturas — vou seguir isso. Obrigado!', action: 'close' },
      ],
    },

    // ── Farewell nodes ───────────────────────────────────────────────────────
    {
      id: 'farewell_soft',
      text: 'Imagina! Qualquer coisa, tô aqui. Pode chegar sem cerimônia.',
      choices: [{ id: 'close', text: 'Tchau, Dorinha!', action: 'close' }],
    },
    {
      id: 'farewell',
      text: 'Volta sempre! Qualquer coisa, tô aqui na quitanda.',
      choices: [{ id: 'close', text: 'Tchau, Dorinha!', action: 'close' }],
    },
  ],
};
