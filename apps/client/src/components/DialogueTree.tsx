import { useState } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useNPCShopStore, DORINHA_SHOP_ID } from '../systems/npc/NPCShop';
import dorinhaTree from '../data/npcs/Dorinha.json';

interface DialogueChoice {
  id: string;
  text: string;
  next: string;
}

interface DialogueNode {
  text: string;
  emotion: string;
  action?: string;
  choices: DialogueChoice[];
}

interface DialogueTreeData {
  npcId: string;
  tree: Record<string, DialogueNode>;
}

const TREES: Record<string, DialogueTreeData> = {
  dorinha: dorinhaTree as DialogueTreeData,
};

const EMOTION_ICONS: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  neutral: '🙂',
  annoyed: '😤',
  sad: '😔',
};

interface DialogueTreeProps {
  npcId: string;
}

export function DialogueTree({ npcId }: DialogueTreeProps) {
  const [nodeId, setNodeId] = useState('start');
  const close = useDialogueStore((s) => s.close);
  const openShop = useNPCShopStore((s) => s.openShop);

  const treeData = TREES[npcId];
  if (!treeData) return null;

  const node = treeData.tree[nodeId];
  if (!node) return null;

  const handleChoice = (choice: DialogueChoice) => {
    if (choice.next === 'end') {
      close();
      return;
    }

    const nextNode = treeData.tree[choice.next];
    if (!nextNode) return;

    setNodeId(choice.next);

    if (nextNode.action === 'open_shop') {
      openShop(DORINHA_SHOP_ID);
    }
  };

  const icon = EMOTION_ICONS[node.emotion] ?? '🙂';

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex gap-2 bg-slate-800 rounded-xl px-3 py-2">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <p className="text-sm text-slate-100 leading-relaxed">{node.text}</p>
      </div>
      <div className="flex flex-col gap-2">
        {node.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoice(choice)}
            className="text-left px-3 py-2 rounded-lg bg-slate-700 hover:bg-amber-500 hover:text-slate-900 text-sm text-slate-100 transition-colors"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function hasDialogueTree(npcId: string): boolean {
  return npcId in TREES;
}
