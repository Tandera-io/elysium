import { useEffect } from 'react';

interface DialogBoxProps {
  npcName: string;
  line: string;
  emotion?: string;
  onClose: () => void;
  onContinue?: () => void;
}

/**
 * Lightweight NPC speech bubble for displaying a single time-of-day greeting.
 * Used before the full chat dialogue opens.
 */
export function DialogBox({ npcName, line, onClose, onContinue }: DialogBoxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'Enter' || e.key === ' ') && onContinue) onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onContinue]);

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[480px] max-w-[92vw] bg-slate-900/95 backdrop-blur border border-amber-600/50 rounded-2xl shadow-xl text-slate-100">
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <span className="font-bold text-amber-400">{npcName}</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-sm"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
      <div className="px-4 py-4 text-sm leading-relaxed">{line}</div>
      {onContinue && (
        <div className="px-4 py-2 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-slate-400 text-xs hover:text-slate-200 px-2 py-1"
          >
            Fechar
          </button>
          <button
            onClick={onContinue}
            className="bg-amber-500 text-slate-900 px-3 py-1 rounded text-sm font-semibold"
          >
            Conversar →
          </button>
        </div>
      )}
    </div>
  );
}
