import { beforeEach, describe, expect, it } from 'vitest';
import { useChoiceDialogueStore } from './choiceDialogueStore';
import type { DialogueData } from './choiceDialogueStore';

const FIXTURE: DialogueData = {
  version: 1,
  npc_id: 'test_npc',
  entry: 'start',
  dialogues: [
    {
      id: 'start',
      text: 'Olá! O que você precisa?',
      choices: [
        { id: 'go_next', text: 'Continuar', next: 'second' },
        { id: 'bye', text: 'Tchau', action: 'close' },
      ],
    },
    {
      id: 'second',
      text: 'Chegou no segundo nó!',
      choices: [{ id: 'end', text: 'Encerrar', action: 'close' }],
    },
  ],
};

describe('useChoiceDialogueStore', () => {
  beforeEach(() => useChoiceDialogueStore.getState().close());

  describe('openDialogue', () => {
    it('sets npcId, npcName, dialogueData and currentNodeId to the entry node', () => {
      useChoiceDialogueStore.getState().openDialogue('test_npc', 'Tester', FIXTURE);
      const s = useChoiceDialogueStore.getState();
      expect(s.npcId).toBe('test_npc');
      expect(s.npcName).toBe('Tester');
      expect(s.dialogueData).toBe(FIXTURE);
      expect(s.currentNodeId).toBe('start');
    });
  });

  describe('currentNode()', () => {
    it('returns the node matching currentNodeId', () => {
      useChoiceDialogueStore.getState().openDialogue('test_npc', 'Tester', FIXTURE);
      const node = useChoiceDialogueStore.getState().currentNode();
      expect(node).not.toBeNull();
      expect(node!.id).toBe('start');
      expect(node!.text).toBe('Olá! O que você precisa?');
    });

    it('returns null when no dialogue is open', () => {
      expect(useChoiceDialogueStore.getState().currentNode()).toBeNull();
    });
  });

  describe('selectChoice', () => {
    it('navigates to the next node when choice has a next property', () => {
      useChoiceDialogueStore.getState().openDialogue('test_npc', 'Tester', FIXTURE);
      const goNext = FIXTURE.dialogues[0]!.choices[0]!;
      useChoiceDialogueStore.getState().selectChoice(goNext);
      expect(useChoiceDialogueStore.getState().currentNodeId).toBe('second');
      const node = useChoiceDialogueStore.getState().currentNode();
      expect(node!.id).toBe('second');
    });

    it('closes dialogue when choice has action="close"', () => {
      useChoiceDialogueStore.getState().openDialogue('test_npc', 'Tester', FIXTURE);
      const bye = FIXTURE.dialogues[0]!.choices[1]!;
      useChoiceDialogueStore.getState().selectChoice(bye);
      const s = useChoiceDialogueStore.getState();
      expect(s.npcId).toBeNull();
      expect(s.npcName).toBeNull();
      expect(s.currentNodeId).toBeNull();
      expect(s.dialogueData).toBeNull();
    });
  });

  describe('close()', () => {
    it('resets all state to null', () => {
      useChoiceDialogueStore.getState().openDialogue('test_npc', 'Tester', FIXTURE);
      useChoiceDialogueStore.getState().close();
      const s = useChoiceDialogueStore.getState();
      expect(s.npcId).toBeNull();
      expect(s.npcName).toBeNull();
      expect(s.currentNodeId).toBeNull();
      expect(s.dialogueData).toBeNull();
    });
  });
});
