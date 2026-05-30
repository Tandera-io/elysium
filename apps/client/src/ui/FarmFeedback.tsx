import { useFarmFeedbackStore } from '../systems/farming/farmFeedbackStore';

const KIND_CLASS: Record<string, string> = {
  success: 'bg-emerald-700/90 text-emerald-100 border-emerald-500',
  warn: 'bg-amber-700/90 text-amber-100 border-amber-500',
  error: 'bg-rose-700/90 text-rose-100 border-rose-500',
};

/**
 * Renders temporary farm action feedback messages (e.g. "Trigo plantado!",
 * "Sem sementes!") in the bottom-centre of the screen, above the Hotbar.
 * Messages auto-dismiss after 2.5 s via the feedback store.
 */
export function FarmFeedback() {
  const entries = useFarmFeedbackStore((s) => s.entries);
  const dismiss = useFarmFeedbackStore((s) => s.dismiss);

  if (entries.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-50">
      {entries.map((entry) => (
        <div
          key={entry.id}
          onClick={() => dismiss(entry.id)}
          className={`pointer-events-auto px-4 py-1.5 rounded-lg border text-sm font-mono shadow-lg animate-fade-in cursor-pointer select-none ${KIND_CLASS[entry.kind] ?? KIND_CLASS.success}`}
        >
          {entry.message}
        </div>
      ))}
    </div>
  );
}
