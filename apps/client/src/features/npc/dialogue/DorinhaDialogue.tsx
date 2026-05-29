/**
 * features/npc/dialogue/DorinhaDialogue.tsx
 *
 * TypeScript React component for Dorinha's choice-driven dialogue overlay.
 *
 * This is the authoritative .tsx entry point for the Dorinha dialogue system.
 * It contains the full dialogue tree as typed constants, integrates with
 * `stores/npcStore` to record heart-level progress on each conversation open,
 * and exposes a `DorinhaDialogueBox` component that can be mounted once at the
 * HUD/overlay level alongside the generic `<DialogueBox />`.
 *
 * Only one box will be visible at a time — this component renders only when
 * `dialogueStore.npcId === 'dorinha'`; the generic DialogueBox should also
 * guard on npcId internally.
 */

import { useEffect, useState } from 'react';
import { useDialogueStore } from '../../../systems/dialogue/dialogueStore';
import { useNpcStore, useNpcDialogueStore } from '../../../stores/npcStore';
import { useTimeStore } from '../../../systems/time/timeStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogueChoice {
  label: string;
  next: string | null;
}

export interface DialogueNode {
  id: string;
  text: string;
  mood: string;
  choices: DialogueChoice[];
}

// ---------------------------------------------------------------------------
// Schedule helper (inlined to keep this module self-contained)
// ---------------------------------------------------------------------------

const DORINHA_SCHEDULE = [
  { from: 6, to: 7, activity: 'acordar' },
  { from: 7, to: 12, activity: 'vender' },
  { from: 12, to: 14, activity: 'almoco' },
  { from: 14, to: 18, activity: 'atender' },
  { from: 18, to: 20, activity: 'socializar' },
  { from: 20, to: 22, activity: 'descanso' },
] as const;

function getDorinaCurrentActivity(hour: number): string {
  const entry = DORINHA_SCHEDULE.find((e) => hour >= e.from && hour < e.to);
  return entry ? entry.activity : 'descanso';
}

// ---------------------------------------------------------------------------
// Dialogue tree
// ---------------------------------------------------------------------------

