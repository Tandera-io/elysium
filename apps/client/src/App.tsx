import { useEffect, useState } from 'react';
import type { HealthResponse } from '@elysium/shared';
import { Scene } from './engine/scene/Scene';

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
    <main className="h-screen w-screen overflow-hidden relative bg-slate-900">
      <Scene />
      <header className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur rounded-lg px-4 py-2 text-slate-100">
        <h1 className="text-xl font-bold tracking-tight">Elysium</h1>
        <p className="text-slate-300 text-xs">Fase 2 · player controller</p>
      </header>
      <aside
        className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
        data-testid="health-panel"
      >
        {state.kind === 'loading' && <span>conectando…</span>}
        {state.kind === 'error' && <span className="text-rose-400">erro: {state.message}</span>}
        {state.kind === 'ok' && (
          <span>
            <span className="text-emerald-400">●</span> server {state.data.version} ·{' '}
            <span title="MESHY_API_KEY">M:{state.data.hasMeshyKey ? '✓' : '✗'}</span> ·{' '}
            <span title="ANTHROPIC_API_KEY">A:{state.data.hasAnthropicKey ? '✓' : '✗'}</span>
          </span>
        )}
      </aside>
    </main>
  );
}
