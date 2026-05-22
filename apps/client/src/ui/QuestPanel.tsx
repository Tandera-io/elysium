import { useQuestStore } from '../systems/quest/questStore';
import { ITEMS } from '../systems/economy/itemDefs';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { useNpcStore } from '../systems/npc/npcStore';

export function QuestPanel() {
  const active = useQuestStore((s) => s.active);
  const cash = useQuestStore((s) => s.cash);
  const reputation = useQuestStore((s) => s.reputation);
  const inv = useInventoryStore((s) => s.slots);
  const npcs = useNpcStore((s) => s.npcs);

  const list = Object.values(active);

  return (
    <aside className="absolute top-[230px] right-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 min-w-[220px] max-w-[260px]">
      <header className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-300">Quests</h2>
        <span className="text-amber-300 font-mono">💰 {cash}</span>
      </header>
      {list.length === 0 ? (
        <p className="text-slate-500 italic">sem quests ativas</p>
      ) : (
        <ul className="space-y-2">
          {list.map((q) => {
            const npc = npcs[q.giverNpcId];
            const have = inv.reduce(
              (acc, s) => (s?.id === (q.item as unknown as string) ? acc + s.qty : acc),
              0,
            );
            const ready = have >= q.quantity;
            return (
              <li
                key={q.id}
                className={`rounded p-1.5 ${ready ? 'bg-emerald-900/40 border border-emerald-700' : 'bg-slate-800/60'}`}
              >
                <div className="font-semibold text-slate-100">{npc?.def.name ?? q.giverNpcId}</div>
                <div className="text-slate-400">
                  Entregar {q.quantity}× {ITEMS[q.item].name}
                </div>
                <div className="text-slate-500 flex justify-between mt-1">
                  <span>
                    progresso: {have}/{q.quantity}
                  </span>
                  <span className="text-amber-300">+{q.rewardCash}🪙</span>
                </div>
                {ready && (
                  <div className="text-emerald-300 text-[10px] mt-1">
                    pronto — fale com {npc?.def.name ?? 'NPC'}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {Object.keys(reputation).length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="text-[10px] text-slate-500 mb-1">reputação</div>
          {Object.entries(reputation).map(([id, rep]) => (
            <div key={id} className="flex justify-between text-[11px]">
              <span>{npcs[id]?.def.name ?? id}</span>
              <span className="text-amber-300">+{rep}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
