import { useEffect, useState } from 'react';
import { listSaves, readSave, type SaveRow } from '../systems/save/saveDb';
import { applySnapshot } from '../systems/save/snapshot';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [saves, setSaves] = useState<SaveRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void listSaves().then(setSaves);
  }, []);

  async function continueFrom(slot: number) {
    setLoading(true);
    try {
      const row = await readSave(slot);
      if (row) applySnapshot(row.snapshot);
      onStart();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 bg-gradient-to-b from-slate-950 via-emerald-950 to-amber-950 flex items-center justify-center">
      <div className="text-center max-w-lg px-6">
        <h1 className="text-7xl font-extrabold tracking-tight text-amber-200 mb-2 drop-shadow-lg">
          Elysium
        </h1>
        <p className="text-slate-300 text-sm mb-10">
          Um RPG isométrico de fazenda com NPCs vivos e economia circular.
        </p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <button
            onClick={onStart}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2.5 rounded-lg font-semibold text-base"
          >
            Novo Jogo
          </button>
          {saves.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 mb-1.5">Continuar de:</p>
              {saves.map((s) => (
                <button
                  key={s.slot}
                  disabled={loading}
                  onClick={() => void continueFrom(s.slot)}
                  className="block w-full bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm font-mono mb-1 disabled:opacity-50"
                >
                  Slot {s.slot} — {new Date(s.timestamp).toLocaleString('pt-BR')}
                </button>
              ))}
            </div>
          )}
        </div>
        <footer className="mt-12 text-[11px] text-slate-500 space-y-1">
          <p>Versão 0.0.1 · build local</p>
          <p>
            Sem chave Anthropic configurada, os NPCs ficam mudos. Adicione{' '}
            <code className="bg-slate-800 px-1 rounded">ANTHROPIC_API_KEY</code> no{' '}
            <code className="bg-slate-800 px-1 rounded">.env</code> para conversar.
          </p>
          <p className="text-slate-600">
            WASD para mover · clique para ir até um tile · E para conversar
          </p>
        </footer>
      </div>
    </div>
  );
}
