import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { useProjectStore } from "@/stores/projectStore";
import { EmptyStateMap } from "./MechanicsMapView";

interface DialogueNode {
  id: string;
  text: string;
  choices: string[];
}

function parseDialogues(md: string): DialogueNode[] {
  if (!md) return [];
  const nodes: DialogueNode[] = [];
  const lines = md.split("\n");
  let current: DialogueNode | null = null;
  for (const line of lines) {
    const nodeMatch = /^###\s+(.+)/.exec(line);
    const choiceMatch = /^\s*[-*]\s+(.+)/.exec(line);
    if (nodeMatch) {
      if (current) nodes.push(current);
      current = { id: `n-${nodes.length}`, text: nodeMatch[1], choices: [] };
    } else if (choiceMatch && current) {
      current.choices.push(choiceMatch[1]);
    }
  }
  if (current) nodes.push(current);
  return nodes.slice(0, 15);
}

export function QuestEditorView() {
  const { documents } = useProjectStore();
  const dialogues = useMemo(() => {
    const doc = documents.find((d) => d.phase_number === 8);
    return parseDialogues(doc?.content ?? "");
  }, [documents]);

  const initialNodes: Node[] = useMemo(() => {
    return dialogues.map((n, i) => ({
      id: n.id,
      position: { x: 100 + i * 260, y: 100 + (i % 2) * 220 },
      data: {
        label: (
          <div className="text-xs">
            <div className="font-semibold mb-1">{n.text}</div>
            <ul className="text-[10px] space-y-0.5 text-muted-foreground text-left">
              {n.choices.slice(0, 4).map((c, ci) => (
                <li key={ci}>↳ {c}</li>
              ))}
            </ul>
          </div>
        ),
      },
      style: {
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 8,
        padding: 10,
        width: 220,
        color: "hsl(var(--foreground))",
      },
    }));
  }, [dialogues]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 1; i < dialogues.length; i++) {
      edges.push({
        id: `e-${i}`,
        source: dialogues[i - 1].id,
        target: dialogues[i].id,
        animated: true,
        style: { stroke: "hsl(var(--primary) / 0.4)" },
      });
    }
    return edges;
  }, [dialogues]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (dialogues.length === 0)
    return (
      <EmptyStateMap message="Complete a Etapa 8 (Quests & Diálogos) para visualizar a árvore de conversação." />
    );

  return (
    <div className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border))" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
