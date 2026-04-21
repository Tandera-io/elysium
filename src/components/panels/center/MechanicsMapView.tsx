import { useEffect, useMemo, useState } from "react";
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

interface Mechanic {
  name: string;
  dynamic?: string;
  aesthetic?: string;
}

function extractMechanics(md: string): Mechanic[] {
  const result: Mechanic[] = [];
  if (!md) return result;
  // 1) Tabela markdown estilo | Mecânica | Dinâmica | Estética |
  const rows = md.split("\n").filter((l) => l.trim().startsWith("|"));
  for (const row of rows) {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3 && !/^-+$/.test(cells[0]) && !/Mec[aâ]n/i.test(cells[0])) {
      result.push({ name: cells[0], dynamic: cells[1], aesthetic: cells[2] });
    }
  }
  // 2) Bullets "- **Nome**: descrição"
  if (result.length === 0) {
    const re = /[-*]\s+\*\*([^*]+)\*\*[:\-–]?\s*(.*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md))) {
      result.push({ name: m[1].trim(), dynamic: m[2].trim() });
    }
  }
  return result.slice(0, 20);
}

export function MechanicsMapView() {
  const { documents } = useProjectStore();
  const mechs = useMemo(() => {
    const doc = documents.find(
      (d) => d.phase_number === 3 || d.phase_number === 4
    );
    return extractMechanics(doc?.content ?? "");
  }, [documents]);

  const initialNodes: Node[] = useMemo(() => {
    if (mechs.length === 0) return [];
    const radius = 240;
    const center = { x: 400, y: 300 };
    const nodes: Node[] = [];
    mechs.forEach((m, i) => {
      const angle = (i / mechs.length) * Math.PI * 2;
      nodes.push({
        id: `m-${i}`,
        position: {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        },
        data: {
          label: (
            <div className="text-xs">
              <div className="font-semibold">{m.name}</div>
              {m.dynamic && (
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  → {m.dynamic}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 8,
          padding: 8,
          width: 160,
          color: "hsl(var(--foreground))",
        },
      });
    });
    nodes.push({
      id: "core",
      position: { x: center.x - 60, y: center.y - 30 },
      data: {
        label: (
          <div className="text-xs font-semibold text-primary">Core Loop</div>
        ),
      },
      style: {
        background: "hsl(var(--primary) / 0.12)",
        border: "1px solid hsl(var(--primary))",
        borderRadius: 12,
        padding: 10,
        width: 120,
        textAlign: "center",
      },
    });
    return nodes;
  }, [mechs]);

  const initialEdges: Edge[] = useMemo(() => {
    return mechs.map((_, i) => ({
      id: `e-${i}`,
      source: "core",
      target: `m-${i}`,
      animated: true,
      style: { stroke: "hsl(var(--primary) / 0.4)" },
    }));
  }, [mechs]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (mechs.length === 0) {
    return (
      <EmptyStateMap
        message="Complete a Etapa 3 (Core Loop) ou 4 (MDA) para visualizar o mapa de mecânicas."
      />
    );
  }

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

export function EmptyStateMap({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
