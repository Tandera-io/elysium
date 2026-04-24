// Grafo Semântico V2 — dois tiers com foco em performance.
//
// Tier 1 (main): canon entries dos kinds "principais" (character, boss,
// faction, biome, location). Círculos grandes, label visível, agrupados
// em clusters radiais por kind.
//
// Tier 2 (leaf): concept arts/npcs/itens ligados a um main. Dots 10px
// coloridos por kind, SEM thumbnail. Nome só no hover (tooltip nativo
// do browser — zero overhead React). Aparecem só quando o usuário
// seleciona um main (click) OU ativa o toggle global "mostrar leaves".
//
// Edges (main ↔ main):
//  - Categórico (padrão, instantâneo): shared tags + same act.
//  - Semântico (opcional, Web Worker): coseno sobre vetores agregados
//    a partir das kb_entries da canon entry. Carrega sob demanda.
//
// Edges (main → leaf): deterministic via canon.conceptAssetIds.
//
// Trade-offs vs V1:
//  - ❌ Sem thumbnails in-graph (reduz DOM de ~2065 img tags pra 0).
//  - ❌ O(N²) eliminado; substituído por matches determinísticos + worker
//       opcional que opera em ~100² pares (5000 vs 2.24M).
//  - ✅ Nodes visíveis: ~100-600 (filtráveis), vs 2116 antes.
//  - ✅ ReactFlow.onlyRenderVisibleElements habilitado.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Network, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loadCanon, type Canon, type CanonEntry, type CanonKind } from "@/lib/canon";
import { getIndexSnapshot, type PersistedEntry } from "@/lib/kb";
import { EmptyStateMap } from "./MechanicsMapView";
import type { WorkerInput, WorkerOutput } from "@/lib/semanticGraphWorker";

// ---------- Config ----------

const MAIN_KINDS: CanonKind[] = [
  "character",
  "boss",
  "faction",
  "biome",
  "location",
];

const KIND_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  character: { bg: "hsl(210 70% 55% / 0.20)", border: "hsl(210 70% 60%)", label: "hsl(210 90% 85%)" },
  boss: { bg: "hsl(0 70% 55% / 0.22)", border: "hsl(0 75% 62%)", label: "hsl(0 90% 86%)" },
  faction: { bg: "hsl(45 80% 55% / 0.22)", border: "hsl(45 85% 62%)", label: "hsl(45 90% 85%)" },
  biome: { bg: "hsl(140 55% 50% / 0.20)", border: "hsl(140 55% 58%)", label: "hsl(140 70% 85%)" },
  location: { bg: "hsl(280 60% 60% / 0.22)", border: "hsl(280 65% 68%)", label: "hsl(280 85% 88%)" },
  // Leaves
  concept_art: "hsl(300 50% 60%)" as unknown as { bg: string; border: string; label: string },
  npc: "hsl(30 75% 58%)" as unknown as { bg: string; border: string; label: string },
  creature: "hsl(160 60% 48%)" as unknown as { bg: string; border: string; label: string },
  enemy: "hsl(8 65% 55%)" as unknown as { bg: string; border: string; label: string },
  item: "hsl(55 75% 58%)" as unknown as { bg: string; border: string; label: string },
  weapon: "hsl(20 70% 55%)" as unknown as { bg: string; border: string; label: string },
  armor: "hsl(200 45% 55%)" as unknown as { bg: string; border: string; label: string },
  consumable: "hsl(185 45% 55%)" as unknown as { bg: string; border: string; label: string },
  material: "hsl(28 35% 50%)" as unknown as { bg: string; border: string; label: string },
  poi: "hsl(260 55% 58%)" as unknown as { bg: string; border: string; label: string },
  lore: "hsl(345 55% 58%)" as unknown as { bg: string; border: string; label: string },
};

function leafColor(kind: string): string {
  const entry = KIND_COLORS[kind];
  if (entry && typeof entry === "string") return entry as unknown as string;
  if (entry && typeof entry === "object") return entry.border;
  return "hsl(var(--muted-foreground))";
}

const SEMANTIC_THRESHOLD = 0.55;
const TOP_EDGES_PER_NODE = 5;
const MAX_LEAVES_PER_MAIN = 24; // proteção visual

// ---------- Node types ----------

interface MainData {
  tier: "main";
  kind: CanonKind;
  name: string;
  act?: 1 | 2 | 3;
  leafCount: number;
  selected: boolean;
}

interface LeafData {
  tier: "leaf";
  kind: string;
  name: string;
  parentSlug: string;
}

