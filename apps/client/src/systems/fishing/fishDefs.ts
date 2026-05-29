export type FishId = 'cod' | 'trout' | 'salmon';

export interface FishDef {
  id: FishId;
  name: string;
  emoji: string;
  goldValue: number;
}

export const FISH_DEFS: Record<FishId, FishDef> = {
  cod: { id: 'cod', name: 'Bacalhau', emoji: '🐟', goldValue: 10 },
  trout: { id: 'trout', name: 'Truta', emoji: '🐠', goldValue: 25 },
  salmon: { id: 'salmon', name: 'Salmão', emoji: '🐡', goldValue: 50 },
};

export const FISH_IDS: FishId[] = ['cod', 'trout', 'salmon'];
