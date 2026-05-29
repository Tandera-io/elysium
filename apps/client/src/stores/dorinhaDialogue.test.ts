import { describe, beforeEach, expect, it } from 'vitest';
import { useChoiceDialogueStore } from './dialogueStore';
import type { DialogueTree } from './dialogueStore';

const tree: DialogueTree = {
  entry: 'greeting',
  nodes: {
    greeting: {
      text: 'Ei! O que você precisa?',
      choices: [
        { id: 'chat', text: 'Só vim dar um oi.', next: 'chat' },
        { id: 'bye', text: 'Até logo!', next: null },
      ],
    },
    chat: {
      text: 'Boa conversa!',
      choices: [{ id: 'close', text: 'Tchau!', next: null }],
    },
  },
};

describe('useChoiceDialogueStore — Dorinha dialogue', () => {
  beforeEach(() => {
    useChoiceDialogueStore.getState().close();
  });

  it('starts closed', () => {
    expect(useChoiceDialogueStore.getState().npcId).toBeNull();
    expect(useChoiceDialogueStore.getState().tree).toBeNull();
    expect(useChoiceDialogueStore.getState().currentNodeId).toBeNull();
  });

  it('open() sets npcId and positions at entry node', () => {
    useChoiceDialogueStore.getState().open('dorinha', tree);
    const s = useChoiceDialogueStore.getState();
    expect(s.npcId).toBe('dorinha');
    expect(s.currentNodeId).toBe('greeting');
    expect(s.tree).toBe(tree);
  });

  it('advance() moves to the next node', () => {
    useChoiceDialogueStore.getState().open('dorinha', tree);
    useChoiceDialogueStore.getState().advance('chat');
    expect(useChoiceDialogueStore.getState().currentNodeId).toBe('chat');
  });

  it('close() resets all state', () => {
    useChoiceDialogueStore.getState().open('dorinha', tree);
    useChoiceDialogueStore.getState().close();
    const s = useChoiceDialogueStore.getState();
    expect(s.npcId).toBeNull();
    expect(s.tree).toBeNull();
    expect(s.currentNodeId).toBeNull();
  });

  it('entry node has multiple interaction choices', () => {
    useChoiceDialogueStore.getState().open('dorinha', tree);
    const s = useChoiceDialogueStore.getState();
    const node = s.tree?.nodes[s.currentNodeId ?? ''];
    expect(node?.choices.length).toBeGreaterThan(1);
  });
});