export const DORINHA_DIALOGUE_TREE: Record<string, DialogueNode> = {
  entry_vender: {
    id: 'entry_vender',
    text: 'Bom dia! Chegaram sementes fresquinhas hoje. Você precisa de alguma para a sua roça?',
    mood: 'animada',
    choices: [
      { label: 'Claro, o que você tem?', next: 'catalogo_sementes' },
      { label: 'Só queria dar um oi.', next: 'papo_casual' },
      { label: 'Tenho uma dúvida sobre plantio.', next: 'dica_plantio' },
      { label: 'Até logo, Dorinha!', next: null },
    ],
  },
  entry_atender: {
    id: 'entry_atender',
    text: 'Oi! Tarde boa. Estou aqui organizando o estoque. Como posso ajudar?',
    mood: 'focada',
    choices: [
      { label: 'Queria ver as sementes disponíveis.', next: 'catalogo_sementes' },
      { label: 'Você tem dica de plantio para essa estação?', next: 'dica_plantio' },
      { label: 'Só passando pra conversar.', next: 'papo_casual' },
      { label: 'Até mais!', next: null },
    ],
  },
  entry_almoco: {
    id: 'entry_almoco',
    text: 'Ah, hora do almoço na praça! Esse sol tá ótimo, né? Sentar aqui dá uma paz.',
    mood: 'relaxada',
    choices: [
      { label: 'Posso sentar junto?', next: 'almoco_junto' },
      { label: 'O que você tá comendo?', next: 'almoco_comida' },
      { label: 'Pode me ajudar com uma coisa rápida?', next: 'catalogo_sementes' },
      { label: 'Deixa eu não te atrapalhar.', next: null },
    ],
  },
  entry_socializar: {
    id: 'entry_socializar',
    text: 'Nossa, a praça à noite é mágica, não é? A brisa, as estrelas… adoro esse horário.',
    mood: 'contemplativa',
    choices: [
      { label: 'É mesmo, é muito bonito aqui.', next: 'noite_bonita' },
      { label: 'Você tem cultivado algo especial?', next: 'cultivo_especial' },
      { label: 'Me fala sobre a loja de sementes.', next: 'sobre_loja' },
      { label: 'Até amanhã, Dorinha.', next: null },
    ],
  },
  entry_acordar: {
    id: 'entry_acordar',
    text: 'Ai, cedo ainda… Tô saindo de casa agora. Passa mais tarde na loja, tá bom?',
    mood: 'sonolenta',
    choices: [
      { label: 'Ok, passo mais tarde!', next: null },
      { label: 'Sabe me dizer onde fica a loja?', next: 'sobre_loja' },
      { label: 'Bom dia! Boa sorte hoje.', next: null },
    ],
  },
  entry_descanso: {
    id: 'entry_descanso',
    text: 'Oi… já tô quase dormindo. Pode vir me ver amanhã de manhã na loja, sim?',
    mood: 'cansada',
    choices: [
      { label: 'Claro, boa noite, Dorinha!', next: null },
      { label: 'Prometo que é rápido — sementes?', next: 'catalogo_sementes' },
    ],
  },
  catalogo_sementes: {
    id: 'catalogo_sementes',
    text: 'Hoje tenho trigo, tomate e milho — todos excelentes para essa época! Sementes de tomate são perfeitas para quem quer colheita rápida.',
    mood: 'entusiasmada',
    choices: [
      { label: 'Me conta mais sobre o trigo.', next: 'info_trigo' },
      { label: 'E o tomate, quando colho?', next: 'info_tomate' },
      { label: 'Prefiro ver os preços na loja.', next: 'abrir_loja' },
      { label: 'Obrigado pelas informações!', next: null },
    ],
  },
  info_trigo: {
    id: 'info_trigo',
    text: 'Trigo é o clássico! Cresce em uns 4 dias, produz bem e rende bem na venda. Ideal pra quem tá começando.',
    mood: 'conhecedora',
    choices: [
      { label: 'E o tomate?', next: 'info_tomate' },
      { label: 'Quero ver o estoque completo.', next: 'abrir_loja' },
      { label: 'Valeu, Dorinha!', next: null },
    ],
  },
  info_tomate: {
    id: 'info_tomate',
    text: 'Tomate demora um pouco mais — uns 6 dias — mas o preço de venda é bem melhor. E fica uma graça na roça!',
    mood: 'animada',
    choices: [
      { label: 'E o trigo?', next: 'info_trigo' },
      { label: 'Vou na loja comprar agora.', next: 'abrir_loja' },
      { label: 'Obrigado pela dica!', next: null },
    ],
  },
  abrir_loja: {
    id: 'abrir_loja',
    text: 'Pode ir abrindo a loja — aperta G pra ver tudo que tenho. Qualquer coisa me chama!',
    mood: 'prestativa',
    choices: [{ label: 'Vou lá, obrigado!', next: null }],
  },
  dica_plantio: {
    id: 'dica_plantio',
    text: 'Dica de ouro: rega todo dia garante colheita mais rápida. E planta em blocos de 3×3 — fica mais fácil de irrigar.',
    mood: 'sábia',
    choices: [
      { label: 'E sobre pragas?', next: 'dica_pragas' },
      { label: 'Qual semente você indica mais?', next: 'catalogo_sementes' },
      { label: 'Ótima dica, obrigado!', next: null },
    ],
  },
  dica_pragas: {
    id: 'dica_pragas',
    text: 'Ugh, pragas são meu pesadelo! O segredo é não deixar terra seca por mais de 2 dias. Planta saudável resiste muito mais.',
    mood: 'preocupada',
    choices: [
      { label: 'Faz sentido. Mais alguma dica?', next: 'dica_plantio' },
      { label: 'Entendido, vou cuidar bem.', next: null },
    ],
  },
  papo_casual: {
    id: 'papo_casual',
    text: 'Que bom! Adoro quando a galera para pra conversar. Você tem gostado da vida aqui na vila?',
    mood: 'calorosa',
    choices: [
      { label: 'Tô adorando, é muito tranquilo.', next: 'papo_tranquilo' },
      { label: 'Ainda tô me adaptando…', next: 'papo_adaptando' },
      { label: 'Me fala um pouco de você.', next: 'sobre_dorinha' },
      { label: 'Sim! Até logo.', next: null },
    ],
  },
  papo_tranquilo: {
    id: 'papo_tranquilo',
    text: 'Né?! Esse ritmo de roça, sol, vento fresco… não tem preço. Fico feliz que você curtiu.',
    mood: 'feliz',
    choices: [
      { label: 'Me conta sobre a vila.', next: 'sobre_loja' },
      { label: 'Até logo!', next: null },
    ],
  },
  papo_adaptando: {
    id: 'papo_adaptando',
    text: 'Normal! Os primeiros dias são sempre corridos. Se precisar de alguma coisa, pode contar comigo — sementes, dicas, o que for!',
    mood: 'solidária',
    choices: [
      { label: 'Obrigado, isso ajuda muito.', next: null },
      { label: 'Pode me dar uma dica de plantio?', next: 'dica_plantio' },
    ],
  },
  sobre_dorinha: {
    id: 'sobre_dorinha',
    text: 'Eu? Cresci aqui mesmo. Minha avó tinha essa loja antes de mim — aprendi tudo com ela. Hoje cuido de cada sementinha como se fosse ouro.',
    mood: 'nostálgica',
    choices: [
      { label: 'Que história bonita!', next: 'historia_avo' },
      { label: 'Você tem favorita entre as plantas?', next: 'cultivo_especial' },
      { label: 'Obrigado por compartilhar.', next: null },
    ],
  },
  historia_avo: {
    id: 'historia_avo',
    text: 'Ela dizia que cada planta tem um espírito. Parece bobagem, mas quando você vê uma semente virar colheita… dá pra acreditar, né?',
    mood: 'pensativa',
    choices: [
      { label: 'Concordo, é quase mágico.', next: null },
      { label: 'Você tem medo de pragas por isso?', next: 'dica_pragas' },
    ],
  },
  almoco_junto: {
    id: 'almoco_junto',
    text: 'Claro! Quanto mais gente, mais animado. Senta aqui. Que semana essa, hein? A loja tá a todo vapor.',
    mood: 'animada',
    choices: [
      { label: 'Tá vendendo bem?', next: 'sobre_loja' },
      { label: 'Boa sorte com as vendas!', next: null },
    ],
  },
  almoco_comida: {
    id: 'almoco_comida',
    text: 'Trouxe pão da Marina com tomate do meu próprio estoque — os excedentes que não vendo. Fica delicioso!',
    mood: 'satisfeita',
    choices: [
      { label: 'Parece ótimo!', next: null },
      { label: 'Você compra pão da Marina?', next: 'relacao_marina' },
    ],
  },
  relacao_marina: {
    id: 'relacao_marina',
    text: 'Sempre! Marina é minha melhor cliente e eu sou a melhor dela. Ela compra sementes, eu compro pão. Funciona bem pra todo mundo.',
    mood: 'satisfeita',
    choices: [
      { label: 'Que parceria legal!', next: null },
      { label: 'E o Bento?', next: 'relacao_bento' },
    ],
  },
  relacao_bento: {
    id: 'relacao_bento',
    text: 'Bento é meu parceiro de negócios. Às vezes a gente troca insumos — ele tem ferramentas, eu tenho sementes em quantidade. É bom ter quem entenda de roça.',
    mood: 'respeitosa',
    choices: [
      { label: 'A vila tem uma rede interessante.', next: null },
      { label: 'Até logo, Dorinha!', next: null },
    ],
  },
  noite_bonita: {
    id: 'noite_bonita',
    text: 'Fico feliz que você também curta! Às vezes trago chá e fico aqui até umas 20h só admirando. Bom demais.',
    mood: 'serena',
    choices: [
      { label: 'Boa ideia. Cuide-se, Dorinha!', next: null },
      { label: 'Me conta sobre a sua vida aqui.', next: 'sobre_dorinha' },
    ],
  },
  cultivo_especial: {
    id: 'cultivo_especial',
    text: 'Segredo: estou tentando cultivar morango fora de estação. É difícil, mas sonho com um dia ter uma semente rara exclusiva na loja.',
    mood: 'empolgada',
    choices: [
      { label: 'Torço por você!', next: null },
      { label: 'Me avisa quando tiver em estoque.', next: 'aviso_estoque' },
    ],
  },
  aviso_estoque: {
    id: 'aviso_estoque',
    text: 'Pode deixar! Você vai ser o primeiro a saber. Fica de olho na loja — quando tiver, vou deixar uma reservada.',
    mood: 'animada',
    choices: [{ label: 'Combinado! Até logo.', next: null }],
  },
  sobre_loja: {
    id: 'sobre_loja',
    text: 'A loja de sementes existe há três gerações. Vendemos o melhor para a roça da região. Aperta G para ver o estoque completo quando quiser!',
    mood: 'orgulhosa',
    choices: [
      { label: 'Impressionante! Vou dar uma olhada.', next: 'abrir_loja' },
      { label: 'Obrigado pela informação.', next: null },
    ],
  },
};

