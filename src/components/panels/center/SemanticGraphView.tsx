// Grafo semântico que correlaciona concept arts aprovados com documentos
// narrativos (Lore, Personagens, Direção de Arte). Nós são tirados do índice
// KB em memória; arestas são similaridades coseno (ou Jaccard no fallback
// lexical) acima de um limiar, limitadas a top-5 por nó para legibilidade.

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Network, RefreshCw, Image as ImageIcon } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getIndexSnapshot,
  kbBackendStatus,
  type PersistedEntry,
} from "@/lib/kb";
import { truncate } from "@/lib/utils";
import { EmptyStateMap } from "./MechanicsMapView";

const ART_TYPES = new Set(["concept_art", "sprite", "tile"]);
const DOC_PHASES = new Set([5, 6, 9]);

const SIM_THRESHOLD_SEMANTIC = 0.55;
const SIM_THRESHOLD_LEXICAL = 0.25;
const TOP_EDGES_PER_NODE = 5;

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  stats: { arts: number; docs: number; edges: number };
  mode: "semantic" | "lexical";
}

function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function tokenize(text: string): Set<string> {
  const set = new Set<string>();
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .forEach((w) => {
      if (w.length >= 4) set.add(w);
    });
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function extractDocTitle(content: string): string {
  const firstLine = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.replace(/^#+\s*/, "").slice(0, 40);
}

function phaseLabel(phase?: number): string {
  if (phase === 5) return "Lore";
  if (phase === 6) return "Personagens";
  if (phase === 9) return "Direção de Arte";
  return phase != null ? `Fase ${phase}` : "Doc";
}

function buildGraph(entries: PersistedEntry[]): GraphData {
  const arts = entries.filter((e) => ART_TYPES.has(e.documentType));
  const docs = entries.filter(
    (e) =>
      !ART_TYPES.has(e.documentType) &&
      e.phase != null &&
      DOC_PHASES.has(e.phase)
  );

  const relevant = [...arts, ...docs];
  if (relevant.length === 0) {
    return {
      nodes: [],
      edges: [],
      stats: { arts: 0, docs: 0, edges: 0 },
      mode: kbBackendStatus().mode,
    };
  }

  const hasEmbeddings = relevant.some((e) => e.vector.length > 0);
  const mode: "semantic" | "lexical" = hasEmbeddings ? "semantic" : "lexical";
  const threshold = hasEmbeddings
    ? SIM_THRESHOLD_SEMANTIC
    : SIM_THRESHOLD_LEXICAL;

  const tokensCache = new Map<string, Set<string>>();
  const getTokens = (e: PersistedEntry) => {
    let t = tokensCache.get(e.id);
    if (!t) {
      t = tokenize(e.content);
      tokensCache.set(e.id, t);
    }
    return t;
  };

  // Layout: arts em anel externo, docs em anel interno.
  const center = { x: 500, y: 380 };
  const outerR = 320;
  const innerR = 150;

  const nodes: Node[] = [];

  arts.forEach((e, i) => {
    const angle = arts.length > 0 ? (i / arts.length) * Math.PI * 2 : 0;
    const thumbUrl = e.assetPath
      ? (() => {
          try {
            return convertFileSrc(e.assetPath);
          } catch {
            return null;
          }
        })()
      : null;
    nodes.push({
      id: e.id,
      position: {
        x: center.x + Math.cos(angle) * outerR,
        y: center.y + Math.sin(angle) * outerR,
      },
      data: {
        label: (
          <div className="flex flex-col items-center gap-1 w-[140px]">
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={e.content.slice(0, 30)}
                className="w-[72px] h-[72px] object-contain rounded bg-black/40"
                style={{ imageRendering: "pixelated" }}
                onError={(ev) => {
                  (ev.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded bg-black/40 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="text-[10px] text-center leading-tight">
              {truncate(e.content.replace(/^\[[^\]]+\]\s*/, ""), 48)}
            </div>
          </div>
        ),
      },
      style: {
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--primary) / 0.5)",
        borderRadius: 10,
        padding: 6,
        color: "hsl(var(--foreground))",
      },
    });
  });

  docs.forEach((e, i) => {
    const angle = docs.length > 0 ? (i / docs.length) * Math.PI * 2 : 0;
    nodes.push({
      id: e.id,
      position: {
        x: center.x + Math.cos(angle) * innerR,
        y: center.y + Math.sin(angle) * innerR,
      },
      data: {
        label: (
          <div className="flex flex-col gap-1 w-[160px]">
            <div className="text-[10px] uppercase tracking-wide text-primary font-semibold">
              {phaseLabel(e.phase)}
            </div>
            <div className="text-[11px] font-medium leading-tight">
              {truncate(extractDocTitle(e.content), 40)}
            </div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              {truncate(e.content, 80)}
            </div>
          </div>
        ),
      },
      style: {
        background: "hsl(var(--accent) / 0.25)",
        border: "1px solid hsl(var(--accent))",
        borderRadius: 10,
        padding: 8,
        color: "hsl(var(--foreground))",
      },
    });
  });

  // Computa similaridade entre todos os pares (N costuma ser pequeno).
  type Pair = { a: string; b: string; sim: number };
  const pairs: Pair[] = [];
  for (let i = 0; i < relevant.length; i++) {
    for (let j = i + 1; j < relevant.length; j++) {
      const a = relevant[i];
      const b = relevant[j];
      let sim = 0;
      if (hasEmbeddings && a.vector.length > 0 && b.vector.length > 0) {
        sim = cosine(a.vector, b.vector);
      } else {
        sim = jaccard(getTokens(a), getTokens(b));
      }
      if (sim >= threshold) {
        pairs.push({ a: a.id, b: b.id, sim });
      }
    }
  }

  // Limita top-K por nó.
  const byNode = new Map<string, Pair[]>();
  for (const p of pairs) {
    if (!byNode.has(p.a)) byNode.set(p.a, []);
    if (!byNode.has(p.b)) byNode.set(p.b, []);
    byNode.get(p.a)!.push(p);
    byNode.get(p.b)!.push(p);
  }
  const kept = new Set<string>();
  for (const [, list] of byNode) {
    list.sort((x, y) => y.sim - x.sim);
    for (const p of list.slice(0, TOP_EDGES_PER_NODE)) {
      kept.add(`${p.a}__${p.b}`);
    }
  }

  const edges: Edge[] = pairs
    .filter((p) => kept.has(`${p.a}__${p.b}`))
    .map((p, i) => ({
      id: `e-${i}`,
      source: p.a,
      target: p.b,
      animated: false,
      label: p.sim.toFixed(2),
      labelStyle: {
        fill: "hsl(var(--muted-foreground))",
        fontSize: 9,
      },
      labelBgStyle: {
        fill: "hsl(var(--background))",
        fillOpacity: 0.8,
      },
      style: {
        stroke: "hsl(var(--primary) / 0.45)",
        strokeWidth: Math.max(1, Math.min(3, p.sim * 3)),
      },
    }));

  return {
    nodes,
    edges,
    stats: { arts: arts.length, docs: docs.length, edges: edges.length },
    mode,
  };
}

export function SemanticGraphView() {
  const { currentProject } = useProjectStore();
  const [entries, setEntries] = useState<PersistedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const snap = await getIndexSnapshot(currentProject.id);
      setEntries(snap.entries);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh quando outros módulos (pipeline automático, aprovação manual
  // de assets) sinalizam que o KB mudou. Evento global custom: "kb-updated".
  useEffect(() => {
    if (!currentProject) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { projectId?: string } | undefined;
      if (!detail?.projectId || detail.projectId === currentProject.id) {
        load();
      }
    };
    window.addEventListener("kb-updated", handler as EventListener);
    return () =>
      window.removeEventListener("kb-updated", handler as EventListener);
  }, [currentProject?.id, load]);

  const graph = useMemo(() => buildGraph(entries), [entries]);

  const [nodes, setNodes] = useState<Node[]>(graph.nodes);
  const [edges, setEdges] = useState<Edge[]>(graph.edges);

  // Sincroniza quando o grafo muda (reload / projeto trocado).
  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph]);

  if (!currentProject) {
    return (
      <EmptyStateMap message="Selecione um projeto para visualizar o grafo semântico." />
    );
  }

  if (entries.length === 0 && !loading) {
    return (
      <div className="h-full flex flex-col">
        <Header
          stats={graph.stats}
          mode={graph.mode}
          loading={loading}
          onReload={load}
        />
        <EmptyStateMap message="KB vazio para este projeto. Aprove documentos narrativos (Lore, Personagens, Direção de Arte) e Concept Arts para popular o grafo." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        stats={graph.stats}
        mode={graph.mode}
        loading={loading}
        onReload={load}
      />
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) =>
            setNodes((ns) => applyNodeChanges(changes, ns))
          }
          onEdgesChange={(changes) =>
            setEdges((es) => applyEdgeChanges(changes, es))
          }
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color="hsl(var(--border))" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

function Header({
  stats,
  mode,
  loading,
  onReload,
}: {
  stats: GraphData["stats"];
  mode: GraphData["mode"];
  loading: boolean;
  onReload: () => void;
}) {
  return (
    <div className="panel-header gap-3">
      <Network className="h-3 w-3" />
      <span>Grafo Semântico (Concept Arts + Narrativa)</span>
      <Badge variant={mode === "semantic" ? "secondary" : "outline"}>
        {mode === "semantic" ? "embeddings" : "lexical"}
      </Badge>
      <span className="text-[10px] text-muted-foreground">
        {stats.arts} arts • {stats.docs} docs • {stats.edges} arestas
      </span>
      <div className="flex-1" />
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2"
        onClick={onReload}
        disabled={loading}
      >
        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        Recarregar
      </Button>
    </div>
  );
}
