import { useMiningStore } from '../systems/mining/miningStore';
import { VEINS_BY_DEPTH, ORE_DEFS } from '../systems/mining/oreDefs';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import { useToolStore } from '../store/toolStore';

const MAX_DEPTH = 3;

export function MineCaveScene() {
  const caveOpen = useMiningStore((s) => s.caveOpen);
  const currentDepth = useMiningStore((s) => s.currentDepth);
  const harvestedVeins = useMiningStore((s) => s.harvestedVeins);
  const exitCave = useMiningStore((s) => s.exitCave);
  const setDepth = useMiningStore((s) => s.setDepth);
  const harvestVein = useMiningStore((s) => s.harvestVein);
  const addItem = useInventoryStore((s) => s.add);
  const currentTool = useToolStore((s) => s.current);

  if (!caveOpen) return null;

  const veins = VEINS_BY_DEPTH[currentDepth] ?? [];
  const hasPickaxe = currentTool === 'pickaxe';

  const onMine = (veinId: string) => {
    if (!hasPickaxe) return;
    const result = harvestVein(veinId);
    if (result) {
      addItem(result.oreId, result.quantity);
    }
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 flex items-center justify-center z-40"
      style={{ background: 'radial-gradient(ellipse at center, #2a1a0a 0%, #0d0806 100%)' }}
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-lg p-6">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-amber-300 font-bold text-xl tracking-wide">
            ⛏️ Mina — Nível {currentDepth}
          </h2>
          <button
            onClick={exitCave}
            className="text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg px-3 py-1.5 text-sm border border-slate-600"
          >
            ↑ Sair da Mina
          </button>
        </div>

        {!hasPickaxe && (
          <div className="bg-amber-900/60 border border-amber-700 rounded-lg px-4 py-2 text-amber-300 text-sm text-center">
            Equipe a picareta{' '}
            <kbd className="bg-amber-800 px-1.5 py-0.5 rounded text-xs font-mono">7</kbd> para
            minerar
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 w-full">
          {veins.map((vein) => {
            const def = ORE_DEFS[vein.oreId];
            const mined = harvestedVeins.has(vein.id);
            return (
              <button
                key={vein.id}
                onClick={() => onMine(vein.id)}
                disabled={mined || !hasPickaxe}
                className={[
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition',
                  mined
                    ? 'border-slate-700 bg-slate-900/50 opacity-40 cursor-not-allowed'
                    : hasPickaxe
                      ? 'border-amber-600 bg-slate-800 hover:bg-slate-700 cursor-pointer'
                      : 'border-slate-600 bg-slate-800/50 cursor-not-allowed',
                ].join(' ')}
              >
                <span className="text-3xl">{def.emoji}</span>
                <span
                  className="text-xs font-mono text-center leading-tight"
                  style={{ color: mined ? '#555' : def.color }}
                >
                  {mined ? 'esgotado' : def.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          {currentDepth > 1 && (
            <button
              onClick={() => setDepth(currentDepth - 1)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm border border-slate-600"
            >
              ↑ Subir (nível {currentDepth - 1})
            </button>
          )}
          {currentDepth < MAX_DEPTH && (
            <button
              onClick={() => setDepth(currentDepth + 1)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm border border-amber-700"
            >
              ↓ Descer (nível {currentDepth + 1})
            </button>
          )}
        </div>

        <div className="text-slate-500 text-xs text-center">
          Níveis mais fundos têm minério mais raro · Cobre → Ferro → Ouro
        </div>
      </div>
    </div>
  );
}