// ---------------------------------------------------------------------------
// Entry-point resolver
// ---------------------------------------------------------------------------

export function getEntryNode(activity: string): string {
  const map: Record<string, string> = {
    vender: 'entry_vender',
    atender: 'entry_atender',
    almoco: 'entry_almoco',
    socializar: 'entry_socializar',
    acordar: 'entry_acordar',
    descanso: 'entry_descanso',
  };
  return map[activity] ?? 'entry_vender';
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/**
 * Choice-driven dialogue overlay for Dorinha.
 *
 * Renders only when `dialogueStore.npcId === 'dorinha'`. Mount once at the
 * HUD level alongside `<DialogueBox />`. Records each conversation in
 * `useNpcDialogueStore` for heart-level tracking (once per open).
 */
export function DorinhaDialogueBox() {
  const npcId = useDialogueStore((s) => s.npcId);
  const close = useDialogueStore((s) => s.close);
  const npcs = useNpcStore((s) => s.npcs);
  const hour = useTimeStore((s) => s.hour);
  const recordTalk = useNpcDialogueStore((s) => s.recordTalk);
  const getSocial = useNpcDialogueStore((s) => s.getSocial);

  const [nodeId, setNodeId] = useState<string>(() => getEntryNode(getDorinaCurrentActivity(hour)));

  // Reset to activity-appropriate entry node each time the dialogue opens, and
  // record the conversation for heart-level tracking.
  useEffect(() => {
    if (npcId === 'dorinha') {
      const { hour: h, dayInSeason: d } = useTimeStore.getState();
      setNodeId(getEntryNode(getDorinaCurrentActivity(h)));
      recordTalk('dorinha', d);
    }
  }, [npcId, recordTalk]);

  // Esc closes dialogue.
  useEffect(() => {
    if (npcId !== 'dorinha') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close]);

  if (npcId !== 'dorinha') return null;

  const npc = npcs['dorinha'];
  const node = DORINHA_DIALOGUE_TREE[nodeId];
  const social = getSocial('dorinha');

  // Heart-level display: filled hearts up to heartLevel, then empty outlines.
  const heartDisplay = Array.from({ length: 10 }, (_, i) =>
    i < social.heartLevel ? '♥' : '♡',
  ).join('');

  // Fallback UI if somehow a node id is missing.
  if (!node) {
    return (
      <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100 p-4">
        <p className="text-rose-400 text-sm">Diálogo não encontrado: {nodeId}</p>
        <button
          onClick={close}
          className="mt-2 text-slate-400 hover:text-slate-200 text-sm underline"
        >
          Fechar
        </button>
      </div>
    );
  }

  const handleChoice = (choice: DialogueChoice) => {
    if (choice.next === null) {
      close();
    } else {
      setNodeId(choice.next);
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-bold">{npc?.def.name ?? 'Dorinha'}</h2>
          <p className="text-xs text-slate-400">{npc?.def.role ?? 'vendedora de sementes'}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Heart-level indicator */}
          <span
            className="text-rose-400 text-[10px] tracking-tight font-mono"
            title={`Amizade: ${social.heartLevel}/10`}
            aria-label={`Nível de amizade ${social.heartLevel} de 10`}
          >
            {heartDisplay}
          </span>
          <button
            onClick={close}
            className="text-slate-400 hover:text-slate-200 text-sm"
            title="Fechar (Esc)"
            aria-label="Fechar diálogo"
          >
            ✕
          </button>
        </div>
      </header>

      {/* NPC speech bubble */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 leading-relaxed">
          {node.text}
        </div>
        {node.mood && <p className="text-[10px] text-slate-500 mt-1 px-1">— {node.mood}</p>}
      </div>

      {/* Player choices */}
      <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
        {node.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handleChoice(choice)}
            className="text-left bg-slate-800 hover:bg-slate-700 active:bg-amber-600 border border-slate-700 hover:border-amber-500 rounded-lg px-4 py-2 text-sm text-slate-200 hover:text-slate-100 transition-colors"
          >
            {choice.label}
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 pb-3 text-center">
        <p className="text-slate-600 text-[10px]">
          Pressione <kbd className="bg-slate-700 px-1 rounded">Esc</kbd> para fechar
        </p>
      </div>
    </div>
  );
}
