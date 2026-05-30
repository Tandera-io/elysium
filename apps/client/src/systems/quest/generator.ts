import type { Actor } from '../economy/sim';
import { ITEMS, type EconomyItemId } from '../economy/itemDefs';
import type { Quest } from './questDefs';

/**
 * Per-NPC per-item offer and complete dialogue lines.
 * Keys are `${npcId}:${itemId}`.
 */
const QUEST_LINES: Record<string, { offer: string; complete: string }> = {
  'marina:trigo': {
    offer: 'Estou com pouco trigo e preciso fazer pão para o dia. Você poderia me trazer um pouco?',
    complete: 'Que alívio! Com esse trigo posso assar o pão fresquinho. Muito obrigada!',
  },
  'marina:leite': {
    offer: 'Acabou meu leite e o bolo de fubá precisa. Consegue me arranjar um pouco?',
    complete: 'Perfeito! Agora o bolo vai ficar uma delícia. Obrigada de coração!',
  },
  'marina:lenha': {
    offer: 'O forno está precisando de mais lenha ou não consigo assar nada. Me ajuda?',
    complete: 'Ótimo! Agora o forno vai queimar bem o dia todo. Valeu mesmo!',
  },
  'dorinha:trigo': {
    offer: 'Meu estoque de trigo está no fim. Você consegue me trazer um pouco para a quitanda?',
    complete: 'Boa safra! Obrigada — agora posso abastecer meus outros clientes.',
  },
  'dorinha:tomate': {
    offer: 'Acabou o tomate aqui e tô recebendo pedido toda hora. Você pode me ajudar?',
    complete: 'Esses tomates estão lindos! Muito obrigada, vai vender tudo hoje.',
  },
  'nina:lenha': {
    offer: 'Preciso de lenha para aquecer a ferragem no inverno. Você consegue me trazer?',
    complete: 'Perfeito! Com essa lenha a ferragem fica quentinha. Obrigada!',
  },
  'padre_pedro:pao_frances': {
    offer:
      'Filho, a Igreja precisa de pão para o encontro da comunidade desta semana. Você poderia ajudar?',
    complete: 'Deus te abençoe, meu filho! Este pão vai alimentar muita gente boa.',
  },
  'padre_pedro:mel': {
    offer:
      'O mel é sagrado para nossas cerimônias. Estamos sem estoque — você consegue nos ajudar?',
    complete: 'Que bênção! Este mel vai adoçar nossas preces. Muito obrigado.',
  },
  'arnaldo:madeira': {
    offer: 'Preciso de madeira boa para um encomenda urgente. Me traz, que pago bem.',
    complete: 'Excelente material! Essa madeira vai virar algo que dura gerações.',
  },
  'sofia:erva_medicinal': {
    offer: 'Estou sem erva medicinal e tenho pacientes esperando. Você consegue colher pra mim?',
    complete: 'Essas ervas estão frescas e cheias de força. Muito obrigada — você salvou o dia!',
  },
  'sofia:mel': {
    offer: 'O mel é ingrediente do meu xarope mais importante. Preciso urgente — me ajuda?',
    complete: 'Mel puro! Com isso preparo o remédio hoje mesmo. Valeu demais.',
  },
  'romeu:peixe': {
    offer: 'Eita, o rio tá bravo hoje e não consegui pescar. Você traz um peixe pra mim?',
    complete: 'Esse peixe tá lindo! Vou defumar hoje mesmo. Valeu parceiro!',
  },
  'bento:pao_frances': {
    offer: 'Acabou meu pão e ando cansado de cozinhar. Traz um da Marina pra mim?',
    complete: 'Pão fresquinho! Agora sim, isso é o que preciso depois de um dia na roça.',
  },
  'lucia:pao_frances': {
    offer: 'Não tive tempo de ir à padaria hoje. Você consegue me trazer um pão?',
    complete: 'Obrigada! Vai fazer a diferença no fim do dia.',
  },
};

/**
 * Inspect an NPC's economic state and propose a quest if there's a real
 * shortage (current stock below desiredStock by ≥ 3 units). Returns null
 * if the NPC is content. Pure function — easy to unit-test.
 */
export function proposeQuestFor(
  actor: Actor,
  day: number,
  options: { minDeficit?: number; rewardPerUnit?: number } = {},
): Quest | null {
  const minDeficit = options.minDeficit ?? 3;
  const rewardPerUnit = options.rewardPerUnit ?? 1.5;

  let worstItem: EconomyItemId | null = null;
  let worstDeficit = 0;
  for (const [item, desired] of Object.entries(actor.desiredStock) as [EconomyItemId, number][]) {
    if (!desired || desired <= 0) continue;
    const have = actor.stock[item] ?? 0;
    const deficit = desired - have;
    if (deficit >= minDeficit && deficit > worstDeficit) {
      worstItem = item;
      worstDeficit = deficit;
    }
  }
  if (!worstItem) return null;

  const quantity = Math.max(1, Math.ceil(worstDeficit / 2));
  const def = ITEMS[worstItem];
  const reward = Math.round(def.basePrice * quantity * rewardPerUnit);

  const questLineKey = `${actor.id}:${worstItem}`;
  const lines = QUEST_LINES[questLineKey];

  return {
    id: `${actor.id}-${worstItem}-d${day}`,
    giverNpcId: actor.id,
    item: worstItem,
    quantity,
    rewardCash: reward,
    rewardReputation: 1,
    status: 'available',
    createdOnDay: day,
    offerLine: lines?.offer,
    completeLine: lines?.complete,
  };
}
