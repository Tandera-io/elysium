import { beforeEach, describe, expect, it } from 'vitest';
import { useNpcStore } from './npcStore';

beforeEach(() => {
  const store = useNpcStore.getState();
  // Reset relations between tests
  useNpcStore.setState({ relations: {} });
  void store;
});

describe('NPC relation tracking', () => {
  it('starts with zero interactionCount and heartLevel', () => {
    const rel = useNpcStore.getState().getRelation('marina');
    expect(rel.interactionCount).toBe(0);
    expect(rel.heartLevel).toBe(0);
    expect(rel.questsCompleted).toBe(0);
  });

  it('bumpInteraction increments interactionCount', () => {
    useNpcStore.getState().bumpInteraction('marina');
    useNpcStore.getState().bumpInteraction('marina');
    const rel = useNpcStore.getState().getRelation('marina');
    expect(rel.interactionCount).toBe(2);
  });

  it('gainHeart adds heart points up to cap of 10', () => {
    useNpcStore.getState().gainHeart('bento', 7);
    useNpcStore.getState().gainHeart('bento', 5);
    const rel = useNpcStore.getState().getRelation('bento');
    expect(rel.heartLevel).toBe(10);
  });

  it('recordQuestComplete increments questsCompleted and adds 3 hearts', () => {
    useNpcStore.getState().recordQuestComplete('dorinha');
    const rel = useNpcStore.getState().getRelation('dorinha');
    expect(rel.questsCompleted).toBe(1);
    expect(rel.heartLevel).toBe(3);
  });

  it('tracks different NPCs independently', () => {
    useNpcStore.getState().bumpInteraction('marina');
    useNpcStore.getState().bumpInteraction('marina');
    useNpcStore.getState().bumpInteraction('bento');
    expect(useNpcStore.getState().getRelation('marina').interactionCount).toBe(2);
    expect(useNpcStore.getState().getRelation('bento').interactionCount).toBe(1);
  });
});
