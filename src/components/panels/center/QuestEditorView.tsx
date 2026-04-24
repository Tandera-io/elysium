import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { ScrollIcon, MessageCircle, Sword, Users, Link2 } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { loadCanon, type CanonEntry } from "@/lib/canon";
import {
  parseDialogueNodes,
  parseQuestList,
  groupQuestsBySection,
  type DialogueNode,
  type QuestSummary,
} from "@/lib/questParser";
import { EmptyStateMap } from "./MechanicsMapView";

// ---- Canon-based enrich: converte entries kind=quest em QuestSummary ----

function canonEntryToQuest(e: CanonEntry): QuestSummary | null {
  if (e.kind !== "quest") return null;
  const raw = e.name;
  const idMatch = /\b(MQ-[IVX]+-\d+|SQ\d+|QC-\d+|FQ\d+)\b/.exec(e.slug) ?? /\b(MQ-[IVX]+-\d+|SQ\d+|QC-\d+|FQ\d+)\b/.exec(raw);
  const id = idMatch ? idMatch[1] : e.slug.slice(0, 12);
  const tags = e.tags ?? [];
  let section: QuestSummary["section"] = "other";
  if (id.startsWith("MQ")) section = "main";
  else if (id.startsWith("QC")) section = "chain";
  else if (id.startsWith("FQ") || tags.some((t) => /fac[cç]ao/i.test(t))) section = "faction";
  else if (id.startsWith("SQ")) section = "side";
  return {
    id,
    title: e.name,
    act: e.act ? (["I", "II", "III"][e.act - 1] as "I" | "II" | "III") : undefined,
    section,
    summary: e.description?.slice(0, 180),
  };
}

