// Web Worker para calcular similaridade coseno entre main nodes do Grafo
// Semântico sem travar a UI. Recebe um array de { id, vector } e devolve
// as arestas de similaridade acima do threshold, com top-K por nó.
//
// Usado apenas quando o usuário ativa o toggle "similaridade semântica" —
// o modo padrão do grafo é categórico (zero custo de matemática).

export interface WorkerInput {
  entries: Array<{ id: string; vector: number[] }>;
  threshold: number;
  topK: number;
}

export interface WorkerOutput {
  edges: Array<{ source: string; target: string; sim: number }>;
}

function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || b.length !== a.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

self.addEventListener("message", (ev: MessageEvent<WorkerInput>) => {
  const { entries, threshold, topK } = ev.data;
  const pairs: Array<{ source: string; target: string; sim: number }> = [];
  const N = entries.length;

  for (let i = 0; i < N; i++) {
    const a = entries[i];
    if (a.vector.length === 0) continue;
    for (let j = i + 1; j < N; j++) {
      const b = entries[j];
      if (b.vector.length === 0) continue;
      const sim = cosine(a.vector, b.vector);
      if (sim >= threshold) {
        pairs.push({ source: a.id, target: b.id, sim });
      }
    }
  }

  // Top-K per node.
  const byNode = new Map<string, typeof pairs>();
  for (const p of pairs) {
    if (!byNode.has(p.source)) byNode.set(p.source, []);
    if (!byNode.has(p.target)) byNode.set(p.target, []);
    byNode.get(p.source)!.push(p);
    byNode.get(p.target)!.push(p);
  }
  const kept = new Set<string>();
  for (const list of byNode.values()) {
    list.sort((a, b) => b.sim - a.sim);
    for (const p of list.slice(0, topK)) {
      kept.add(`${p.source}__${p.target}`);
    }
  }

  const out: WorkerOutput = {
    edges: pairs.filter((p) => kept.has(`${p.source}__${p.target}`)),
  };
  (self as unknown as Worker).postMessage(out);
});
