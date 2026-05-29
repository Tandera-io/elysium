import { useEffect } from 'react';
import { useFishingStore } from '../systems/fishing/fishingStore';

const PHASE_MESSAGES: Record<string, string> = {
  casting: 'Lançando...',
  waiting: 'Aguardando peixe...',
  bite: 'MORDIDA! Pressione Espaço!',
  caught: 'Peixe capturado!',
  missed: 'O peixe escapou...',
  idle: '',
  reeling: 'Puxando...',
};

export function FishingPanel() {
  const isFishing = useFishingStore((s) => s.isFishing);
  const phase = useFishingStore((s) => s.phase);
  const fishCaught = useFishingStore((s) => s.fishCaught);

  // Animate reel indicator (oscillates back and forth)
  useEffect(() => {
    if (!isFishing || phase === 'caught' || phase === 'missed' || phase === 'idle') return;
    let raf = 0;
    const start = Date.now();
    const speed = phase === 'bite' ? 2.2 : 1.0;
    const loop = () => {
      const elapsed = (Date.now() - start) / 1000;
      const pos = 50 + 48 * Math.sin(elapsed * speed * Math.PI);
      useFishingStore.setState({ reelPos: pos });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isFishing, phase]);

  if (!isFishing) return null;

  const isBite = phase === 'bite';
  const isCaught = phase === 'caught';
  const isMissed = phase === 'missed';

  return (
    <>
      <style>{`
        @keyframes fishing-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
        }
        @keyframes caught-pop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .fishing-bite-glow {
          animation: fishing-pulse 0.5s ease-in-out infinite;
        }
        .fishing-caught-pop {
          animation: caught-pop 0.4s ease-out forwards;
        }
      `}</style>

      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        style={{ minWidth: 320 }}
      >
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur rounded-xl px-6 py-2 text-slate-100 text-base font-bold tracking-wide">
          Pescando
          {fishCaught > 0 && (
            <span className="ml-2 text-amber-300 text-sm font-mono">
              {fishCaught} peixe{fishCaught !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Reel bar */}
        {!isCaught && !isMissed && (
          <div
            className={`relative w-80 h-8 rounded-full overflow-hidden bg-slate-800 border-2 ${
              isBite ? 'border-amber-400 fishing-bite-glow' : 'border-slate-600'
            }`}
          >
            <TrackFill isBite={isBite} />
            <ReelIndicator />
            {/* Center target zone */}
            <div
              className={`absolute inset-y-1 w-12 rounded-full ${
                isBite ? 'bg-amber-400/40' : 'bg-blue-400/20'
              }`}
              style={{ left: 'calc(50% - 24px)' }}
            />
          </div>
        )}

        {/* Status message */}
        <div
          className={`px-5 py-2 rounded-lg text-sm font-semibold text-center backdrop-blur ${
            isBite
              ? 'bg-amber-500/90 text-slate-900'
              : isCaught
                ? 'bg-emerald-600/90 text-white fishing-caught-pop'
                : isMissed
                  ? 'bg-rose-700/90 text-white'
                  : 'bg-slate-800/90 text-slate-200'
          }`}
        >
          {PHASE_MESSAGES[phase] ?? ''}
        </div>

        {/* Controls hint */}
        {!isCaught && !isMissed && (
          <div className="text-xs text-slate-400 flex gap-4">
            {isBite && (
              <span>
                <kbd className="font-mono bg-slate-700 px-1.5 py-0.5 rounded text-slate-200">
                  Espaço
                </kbd>{' '}
                pegar
              </span>
            )}
            <span>
              <kbd className="font-mono bg-slate-700 px-1.5 py-0.5 rounded text-slate-200">Esc</kbd>{' '}
              cancelar
            </span>
          </div>
        )}
      </div>
    </>
  );
}

function TrackFill({ isBite }: { isBite: boolean }) {
  const reelPos = useFishingStore((s) => s.reelPos);
  return (
    <div
      className={`absolute inset-y-0 left-0 transition-none ${
        isBite ? 'bg-amber-500/30' : 'bg-blue-900/40'
      }`}
      style={{ width: `${reelPos}%` }}
    />
  );
}

function ReelIndicator() {
  const reelPos = useFishingStore((s) => s.reelPos);
  return (
    <div
      className="absolute top-1 bottom-1 w-3 rounded-full bg-white shadow-lg"
      style={{
        left: `calc(${reelPos}% - 6px)`,
        transition: 'left 50ms linear',
      }}
    />
  );
}