function MainNodeView({ data }: NodeProps<MainData>) {
  const colors = KIND_COLORS[data.kind] as { bg: string; border: string; label: string };
  const size = data.selected ? 56 : 44;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all",
        data.selected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
      style={{
        width: size,
        height: size,
        background: colors.bg,
        border: `2px solid ${colors.border}`,
      }}
      title={`${data.name} · ${data.kind}${data.act ? ` · Ato ${data.act}` : ""}`}
    >
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      {data.leafCount > 0 && (
        <span
          className="absolute -top-1 -right-1 text-[9px] font-mono rounded-full px-1 bg-background border border-border/60"
          style={{ color: colors.label }}
        >
          {data.leafCount}
        </span>
      )}
      <span
        className="absolute top-full mt-1 whitespace-nowrap text-[10px] font-medium pointer-events-none"
        style={{ color: colors.label }}
      >
        {data.name}
      </span>
    </div>
  );
}

function LeafNodeView({ data }: NodeProps<LeafData>) {
  // title attribute = tooltip nativo do browser. Zero overhead React,
  // zero label render até o usuário hover.
  return (
    <div
      title={data.name}
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: leafColor(data.kind),
        boxShadow: "0 0 0 1px hsl(var(--background))",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = {
  main: MainNodeView,
  leaf: LeafNodeView,
};

// ---------- Graph builder (categórico, determinístico) ----------

interface BuildOptions {
  kindFilter: Set<CanonKind>;
  selectedSlug: string | null;
  showLeaves: boolean;
  search: string;
  semanticEdges?: Array<{ source: string; target: string; sim: number }>;
}

interface GraphStats {
  mainsTotal: number;
  mainsVisible: number;
  leavesVisible: number;
  edges: number;
}

function matchesSearch(e: CanonEntry, q: string): boolean {
  if (!q) return true;
  const hay = `${e.name} ${e.slug} ${e.aliases.join(" ")} ${e.tags.join(" ")}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function sharedTagCount(a: CanonEntry, b: CanonEntry): number {
  if (!a.tags?.length || !b.tags?.length) return 0;
  const set = new Set(a.tags);
  let n = 0;
  for (const t of b.tags) if (set.has(t)) n++;
  return n;
}

function buildGraph(canon: Canon, opts: BuildOptions): { nodes: Node[]; edges: Edge[]; stats: GraphStats } {
  // Mains filtrados.
  const mainsAll = canon.entries
    .filter((e) => e.status !== "retired")
    .filter((e) => MAIN_KINDS.includes(e.kind));
  const mainsVisible = mainsAll
    .filter((e) => opts.kindFilter.has(e.kind))
    .filter((e) => matchesSearch(e, opts.search));

  // ---------- Layout: clusters radiais por kind ----------
  const byKind = new Map<CanonKind, CanonEntry[]>();
  for (const e of mainsVisible) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind)!.push(e);
  }

  const kinds = Array.from(byKind.keys());
  const clusterBigR = 900;
  const nodes: Node[] = [];

  kinds.forEach((kind, kIdx) => {
    const entries = byKind.get(kind)!;
    const clusterAngle = kinds.length > 0 ? (kIdx / kinds.length) * Math.PI * 2 : 0;
    const cx = Math.cos(clusterAngle) * clusterBigR;
    const cy = Math.sin(clusterAngle) * clusterBigR;
    const innerR = Math.max(80, Math.sqrt(entries.length) * 35);

    entries.forEach((e, i) => {
      const a = entries.length > 0 ? (i / entries.length) * Math.PI * 2 : 0;
      const x = cx + Math.cos(a) * innerR;
      const y = cy + Math.sin(a) * innerR;
      nodes.push({
        id: e.slug,
        type: "main",
        position: { x, y },
        data: {
          tier: "main",
          kind: e.kind,
          name: e.name,
          act: e.act,
          leafCount: (e.conceptAssetIds?.length ?? 0),
          selected: opts.selectedSlug === e.slug,
        } satisfies MainData,
      });
    });
  });

  // ---------- Edges categóricas main↔main ----------
  const visibleSet = new Set(mainsVisible.map((e) => e.slug));
  const edges: Edge[] = [];
  // Uso mapa auxiliar: slug → entry, pra pegar tags rapidamente.
  const entryBySlug = new Map(mainsVisible.map((e) => [e.slug, e]));

  for (let i = 0; i < mainsVisible.length; i++) {
    const a = mainsVisible[i];
    for (let j = i + 1; j < mainsVisible.length; j++) {
      const b = mainsVisible[j];
      let strength = 0;
      // Same act + same kind: linha suave
      if (a.act && b.act && a.act === b.act && a.kind === b.kind) strength += 0.3;
      // Shared tags: peso principal
      const shared = sharedTagCount(a, b);
      if (shared > 0) strength += Math.min(0.8, shared * 0.3);
      // Relação explícita em metadata
      if (
        typeof a.metadata?.faction_slug === "string" &&
        (a.metadata.faction_slug === b.slug || a.metadata.faction_slug === b.metadata?.faction_slug)
      ) {
        strength += 0.5;
      }
      if (strength >= 0.3) {
        edges.push({
          id: `cat:${a.slug}__${b.slug}`,
          source: a.slug,
          target: b.slug,
          style: {
            stroke: `hsl(var(--primary) / ${Math.min(0.7, strength)})`,
            strokeWidth: Math.max(1, Math.min(2.5, strength * 2.5)),
          },
        });
      }
    }
  }

  // Top-K categóricas por nó para não saturar.
  // (Uma heurística: ordena por strokeWidth desc e guarda top-K.)
  const byNode = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!byNode.has(e.source)) byNode.set(e.source, []);
    if (!byNode.has(e.target)) byNode.set(e.target, []);
    byNode.get(e.source)!.push(e);
    byNode.get(e.target)!.push(e);
  }
  const keptCat = new Set<string>();
  for (const list of byNode.values()) {
    list.sort((x, y) => ((y.style?.strokeWidth ?? 0) as number) - ((x.style?.strokeWidth ?? 0) as number));
    for (const ed of list.slice(0, TOP_EDGES_PER_NODE)) keptCat.add(ed.id);
  }
  const catEdges = edges.filter((e) => keptCat.has(e.id));

  // ---------- Edges semânticas (opcional, vindas do worker) ----------
  const semEdges: Edge[] = (opts.semanticEdges ?? [])
    .filter((e) => visibleSet.has(e.source) && visibleSet.has(e.target))
    .map((e) => ({
      id: `sem:${e.source}__${e.target}`,
      source: e.source,
      target: e.target,
      animated: false,
      style: {
        stroke: `hsl(var(--accent) / ${Math.min(0.8, e.sim)})`,
        strokeWidth: Math.max(1, Math.min(3, e.sim * 3)),
        strokeDasharray: "4 2",
      },
      label: e.sim.toFixed(2),
      labelStyle: { fill: "hsl(var(--muted-foreground))", fontSize: 9 },
      labelBgStyle: { fill: "hsl(var(--background))", fillOpacity: 0.6 },
    }));

  // ---------- Leaves (sob demanda) ----------
  const leafNodes: Node[] = [];
  const leafEdges: Edge[] = [];
  const targetsForLeaves: CanonEntry[] = (() => {
    if (opts.selectedSlug) {
      const m = mainsVisible.find((e) => e.slug === opts.selectedSlug);
      return m ? [m] : [];
    }
    return opts.showLeaves ? mainsVisible : [];
  })();

  for (const main of targetsForLeaves) {
    const mainNode = nodes.find((n) => n.id === main.slug);
    if (!mainNode) continue;
    const assetIds = (main.conceptAssetIds ?? []).slice(0, MAX_LEAVES_PER_MAIN);
    const r = 48;
    assetIds.forEach((assetId, i) => {
      const a = assetIds.length > 0 ? (i / assetIds.length) * Math.PI * 2 : 0;
      const x = mainNode.position.x + Math.cos(a) * r;
      const y = mainNode.position.y + Math.sin(a) * r;
      leafNodes.push({
        id: `leaf:${main.slug}:${assetId}`,
        type: "leaf",
        position: { x, y },
        data: {
          tier: "leaf",
          kind: "concept_art",
          name: `${main.name} (art)`,
          parentSlug: main.slug,
        } satisfies LeafData,
      });
      leafEdges.push({
        id: `eleaf:${assetId}`,
        source: main.slug,
        target: `leaf:${main.slug}:${assetId}`,
        style: { stroke: "hsl(var(--muted-foreground) / 0.35)", strokeWidth: 1 },
      });
    });
  }

  return {
    nodes: [...nodes, ...leafNodes],
    edges: [...catEdges, ...semEdges, ...leafEdges],
    stats: {
      mainsTotal: mainsAll.length,
      mainsVisible: mainsVisible.length,
      leavesVisible: leafNodes.length,
      edges: catEdges.length + semEdges.length + leafEdges.length,
    },
  };
}

// ---------- Vector aggregation para modo semântico ----------
// Para cada main, encontra kb_entries cujo content menciona o name/slug da
// entry e devolve o vetor médio. Pular mains sem matches.

function aggregateVectorsForMains(
  mains: CanonEntry[],
  kbEntries: PersistedEntry[]
): Map<string, number[]> {
  const byTerm = new Map<string, number[][]>();
  for (const m of mains) byTerm.set(m.slug, []);
  const dim = kbEntries.find((e) => e.vector.length > 0)?.vector.length ?? 0;
  if (dim === 0) return new Map();

  for (const e of kbEntries) {
    if (e.vector.length !== dim) continue;
    const lower = e.content.toLowerCase();
    for (const m of mains) {
      const needle = m.slug.replace(/_/g, " ").toLowerCase();
      if (lower.includes(m.name.toLowerCase()) || lower.includes(needle)) {
        byTerm.get(m.slug)!.push(e.vector);
      }
    }
  }

  const out = new Map<string, number[]>();
  for (const [slug, vecs] of byTerm) {
    if (vecs.length === 0) continue;
    const avg = new Array(dim).fill(0) as number[];
    for (const v of vecs) for (let i = 0; i < dim; i++) avg[i] += v[i];
    for (let i = 0; i < dim; i++) avg[i] /= vecs.length;
    // normaliza para cosine == dot
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += avg[i] * avg[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) avg[i] /= norm;
    out.set(slug, avg);
  }
  return out;
}

// ---------- View ----------

export function SemanticGraphView() {
  const { currentProject } = useProjectStore();
  const [canon, setCanon] = useState<Canon | null>(null);
  const [kbEntries, setKbEntries] = useState<PersistedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<Set<CanonKind>>(new Set(MAIN_KINDS));
  const [showLeaves, setShowLeaves] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [semanticOn, setSemanticOn] = useState(false);
  const [semanticEdges, setSemanticEdges] = useState<
    Array<{ source: string; target: string; sim: number }>
  >([]);
  const [semanticComputing, setSemanticComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // ---------- Load canon + kb ----------

  const reload = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [c, snap] = await Promise.all([
        loadCanon(currentProject.id),
        getIndexSnapshot(currentProject.id).catch(() => ({ entries: [] as PersistedEntry[] })),
      ]);
      setCanon(c);
      setKbEntries(snap.entries);
      setSemanticEdges([]); // invalida cache semântico
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!currentProject) return;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { projectId?: string } | undefined;
      if (!detail?.projectId || detail.projectId === currentProject.id) void reload();
    };
    window.addEventListener("canon-updated", handler as EventListener);
    window.addEventListener("kb-updated", handler as EventListener);
    return () => {
      window.removeEventListener("canon-updated", handler as EventListener);
      window.removeEventListener("kb-updated", handler as EventListener);
    };
  }, [currentProject?.id, reload]);

  // ---------- Compute semantic edges via worker (on demand) ----------

  useEffect(() => {
    if (!semanticOn || !canon || kbEntries.length === 0) return;

    const mainsVisible = canon.entries
      .filter((e) => e.status !== "retired")
      .filter((e) => MAIN_KINDS.includes(e.kind))
      .filter((e) => kindFilter.has(e.kind));

    if (mainsVisible.length < 2) {
      setSemanticEdges([]);
      return;
    }

    const vecMap = aggregateVectorsForMains(mainsVisible, kbEntries);
    const payload = Array.from(vecMap.entries()).map(([id, vector]) => ({ id, vector }));
    if (payload.length < 2) {
      setSemanticEdges([]);
      return;
    }

    setSemanticComputing(true);
    let cancelled = false;
    const w = new Worker(
      new URL("../../../lib/semanticGraphWorker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = w;

    w.onmessage = (ev: MessageEvent<WorkerOutput>) => {
      if (cancelled) return;
      setSemanticEdges(ev.data.edges);
      setSemanticComputing(false);
      w.terminate();
      workerRef.current = null;
    };
    w.onerror = () => {
      if (cancelled) return;
      setSemanticComputing(false);
      w.terminate();
      workerRef.current = null;
    };
    const input: WorkerInput = {
      entries: payload,
      threshold: SEMANTIC_THRESHOLD,
      topK: TOP_EDGES_PER_NODE,
    };
    w.postMessage(input);

    return () => {
      cancelled = true;
      w.terminate();
      workerRef.current = null;
      setSemanticComputing(false);
    };
  }, [semanticOn, canon, kbEntries, kindFilter]);

  // ---------- Build graph ----------

  const graph = useMemo(() => {
    if (!canon) return { nodes: [], edges: [], stats: { mainsTotal: 0, mainsVisible: 0, leavesVisible: 0, edges: 0 } };
    return buildGraph(canon, {
      kindFilter,
      selectedSlug,
      showLeaves,
      search,
      semanticEdges: semanticOn ? semanticEdges : undefined,
    });
  }, [canon, kindFilter, selectedSlug, showLeaves, search, semanticOn, semanticEdges]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === "main") {
      setSelectedSlug((prev) => (prev === node.id ? null : node.id));
    }
  }, []);

  // ---------- Render ----------

  if (!currentProject) {
    return <EmptyStateMap message="Selecione um projeto para visualizar o grafo semântico." />;
  }

  const hasCanon = !!canon && canon.entries.length > 0;

  return (
    <div className="h-full flex flex-col">
      <Header
        stats={graph.stats}
        kindFilter={kindFilter}
        setKindFilter={setKindFilter}
        showLeaves={showLeaves}
        setShowLeaves={setShowLeaves}
        search={search}
        setSearch={setSearch}
        selectedSlug={selectedSlug}
        clearSelection={() => setSelectedSlug(null)}
        semanticOn={semanticOn}
        setSemanticOn={setSemanticOn}
        semanticComputing={semanticComputing}
        loading={loading}
        onReload={reload}
      />
      {!hasCanon && !loading ? (
        <EmptyStateMap message="Canon vazio. Aprove documentos das fases 5/6/9 ou gere concept arts para povoar o canon." />
      ) : (
        <div className="flex-1 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => setNodes((ns) => applyNodeChanges(changes, ns))}
            onEdgesChange={(changes) => setEdges((es) => applyEdgeChanges(changes, es))}
            onNodeClick={onNodeClick}
            fitView
            onlyRenderVisibleElements
            proOptions={{ hideAttribution: true }}
            minZoom={0.15}
            maxZoom={2.5}
          >
            <Background color="hsl(var(--border))" gap={24} />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}

// ---------- Header ----------

function Header(props: {
  stats: GraphStats;
  kindFilter: Set<CanonKind>;
  setKindFilter: (s: Set<CanonKind>) => void;
  showLeaves: boolean;
  setShowLeaves: (b: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
  selectedSlug: string | null;
  clearSelection: () => void;
  semanticOn: boolean;
  setSemanticOn: (b: boolean) => void;
  semanticComputing: boolean;
  loading: boolean;
  onReload: () => void;
}) {
  const {
    stats,
    kindFilter,
    setKindFilter,
    showLeaves,
    setShowLeaves,
    search,
    setSearch,
    selectedSlug,
    clearSelection,
    semanticOn,
    setSemanticOn,
    semanticComputing,
    loading,
    onReload,
  } = props;

  const toggleKind = (k: CanonKind) => {
    const next = new Set(kindFilter);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setKindFilter(next);
  };

  return (
    <div className="border-b border-border/60 px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <Network className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-semibold">Grafo Semântico</span>
        <span className="text-[10px] text-muted-foreground">
          {stats.mainsVisible}/{stats.mainsTotal} mains · {stats.leavesVisible} leaves · {stats.edges} edges
        </span>
        <div className="flex-1" />
        {selectedSlug && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearSelection}>
            <X className="h-3 w-3 mr-1" />
            Desselecionar
          </Button>
        )}
        <Button
          size="sm"
          variant={semanticOn ? "default" : "outline"}
          className="h-7 px-2 text-xs"
          onClick={() => setSemanticOn(!semanticOn)}
          title="Adiciona edges por similaridade coseno (worker)"
        >
          <Sparkles className={cn("h-3 w-3 mr-1", semanticComputing && "animate-pulse")} />
          Semântico {semanticOn ? "ON" : "OFF"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onReload} disabled={loading}>
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search className="h-3 w-3 absolute left-2 top-2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar main..."
            className="pl-7 h-7 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          {MAIN_KINDS.map((k) => {
            const colors = KIND_COLORS[k] as { bg: string; border: string; label: string };
            const active = kindFilter.has(k);
            return (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                className={cn(
                  "text-[10px] px-2 h-6 rounded border transition-opacity",
                  !active && "opacity-40"
                )}
                style={{
                  background: active ? colors.bg : "transparent",
                  borderColor: colors.border,
                  color: colors.label,
                }}
              >
                {k}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showLeaves}
            onChange={(e) => setShowLeaves(e.target.checked)}
            className="h-3 w-3"
          />
          mostrar leaves
        </label>
        <Badge variant="outline" className="text-[9px] h-5">
          click em main para isolar / desselect para ver todos
        </Badge>
      </div>
    </div>
  );
}
