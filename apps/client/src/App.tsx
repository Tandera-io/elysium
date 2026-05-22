import { useEffect, useState } from 'react';
import type { HealthResponse } from '@elysium/shared';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse }
  | { kind: 'error'; message: string };

export function App() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as HealthResponse;
        if (!cancelled) setState({ kind: 'ok', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl p-8 space-y-4">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Elysium</h1>
          <p className="text-slate-400 text-sm mt-1">Bootstrap — Fase 0</p>
        </header>
        <section className="space-y-2 pt-4 border-t border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300">Server proxy check</h2>
          {state.kind === 'loading' && <p className="text-slate-500 text-sm">Conectando…</p>}
          {state.kind === 'error' && (
            <p className="text-rose-400 text-sm" data-testid="health-error">
              Erro: {state.message}
            </p>
          )}
          {state.kind === 'ok' && (
            <ul className="text-sm text-slate-300 space-y-1" data-testid="health-ok">
              <li>
                <span className="text-slate-500">status:</span>{' '}
                <span className="text-emerald-400">{state.data.status}</span>
              </li>
              <li>
                <span className="text-slate-500">service:</span> {state.data.service}
              </li>
              <li>
                <span className="text-slate-500">version:</span> {state.data.version}
              </li>
              <li>
                <span className="text-slate-500">Meshy key:</span>{' '}
                {state.data.hasMeshyKey ? '✓' : '✗'}
              </li>
              <li>
                <span className="text-slate-500">Anthropic key:</span>{' '}
                {state.data.hasAnthropicKey ? '✓' : '✗'}
              </li>
              <li>
                <span className="text-slate-500">NPC model:</span> {state.data.npcModel}
              </li>
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
