import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Users, MapPin, Globe, Swords } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { EmptyStateMap } from "./MechanicsMapView";

interface Node {
  id: string;
  label: string;
  children?: Node[];
  icon?: React.ReactNode;
}

function parseLore(md: string): Node[] {
  if (!md) return [];
  // Captura headers ## e ### para montar uma árvore de 2 níveis.
  const lines = md.split(/\r?\n/);
  const tree: Node[] = [];
  let currentH2: Node | null = null;
  for (const line of lines) {
    const h2 = /^##\s+(.+)/.exec(line);
    const h3 = /^###\s+(.+)/.exec(line);
    const bullet = /^\s*[-*]\s+(.+)/.exec(line);
    if (h2) {
      currentH2 = {
        id: `h2-${tree.length}`,
        label: h2[1].trim(),
        icon: iconFor(h2[1]),
        children: [],
      };
      tree.push(currentH2);
    } else if (h3 && currentH2) {
      currentH2.children!.push({
        id: `h3-${currentH2.children!.length}`,
        label: h3[1].trim(),
      });
    } else if (bullet && currentH2 && currentH2.children!.length > 0) {
      const last = currentH2.children![currentH2.children!.length - 1];
      last.children = last.children ?? [];
      last.children.push({
        id: `b-${last.children.length}`,
        label: bullet[1].trim().replace(/^\*\*([^*]+)\*\*[:\-–]?/, "$1 —"),
      });
    } else if (bullet && currentH2) {
      currentH2.children!.push({
        id: `b-${currentH2.children!.length}`,
        label: bullet[1].trim().replace(/^\*\*([^*]+)\*\*[:\-–]?/, "$1 —"),
      });
    }
  }
  return tree;
}

function iconFor(label: string): React.ReactNode {
  const l = label.toLowerCase();
  if (l.includes("personagem") || l.includes("protagonista"))
    return <Users className="h-3 w-3" />;
  if (l.includes("fac") || l.includes("guild") || l.includes("guerra"))
    return <Swords className="h-3 w-3" />;
  if (l.includes("local") || l.includes("cidade") || l.includes("mundo"))
    return <MapPin className="h-3 w-3" />;
  return <Globe className="h-3 w-3" />;
}

export function LoreTreeView() {
  const { documents } = useProjectStore();
  const tree = useMemo(() => {
    const doc = documents.find(
      (d) => d.phase_number === 5 || d.phase_number === 6
    );
    return parseLore(doc?.content ?? "");
  }, [documents]);

  if (tree.length === 0)
    return (
      <EmptyStateMap message="Complete a Etapa 5 (Lore) ou 6 (Personagens) para visualizar a árvore." />
    );

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {tree.map((n) => (
          <TreeNode key={n.id} node={n} level={0} />
        ))}
      </div>
    </ScrollArea>
  );
}

function TreeNode({ node, level }: { node: Node; level: number }) {
  const [open, setOpen] = useState(level < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <div style={{ paddingLeft: level * 12 }} className="select-none">
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1 text-left rounded hover:bg-accent/30 px-1",
          hasChildren ? "cursor-pointer" : "cursor-default"
        )}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )
        ) : (
          <span className="w-3" />
        )}
        {node.icon && <span className="text-primary">{node.icon}</span>}
        <span className={cn("text-sm", level === 0 && "font-semibold")}>
          {node.label}
        </span>
      </button>
      {open &&
        node.children?.map((c) => (
          <TreeNode key={c.id} node={c} level={level + 1} />
        ))}
    </div>
  );
}
