import { describe, expect, it } from 'vitest';
import { DORINHA_DIALOGUE_TREE, getEntryNode } from './DorinhaDialogue';

describe('getEntryNode', () => {
  it('maps vender activity to entry_vender', () => {
    expect(getEntryNode('vender')).toBe('entry_vender');
  });

  it('maps atender activity to entry_atender', () => {
    expect(getEntryNode('atender')).toBe('entry_atender');
  });

  it('maps almoco activity to entry_almoco', () => {
    expect(getEntryNode('almoco')).toBe('entry_almoco');
  });

  it('maps socializar activity to entry_socializar', () => {
    expect(getEntryNode('socializar')).toBe('entry_socializar');
  });

  it('maps acordar activity to entry_acordar', () => {
    expect(getEntryNode('acordar')).toBe('entry_acordar');
  });

  it('maps descanso activity to entry_descanso', () => {
    expect(getEntryNode('descanso')).toBe('entry_descanso');
  });

  it('falls back to entry_vender for unknown activity', () => {
    expect(getEntryNode('unknown')).toBe('entry_vender');
  });
});

describe('DORINHA_DIALOGUE_TREE', () => {
  it('has all entry nodes', () => {
    const entries = [
      'entry_vender',
      'entry_atender',
      'entry_almoco',
      'entry_socializar',
      'entry_acordar',
      'entry_descanso',
    ];
    for (const id of entries) {
      expect(DORINHA_DIALOGUE_TREE[id]).toBeDefined();
    }
  });

  it('every next pointer resolves to a valid node or null', () => {
    for (const [nodeId, node] of Object.entries(DORINHA_DIALOGUE_TREE)) {
      for (const choice of node.choices) {
        if (choice.next !== null) {
          expect(
            DORINHA_DIALOGUE_TREE[choice.next],
            `node "${nodeId}" choice "${choice.label}" → missing "${choice.next}"`,
          ).toBeDefined();
        }
      }
    }
  });

  it('each node has at least one choice', () => {
    for (const [id, node] of Object.entries(DORINHA_DIALOGUE_TREE)) {
      expect(node.choices.length, `node "${id}" has no choices`).toBeGreaterThan(0);
    }
  });

  it('catalogo_sementes lists available seeds', () => {
    const node = DORINHA_DIALOGUE_TREE['catalogo_sementes'];
    expect(node.text).toContain('trigo');
    expect(node.text).toContain('tomate');
  });

  it('abrir_loja node closes conversation (next = null in its only choice)', () => {
    const node = DORINHA_DIALOGUE_TREE['abrir_loja'];
    expect(node.choices.every((c) => c.next === null)).toBe(true);
  });
});
