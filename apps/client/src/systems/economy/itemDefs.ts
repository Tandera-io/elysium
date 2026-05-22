/**
 * Item registry used by the economy simulation.
 * Values are pure data — no runtime deps.
 */

export type EconomyItemId =
  | 'trigo'
  | 'tomate'
  | 'leite'
  | 'ovo'
  | 'lenha'
  | 'pao_frances'
  | 'bolo_fuba';

export interface ItemDef {
  id: EconomyItemId;
  name: string;
  basePrice: number;
  /** True if the item degrades (e.g. bread). Used by future spoilage logic. */
  perishable?: boolean;
}

export const ITEMS: Record<EconomyItemId, ItemDef> = {
  trigo: { id: 'trigo', name: 'Trigo', basePrice: 8 },
  tomate: { id: 'tomate', name: 'Tomate', basePrice: 6 },
  leite: { id: 'leite', name: 'Leite', basePrice: 7, perishable: true },
  ovo: { id: 'ovo', name: 'Ovo', basePrice: 4 },
  lenha: { id: 'lenha', name: 'Lenha', basePrice: 5 },
  pao_frances: { id: 'pao_frances', name: 'Pão francês', basePrice: 18, perishable: true },
  bolo_fuba: { id: 'bolo_fuba', name: 'Bolo de fubá', basePrice: 28, perishable: true },
};
