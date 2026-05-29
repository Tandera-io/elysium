import { useEffect } from 'react';
import { DORINHA_ID, DORINHA_NAME, useDorinhaInteraction } from '../npc/Dorinha';
import type { Vec2 } from '../npc/Dorinha';

export interface DialogueChoice {
  id: string;
  text: string;
  next: string | null;
}

export interface DialogueTreeNode {
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueTree {
  entry: string;
  nodes: Record<string, DialogueTreeNode>;
}

export interface ChoiceDialogueAPI {
  npcId: string | null;
  currentNodeId: string | null;
  tree: DialogueTree | null;
  open: (npcId: string, tree: DialogueTree) => void;
  close: () => void;
  advance: (nextKey: string) => void;
}

interface NPCDialogueOverlayProps {
  npcName: string;
  node: DialogueTreeNode;
  onClose: () => void;
  onAdvance: (next: string) => void;
}

function NPCDialogueOverlay({ npcName, node, onClose, onAdvance }: NPCDialogueOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Conversa com ${npcName}`}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[640px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl shadow-xl text-slate-100"
    >
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h2 className="text-lg font-bold">{npcName}</h2>
        <button
          onClick={onClose}
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
        {node.choices.length > 0 ? (
          <div className="flex flex-col gap-2">
            {node.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => {
                  if (choice.next === null) onClose();
                  else onAdvance(choice.next);
                }}
                className="text-left bg-slate-700 hover:bg-amber-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={onClose}
            className="text-left bg-slate-700 hover:bg-amber-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg text-slate-100 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Tchau, {npcName}!
          </button>
        )}
      </div>
    </div>
  );
}

interface HintProps {
  npcName: string;
  hasShop: boolean;
}

function InteractHint({ npcName, hasShop }: HintProps) {
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-sm text-slate-100 flex flex-col items-center gap-0.5">
      <div>
        <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">E</kbd> conversar com{' '}
        <span className="font-semibold">{npcName}</span>
      </div>
      {hasShop && (
        <div>
          <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs">G</kbd>{' '}
          <span className="text-amber-300">abrir loja</span>
        </div>
      )}
    </div>
  );
}

export interface DialoguePipelineProps {
  playerPos: Vec2;
  dorinhaPos: Vec2;
  dorinhaTree: DialogueTree;
  store: ChoiceDialogueAPI;
}

export function DialoguePipeline({
  playerPos,
  dorinhaPos,
  dorinhaTree,
  store,
}: DialoguePipelineProps) {
  const isOpen = store.npcId === DORINHA_ID;

  const openDialogue = (npcId: string) => {
    if (npcId === DORINHA_ID) {
      store.open(DORINHA_ID, dorinhaTree);
    }
  };

  const { inRange } = useDorinhaInteraction(playerPos, dorinhaPos, openDialogue, isOpen);

  const currentNode =
    isOpen && store.tree && store.currentNodeId
      ? (store.tree.nodes[store.currentNodeId] ?? null)
      : null;

  if (isOpen && currentNode) {
    return (
      <NPCDialogueOverlay
        npcName={DORINHA_NAME}
        node={currentNode}
        onClose={store.close}
        onAdvance={store.advance}
      />
    );
  }

  if (inRange && !isOpen) {
    return <InteractHint npcName={DORINHA_NAME} hasShop />;
  }

  return null;
}
