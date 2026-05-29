import { describe, expect, it, beforeEach } from 'vitest';
import { useNpcDialogueStore } from './npcStore';

describe('useNpcDialogueStore', () => {
  beforeEach(() => {
    useNpcDialogueStore.setState({ social: {} });
  });

  it('getSocial returns default entry for untracked NPC', () => {
    const social = useNpcDialogueStore.getState().getSocial('dorinha');
    expect(social.heartLevel).toBe(0);
    expect(social.lastTalkedDay).toBeNull();
    expect(social.totalTalks).toBe(0);
  });

  it('recordTalk increments totalTalks', () => {
    useNpcDialogueStore.getState().recordTalk('dorinha', 1);
    expect(useNpcDialogueStore.getState().getSocial('dorinha').totalTalks).toBe(1);
  });

  it('recordTalk awards +1 heart on first talk of the day', () => {
    useNpcDialogueStore.getState().recordTalk('dorinha', 1);
    expect(useNpcDialogueStore.getState().getSocial('dorinha').heartLevel).toBe(1);
  });

  it('recordTalk does not award heart for same-day repeat talk', () => {
    const { recordTalk, getSocial } = useNpcDialogueStore.getState();
    recordTalk('dorinha', 1);
    recordTalk('dorinha', 1);
    expect(getSocial('dorinha').heartLevel).toBe(1);
    expect(getSocial('dorinha').totalTalks).toBe(2);
  });

  it('recordTalk awards heart again on a new day', () => {
    const { recordTalk, getSocial } = useNpcDialogueStore.getState();
    recordTalk('dorinha', 1);
    recordTalk('dorinha', 2);
    expect(getSocial('dorinha').heartLevel).toBe(2);
  });

  it('addHearts increases heart level', () => {
    const { addHearts, getSocial } = useNpcDialogueStore.getState();
    addHearts('dorinha', 3);
    expect(getSocial('dorinha').heartLevel).toBe(3);
  });

  it('addHearts clamps heartLevel to 10', () => {
    const { addHearts, getSocial } = useNpcDialogueStore.getState();
    addHearts('dorinha', 15);
    expect(getSocial('dorinha').heartLevel).toBe(10);
  });

  it('addHearts clamps heartLevel to 0 on negative delta', () => {
    const { addHearts, getSocial } = useNpcDialogueStore.getState();
    addHearts('dorinha', -5);
    expect(getSocial('dorinha').heartLevel).toBe(0);
  });

  it('tracks multiple NPCs independently', () => {
    const { recordTalk, getSocial } = useNpcDialogueStore.getState();
    recordTalk('dorinha', 1);
    recordTalk('marina', 1);
    recordTalk('dorinha', 2);
    expect(getSocial('dorinha').heartLevel).toBe(2);
    expect(getSocial('marina').heartLevel).toBe(1);
  });
});