export function QuestEditorView() {
  const { currentProject, documents } = useProjectStore();
  const [canonEntries, setCanonEntries] = useState<CanonEntry[] | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentProject) {
      setCanonEntries(null);
      return;
    }
    const canon = await loadCanon(currentProject.id);
    setCanonEntries(canon.entries);
  }, [currentProject?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("canon-updated", onUpdate as EventListener);
    return () => window.removeEventListener("canon-updated", onUpdate as EventListener);
  }, [refresh]);

  // ---- Quests: canon > fase 18 > fase 8 ----
  const quests = useMemo((): QuestSummary[] => {
    const fromCanon = (canonEntries ?? [])
      .map(canonEntryToQuest)
      .filter((q): q is QuestSummary => q !== null);
    if (fromCanon.length > 0) return fromCanon;

    const doc18 = documents.find((d) => d.phase_number === 18 && d.status === "approved");
    const doc8 = documents.find((d) => d.phase_number === 8 && d.status === "approved");
    const source = doc18 ?? doc8;
    return parseQuestList(source?.content ?? "");
  }, [canonEntries, documents]);

  // ---- Dialogues: fase 19 primeiro, fase 8 como fallback ----
  const dialogues = useMemo((): DialogueNode[] => {
    const doc19 = documents.find((d) => d.phase_number === 19 && d.status === "approved");
    const doc8 = documents.find((d) => d.phase_number === 8 && d.status === "approved");
    const source = doc19 ?? doc8;
    return parseDialogueNodes(source?.content ?? "");
  }, [documents]);

  const grouped = useMemo(() => groupQuestsBySection(quests), [quests]);

  // Seleção default: primeira quest
  useEffect(() => {
    if (!selectedQuestId && quests.length > 0) {
      setSelectedQuestId(quests[0].id);
    }
  }, [quests, selectedQuestId]);

  // Filtra nodes relevantes para a quest selecionada (simples match por slug/title em scene)
  const visibleDialogues = useMemo(() => {
    if (!selectedQuestId || dialogues.length === 0) return dialogues.slice(0, 30);
    const q = selectedQuestId.toLowerCase();
    const filtered = dialogues.filter(
      (d) => (d.scene ?? "").toLowerCase().includes(q) || d.text.toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered.slice(0, 30) : dialogues.slice(0, 30);
  }, [dialogues, selectedQuestId]);

  if (quests.length === 0 && dialogues.length === 0) {
    return (
      <EmptyStateMap message="Complete a Etapa 8 (Quests base) ou as expansões 18/19 (Quest Writer + Dialogue Writer) para visualizar." />
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-[35%] min-w-[260px] max-w-[480px] border-r border-border/60 flex flex-col">
        <header className="p-3 border-b border-border/60 space-y-0.5">
          <div className="flex items-center gap-2">
            <ScrollIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Quests</h2>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {quests.length}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {canonEntries && canonEntries.some((e) => e.kind === "quest")
              ? "Fonte: Canon Registry"
              : "Fonte: fase 18 / 8 (markdown)"}
          </p>
        </header>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-3">
            <QuestSection title="Main Quest" icon={<Sword className="h-3 w-3" />} quests={grouped.main} selectedId={selectedQuestId} onSelect={setSelectedQuestId} />
            <QuestSection title="Side Quests" icon={<MessageCircle className="h-3 w-3" />} quests={grouped.side} selectedId={selectedQuestId} onSelect={setSelectedQuestId} />
            <QuestSection title="Chains" icon={<Link2 className="h-3 w-3" />} quests={grouped.chain} selectedId={selectedQuestId} onSelect={setSelectedQuestId} />
            <QuestSection title="Facções" icon={<Users className="h-3 w-3" />} quests={grouped.faction} selectedId={selectedQuestId} onSelect={setSelectedQuestId} />
            {grouped.other.length > 0 && (
              <QuestSection title="Outras" icon={<ScrollIcon className="h-3 w-3" />} quests={grouped.other} selectedId={selectedQuestId} onSelect={setSelectedQuestId} />
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 relative">
        {visibleDialogues.length === 0 ? (
          <EmptyStateMap message="Nenhuma árvore de diálogo encontrada para esta quest. Gere a Fase 19 (Dialogue Writer) para visualizar." />
        ) : (
          <DialogueGraph nodes={visibleDialogues} />
        )}
      </div>
    </div>
  );
}

function QuestSection({
  title,
  icon,
  quests,
  selectedId,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  quests: QuestSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (quests.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 px-1.5 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{title}</span>
        <span className="text-muted-foreground/70">({quests.length})</span>
      </div>
      <div className="space-y-0.5">
        {quests.map((q) => {
          const selected = q.id === selectedId;
          return (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              className={cn(
                "w-full text-left p-1.5 rounded text-xs transition-colors",
                selected
                  ? "bg-primary/15 border border-primary/40"
                  : "hover:bg-accent/30 border border-transparent"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {q.id}
                </span>
                <span className="font-medium truncate flex-1">{q.title}</span>
                {q.act && (
                  <Badge variant="outline" className="text-[9px] px-1 shrink-0">
                    {q.act}
                  </Badge>
                )}
              </div>
              {q.summary && (
                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {q.summary}
                </div>
              )}
              {q.biome && (
                <Badge variant="secondary" className="text-[9px] mt-1">
                  {q.biome}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DialogueGraph({ nodes: dialogues }: { nodes: DialogueNode[] }) {
  // Layout em grid 3 colunas
  const flowNodes: Node[] = useMemo(() => {
    const cols = 3;
    const colW = 300;
    const rowH = 180;
    return dialogues.map((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        id: d.id,
        position: { x: 60 + col * colW, y: 40 + row * rowH },
        data: {
          label: (
            <div className="text-left">
              <div className="text-[10px] font-mono text-primary mb-1">{d.id}</div>
              <div className="text-xs font-medium mb-1 line-clamp-2">
                {d.text.split("\n")[0].slice(0, 90) || d.scene || "(sem texto)"}
              </div>
              {d.choices.length > 0 && (
                <ul className="text-[10px] space-y-0.5 text-muted-foreground">
                  {d.choices.slice(0, 4).map((c, ci) => (
                    <li key={ci} className="truncate">
                      ↳ {c.label.slice(0, 50)}
                    </li>
                  ))}
                  {d.choices.length > 4 && (
                    <li className="text-[9px] opacity-60">+{d.choices.length - 4} mais</li>
                  )}
                </ul>
              )}
              {d.flagsRequired.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {d.flagsRequired.slice(0, 3).map((f) => (
                    <span
                      key={f}
                      className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300"
                    >
                      🔒 {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 8,
          padding: 10,
          width: 260,
          color: "hsl(var(--foreground))",
        },
      };
    });
  }, [dialogues]);

  const flowEdges: Edge[] = useMemo(() => {
    const ids = new Set(dialogues.map((d) => d.id));
    const edges: Edge[] = [];
    for (const d of dialogues) {
      for (const c of d.choices) {
        if (!c.target) continue;
        const targetId = `NODE-${c.target}`;
        if (!ids.has(targetId)) continue;
        edges.push({
          id: `${d.id}→${targetId}-${edges.length}`,
          source: d.id,
          target: targetId,
          animated: true,
          label: c.label.slice(0, 20),
          labelStyle: { fontSize: 9, fill: "hsl(var(--muted-foreground))" },
          style: { stroke: "hsl(var(--primary) / 0.5)" },
        });
      }
    }
    return edges;
  }, [dialogues]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="hsl(var(--border))" gap={20} />
      <Controls />
    </ReactFlow>
  );
}
