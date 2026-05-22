import { useEffect, useState } from 'react';
import { deleteSave, listSaves, readSave, writeSave, type SaveRow } from '../systems/save/saveDb';
import { applySnapshot, captureSnapshot } from '../systems/save/snapshot';

const SLOTS = [1, 2, 3] as const;

interface SaveMenuProps {
  open: boolean;
  onClose: () => void;
}

export function SaveMenu({ open, onClose }: SaveMenuProps) {
  const [saves, setSaves] = useState<Record<number, SaveRow | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open]);

  async function refresh() {
    const all = await listSaves();
    const map: Record<number, SaveRow | null> = { 1: null, 2: null, 3: null };
    for (const r of all) map[r.slot] = r;
    setSaves(map);
  }

  async function doSave(slot: number) {
    setBusy(`save-${slot}`);
    try {
      const snap = captureSnapshot();
      await writeSave({
        slot,
        name: `Save ${slot}`,
        timestamp: Date.now(),
        snapshot: snap,
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function doLoad(slot: number) {
    setBusy(`load-${slot}`);
    try {
      const row = await readSave(slot);
      if (row) applySnapshot(row.snapshot);
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function doDelete(slot: number) {
    setBusy(`delete-${slot}`);
    try {
      await deleteSave(slot);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[480px] max-w-[92vw] shadow-2xl">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">Save / Load</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </header>
        <div className="space-y-2">
          {SLOTS.map((slot) => {
            const row = saves[slot] ?? null;
            return (
              <div
                key={slot}
                className="border border-slate-700 rounded-lg p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 text-sm">
                  <div className="font-semibold text-slate-100">Slot {slot}</div>
                  {row ? (
                    <div className="text-xs text-slate-400 font-mono">
                      salvo em {new Date(row.timestamp).toLocaleString('pt-BR')}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">vazio</div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => void doSave(slot)}
                    disabled={busy !== null}
                    className="bg-amber-500 text-slate-900 px-3 py-1 rounded text-xs font-semibold disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => void doLoad(slot)}
                    disabled={busy !== null || !row}
                    className="bg-emerald-500 text-slate-900 px-3 py-1 rounded text-xs font-semibold disabled:opacity-50"
                  >
                    Carregar
                  </button>
                  <button
                    onClick={() => void doDelete(slot)}
                    disabled={busy !== null || !row}
                    className="bg-rose-700 text-slate-100 px-3 py-1 rounded text-xs disabled:opacity-50"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-4">
          Saves ficam só no seu navegador (IndexedDB). Memórias dos NPCs ficam no servidor e
          persistem independente do save.
        </p>
      </div>
    </div>
  );
}
