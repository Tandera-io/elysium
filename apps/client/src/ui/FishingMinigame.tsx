import { useEffect, useRef, useState } from 'react';
import { useFishingStore } from '../systems/fishing/fishingStore';
import { FISH_DEFS } from '../systems/fishing/fishDefs';

export function FishingMinigame() {
  const phase = useFishingStore((s) => s.phase);
  const biteDeadline = useFishingStore((s) => s.biteDeadline);
  const catchDeadline = useFishingStore((s) => s.catchDeadline);
  const lastResult = useFishingStore((s) => s.lastResult);
  const onBite = useFishingStore((s) => s.onBite);
  const catchFish = useFishingStore((s) => s.catchFish);
  const miss = useFishingStore((s) => s.miss);
  const reset = useFishingStore((s) => s.reset);

  const [reelPct, setReelPct] = useState(0);
  const [catchPct, setCatchPct] = useState(1);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (phase === 'idle') {
      setReelPct(0);
      setCatchPct(1);
      return;
    }

    let disposed = false;

    function tick() {
      if (disposed) return;
      const now = Date.now();

      if (phase === 'casting') {
        const pct = Math.min(1, (now - (biteDeadline - 4000)) / 4000);
        setReelPct(Math.max(0, Math.min(1, pct)));
        if (now >= biteDeadline) {
          onBite();
          return;
        }
      } else if (phase === 'biting') {
        const pct = Math.max(0, (catchDeadline - now) / 2000);
        setCatchPct(pct);
        if (now >= catchDeadline) {
          miss();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase, biteDeadline, catchDeadline, onBite, miss]);

  useEffect(() => {
    if (phase !== 'biting' && phase !== 'casting') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'biting') {
        e.preventDefault();
        catchFish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, catchFish]);

  useEffect(() => {
    if (phase !== 'result') return;
    const t = setTimeout(() => reset(), 2500);
    return () => clearTimeout(t);
  }, [phase, reset]);

  if (phase === 'idle') return null;

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center z-50">
      <div className="bg-slate-900/95 border border-blue-700 rounded-2xl p-6 w-72 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-blue-300 font-bold text-lg">🎣 Pescando</h2>
          <button
            onClick={reset}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {phase === 'casting' && (
          <>
            <p className="text-slate-300 text-sm text-center">Aguardando mordida…</p>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-none rounded-full"
                style={{
                  width: `${reelPct * 100}%`,
                  animation: 'pulse 1s ease-in-out infinite',
                }}
              />
            </div>
            <p className="text-slate-500 text-xs text-center">Seja paciente…</p>
          </>
        )}

        {phase === 'biting' && (
          <>
            <p className="text-amber-400 font-bold text-xl text-center animate-bounce">
              🐟 MORDIDA! Pressione Space!
            </p>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-none"
                style={{ width: `${catchPct * 100}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs text-center">Pressione Space para fisgar!</p>
          </>
        )}

        {phase === 'result' && lastResult && (
          <>
            {lastResult.caught ? (
              <>
                <p className="text-emerald-400 font-bold text-lg text-center">
                  {FISH_DEFS[lastResult.fishId].emoji} Pescou um {FISH_DEFS[lastResult.fishId].name}
                  !
                </p>
                <p className="text-amber-300 text-center font-mono">+{lastResult.gold}g</p>
              </>
            ) : (
              <p className="text-rose-400 font-bold text-lg text-center">😞 O peixe escapou!</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
