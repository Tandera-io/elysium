import { beforeEach, describe, expect, it } from 'vitest';
import { proposeQuestFor } from './generator';
import { useQuestStore } from './questStore';
import { makeSeedMarket } from '../economy/seed';
import { tickDay } from '../economy/sim';

describe('proposeQuestFor', () => {
  it('returns null when the NPC has no real deficit', () => {
    const seed = makeSeedMarket();
    const content = {
      ...seed.actors.bento!,
      desiredStock: { trigo: 5 },
      stock: { trigo: 100 },
    };
    expect(proposeQuestFor(content, 1)).toBeNull();
  });

  it('returns a quest when an NPC is undersupplied', () => {
    const seed = makeSeedMarket();
    // Drain marina's trigo and re-run propose
    const marinaShort = {
      ...seed.actors.marina!,
      stock: { ...seed.actors.marina!.stock, trigo: 1 },
    };
    const q = proposeQuestFor(marinaShort, 5);
    expect(q).not.toBeNull();
    expect(q!.item).toBe('trigo');
    expect(q!.quantity).toBeGreaterThan(0);
    expect(q!.rewardCash).toBeGreaterThan(0);
    expect(q!.giverNpcId).toBe('marina');
    expect(q!.createdOnDay).toBe(5);
  });

  it('picks the worst deficit when multiple items are short', () => {
    const seed = makeSeedMarket();
    // Multiple deficits — pick the largest
    const bigShort = {
      ...seed.actors.marina!,
      stock: { trigo: 0, leite: 0, ovo: 0, lenha: 0, pao_frances: 0 },
    };
    const q = proposeQuestFor(bigShort, 5);
    expect(q).not.toBeNull();
    // Largest desired (lenha:12) → worst deficit
    expect(q!.item).toBe('lenha');
  });

  it('quests scale reward with item base price', () => {
    const seed = makeSeedMarket();
    const drained = {
      ...seed.actors.marina!,
      stock: { ...seed.actors.marina!.stock, pao_frances: 0 },
    };
    const q = proposeQuestFor(drained, 1);
    expect(q?.rewardCash).toBeGreaterThan(20); // pao_frances basePrice 18
  });
});

describe('questStore', () => {
  beforeEach(() => useQuestStore.getState().reset());

  it('accept moves a quest to active', () => {
    const seed = makeSeedMarket();
    const marinaShort = {
      ...seed.actors.marina!,
      stock: { ...seed.actors.marina!.stock, trigo: 1 },
    };
    const q = proposeQuestFor(marinaShort, 1)!;
    useQuestStore.getState().accept(q);
    expect(Object.keys(useQuestStore.getState().active)).toContain(q.id);
  });

  it('hasActiveFromNpc finds the quest for that giver', () => {
    const marinaShort = { ...makeSeedMarket().actors.marina!, stock: { trigo: 0 } };
    const q = proposeQuestFor(marinaShort, 1)!;
    useQuestStore.getState().accept(q);
    expect(useQuestStore.getState().hasActiveFromNpc('marina')?.id).toBe(q.id);
    expect(useQuestStore.getState().hasActiveFromNpc('bento')).toBeNull();
  });

  it('turnIn pays cash, bumps reputation, moves to completed', () => {
    const marinaShort = { ...makeSeedMarket().actors.marina!, stock: { trigo: 0 } };
    const q = proposeQuestFor(marinaShort, 1)!;
    useQuestStore.getState().accept(q);
    const before = useQuestStore.getState().cash;
    useQuestStore.getState().turnIn(q.id);
    const s = useQuestStore.getState();
    expect(s.cash).toBe(before + q.rewardCash);
    expect(s.reputation.marina).toBe(q.rewardReputation);
    expect(s.completed).toContain(q.id);
    expect(s.active[q.id]).toBeUndefined();
  });

  it('emerges naturally from an economy run', () => {
    // After 5 days the seed market should be in an interesting state
    let state = makeSeedMarket();
    for (let i = 0; i < 5; i++) state = tickDay(state);
    const quests = Object.values(state.actors)
      .map((a) => proposeQuestFor(a, state.day))
      .filter((q): q is NonNullable<typeof q> => q !== null);
    // At least one NPC should be short on something
    expect(quests.length).toBeGreaterThan(0);
  });
});
