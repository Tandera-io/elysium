import { useEffect, useRef, useState } from 'react';
import { useFishingStore, type FishId } from './fishingStore';
import { useInventoryStore } from '../inventory/inventoryStore';

const FISH_LABEL: Record<FishId, string> = {
  bass: 'Robalo',
  pike: 'Lúcio',
  perch: 'Perca',
};

const FISH_PRICE: Record<FishId, number> = {
  bass: 75,
  pike: 90,
  perch: 60,
};

const WINDOW_DURATION = 5000;
const BASE_SUCCESS_CHANCE = 0.7;

export function FishingMinigame() {
  const { isMinigameOpen, activeFish, closeMinigame } = useFishingStore();
  const addToInventory = useInventoryStore((s) => s.add);

  const [timeLeft, setTimeLeft] = useState(WINDOW_DURATION);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  const startRef = useRef<number>(Date.now());
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!isMinigameOpen) return;
    setTimeLeft(WINDOW_DURATION);
    setResult(null);
    resolvedRef.current = false;
    startRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, WINDOW_DURATION - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0 && !resolvedRef.current) {
        resolvedRef.current = true;
        console.info('fish got away');
        setResult('fail');
        setTimeout(closeMinigame, 1200);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isMinigameOpen, closeMinigame]);

  useEffect(() => {
    if (!isMinigameOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (resolvedRef.current) return;
      resolvedRef.current = true;

      const caught = Math.random() < BASE_SUCCESS_CHANCE;
      if (caught && activeFish) {
        addToInventory(activeFish, 1);
        setResult('success');
      } else {
        console.info('fish got away');
        setResult('fail');
      }
      setTimeout(closeMinigame, 1200);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMinigameOpen, activeFish, addToInventory, closeMinigame]);

  if (!isMinigameOpen) return null;

  const progress = (timeLeft / WINDOW_DURATION) * 100;

  return (
    <div className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-80 text-slate-100 flex flex-col gap-4 shadow-2xl">
        <div className="text-center">
          <div className="text-2xl mb-1">🎣</div>
          <div className="font-semibold text-lg">Pescando…</div>
          {activeFish && (
            <div className="text-slate-400 text-sm">
              {FISH_LABEL[activeFish]} · {FISH_PRICE[activeFish]}g
            </div>
          )}
        </div>

        {result === null && (
          <>
            <div className="bg-slate-800 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-blue-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-slate-300 text-sm">
              Pressione{' '}
              <kbd className="bg-slate-700 px-2 py-0.5 rounded text-xs font-mono">ESPAÇO</kbd> para
              fisgar!
            </div>
          </>
        )}

        {result === 'success' && (
          <div className="text-center text-green-400 font-semibold text-lg">
            ✅ Peixe capturado!
          </div>
        )}

        {result === 'fail' && (
          <div className="text-center text-red-400 font-semibold text-lg">❌ O peixe escapou!</div>
        )}
      </div>
    </div>
  );
}
