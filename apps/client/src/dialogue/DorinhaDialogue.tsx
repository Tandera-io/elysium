import { useEffect, useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import type { DialogueTree } from '../stores/dialogueStore';

interface Choice {
  id: string;
  text: string;
  next: string | null;
}

interface Node {
  text: string;
  choices: Choice[];
}

const TREE: Record<string, Node | undefined> = {
  greeting: {
    text: 'Ei, chegou na hora! Tô com muita coisa boa hoje. O que você precisa?',
    choices: [
      { id: 'shop', text: 'Quero comprar sementes.', next: 'shop_offer' },
      { id: 'sell', text: 'Vim vender minha colheita.', next: 'sell_offer' },
      { id: 'chat', text: 'Só vim dar um oi.', next: 'chat' },
      { id: 'farewell', text: 'Até logo!', next: null },
    ],
  },
  shop_offer: {
    text: 'Tenho semente de trigo, tomate e milho — tudo fresquinho! O que leva?',
    choices: [
      { id: 'wheat', text: 'Semente de trigo.', next: 'confirm_wheat' },
      { id: 'tomato', text: 'Semente de tomate.', next: 'confirm_tomato' },
      { id: 'corn', text: 'Semente de milho.', next: 'confirm_corn' },
      { id: 'back', text: 'Deixa, obrigado.', next: 'farewell' },
    ],
  },
  sell_offer: {
    text: 'Trago o melhor preço da região! Me mostra o que você colheu.',
    choices: [{ id: 'back', text: 'Vou pensar melhor.', next: 'farewell' }],
  },
  chat: {
    text: 'Boa safra essa temporada, hein? A Marina me disse que você tá caprichando na roça!',
    choices: [
      { id: 'agree', text: 'É, tô me esforçando!', next: 'encouragement' },
      { id: 'modest', text: 'Ainda tô aprendendo...', next: 'advice' },
      { id: 'farewell', text: 'Até mais!', next: null },
    ],
  },
  encouragement: {
    text: 'Isso aí! Gente trabalhadora que faz a comunidade crescer. Pode contar comigo!',
    choices: [{ id: 'farewell', text: 'Até logo, Dorinha!', next: null }],
  },
  advice: {
    text: 'Todo mundo começa do zero. Dica: começa com trigo. Rápido de crescer e sempre tem comprador!',
    choices: [{ id: 'thanks', text: 'Obrigado pela dica!', next: 'farewell' }],
  },
  confirm_wheat: {
    text: 'Semente de trigo. Boa escolha — cresce em qualquer estação!',
    choices: [
      { id: 'more', text: 'Quero mais coisas.', next: 'shop_offer' },
      { id: 'done', text: 'Por hoje é só. Obrigado!', next: null },
    ],
  },
  confirm_tomato: {
    text: 'Tomate fresquinho! Vai bem no verão. Cuida bem da água, viu?',
    choices: [
      { id: 'more', text: 'Quero mais coisas.', next: 'shop_offer' },
      { id: 'done', text: 'Por hoje é só. Obrigado!', next: null },
    ],
  },
  confirm_corn: {
    text: 'Milho! Todo mundo ama. Planta em fileira que cresce melhor.',
    choices: [
      { id: 'more', text: 'Quero mais coisas.', next: 'shop_offer' },
      { id: 'done', text: 'Por hoje é só. Obrigado!', next: null },
    ],
  },
  farewell: {
    text: 'Volta sempre! Qualquer coisa, tô aqui na quitanda.',
    choices: [{ id: 'close', text: 'Tchau, Dorinha!', next: null }],
  },
};

/** Branching dialogue tree for Dorinha — used by the choice-dialogue store. */
export const dorinhaDialogue: DialogueTree = {
  start: 'greeting',
  nodes: {
    greeting: {
      text: 'Oi, oi! Bem-vindo à quitanda! Tenho os melhores produtos da região. O que você precisa hoje?',
      choices: [
        { text: 'Quero comprar sementes.', next: 'shop_offer' },
        { text: 'Tem alguma novidade por aqui?', next: 'news' },
        { text: 'Como vai a quitanda?', next: 'shop_status' },
        { text: 'Só vim dar um oi!', next: 'farewell' },
      ],
    },
    shop_offer: {
      text: 'Claro! Tenho sementes de trigo, tomate e milho fresquinhas. Aperta G pra ver minha loja completa!',
      choices: [
        { text: 'Ótimo, vou dar uma olhada!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    news: {
      text: 'Ouvi dizer que a Marina tá plantando uma horta nova do outro lado do vilarejo. Vai ser linda! Ah, e o Ferraz tá criando uma nova ferramenta pra colheita.',
      choices: [
        { text: 'Que interessante! Obrigado.', next: null },
        { text: 'Me conta mais sobre a Marina.', next: 'news_marina' },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    news_marina: {
      text: 'A Marina é a melhor horticultora do vilarejo! Dizem que os tomates dela crescem o dobro do tamanho. Deve ser o jeito especial que ela cuida da terra.',
      choices: [
        { text: 'Vou visitar ela logo!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    shop_status: {
      text: 'Tá indo bem, graças a Deus! Essa temporada a colheita foi generosa e as sementes estão em alta. Se você tiver produtos pra vender, passo bem!',
      choices: [
        { text: 'Que bom! Tenho algumas coisas pra vender.', next: 'sell_offer' },
        { text: 'Fico feliz em saber!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    sell_offer: {
      text: 'Perfeito! Aperta G pra abrir a loja e você pode vender suas colheitas por lá. Pago bem pelos produtos frescos!',
      choices: [
        { text: 'Ótimo, vou fazer isso!', next: null },
        { text: 'Posso perguntar outra coisa?', next: 'greeting' },
      ],
    },
    farewell: {
      text: 'Que bom te ver! Aparece mais vezes, tá? A quitanda tá sempre de portas abertas pra você!',
      choices: [{ text: 'Com certeza, até logo, Dorinha!', next: null }],
    },
  },
};

export function DorinhaDialogueBox() {
  const npcId = useDialogueStore((s) => s.npcId);
  const close = useDialogueStore((s) => s.close);
  const [nodeId, setNodeId] = useState('greeting');

  useEffect(() => {
    if (npcId === 'dorinha') setNodeId('greeting');
  }, [npcId]);

  useEffect(() => {
    if (npcId !== 'dorinha') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close]);

  if (npcId !== 'dorinha') return null;

  const node = TREE[nodeId] ?? TREE.greeting;
  if (!node) return null;

  const handleChoice = (next: string | null) => {
    if (next === null) {
      close();
    } else {
      setNodeId(next);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conversa com Dorinha"
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100"
    >
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-bold">Dorinha</h2>
          <p className="text-xs text-slate-400">quitandeira</p>
        </div>
        <button
          onClick={close}
          className="text-slate-400 hover:text-slate-200 text-sm"
          title="Fechar (Esc)"
          aria-label="Fechar diálogo"
        >
          ✕
        </button>
      </header>
      <div className="px-4 py-4 space-y-3 text-sm">
        <p className="bg-slate-800 px-3 py-2 rounded-xl text-slate-100 leading-relaxed">
          {node.text}
        </p>
        <div className="flex flex-col gap-2">
          {node.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice.next)}
              className="text-left bg-slate-700 hover:bg-amber-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg text-slate-100 text-sm"
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
