import { usePlayerStore } from '../store/playerStore';

export function EnergyBar() {
  const energy = usePlayerStore((s) => s.energy);
  const maxEnergy = usePlayerStore((s) => s.maxEnergy);
  const pct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;
  const tired = energy <= 0;

  return (
    <div
      className="mt-1 flex items-center gap-1.5"
      title={tired ? 'Cansado demais para trabalhar!' : `Energia: ${energy}/${maxEnergy}`}
    >
      <span className="text-xs text-slate-300">⚡</span>
      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 bg-red-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 font-mono">{energy}</span>
      {tired && <span className="text-[10px] text-rose-400">cansado</span>}
    </div>
  );
}
