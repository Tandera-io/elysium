import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Users,
  MapPin,
  Globe,
  Swords,
  User,
  Scroll,
  BookOpen,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { loadCanon, type CanonEntry, type CanonKind } from "@/lib/canon";
import { EmptyStateMap } from "./MechanicsMapView";

interface TreeLeaf {
  id: string;
  label: string;
  sublabel?: string;
  act?: 1 | 2 | 3;
  entry?: CanonEntry; // quando vem do canon
  tags?: string[];
}

interface TreeBranch {
  id: string;
  label: string;
  icon: React.ReactNode;
  kinds: CanonKind[]; // quais kinds do canon popular essa branch
  children: TreeLeaf[];
  subGroups?: { label: string; children: TreeLeaf[] }[]; // agrupamento por ato quando aplicável
}

// ---- Canon-driven tree ----

const BRANCH_DEFS: Array<{
  id: string;
  label: string;
  icon: React.ReactNode;
  kinds: CanonKind[];
  groupByAct?: boolean;
}> = [
  {
    id: "world",
    label: "Mundo & História",
    icon: <Globe className="h-3.5 w-3.5" />,
    kinds: ["lore"],
  },
  {
    id: "places",
    label: "Locais & Biomas",
    icon: <MapPin className="h-3.5 w-3.5" />,
    kinds: ["biome", "location", "poi"],
  },
  {
    id: "factions",
    label: "Facções",
    icon: <Swords className="h-3.5 w-3.5" />,
    kinds: ["faction"],
  },
  {
    id: "characters",
    label: "Personagens & NPCs",
    icon: <Users className="h-3.5 w-3.5" />,
    kinds: ["character", "npc"],
    groupByAct: true,
  },
];

function entryToLeaf(e: CanonEntry): TreeLeaf {
  return {
    id: `canon-${e.id}`,
    label: e.name,
    sublabel: e.description?.slice(0, 120),
    act: e.act,
    entry: e,
    tags: e.tags?.slice(0, 3),
  };
}

function buildCanonTree(entries: CanonEntry[]): TreeBranch[] {
  const branches: TreeBranch[] = [];
  for (const def of BRANCH_DEFS) {
    const relevant = entries
      .filter((e) => def.kinds.includes(e.kind) && e.status !== "retired")
      .map(entryToLeaf)
      .sort((a, b) => (a.act ?? 9) - (b.act ?? 9) || a.label.localeCompare(b.label));

    if (relevant.length === 0) continue;

    const branch: TreeBranch = {
      id: def.id,
      label: def.label,
      icon: def.icon,
      kinds: def.kinds,
      children: relevant,
    };

    if (def.groupByAct && relevant.some((r) => r.act !== undefined)) {
      const byAct = new Map<string, TreeLeaf[]>();
      for (const leaf of relevant) {
        const key = leaf.act ? `Ato ${romanAct(leaf.act)}` : "Sem ato definido";
        if (!byAct.has(key)) byAct.set(key, []);
        byAct.get(key)!.push(leaf);
      }
      branch.subGroups = Array.from(byAct.entries()).map(([label, children]) => ({
        label,
        children,
      }));
    }

    branches.push(branch);
  }
  return branches;
}

function romanAct(act: 1 | 2 | 3): string {
  return act === 1 ? "I" : act === 2 ? "II" : "III";
}

// ---- Markdown fallback (fases 5/6 em prosa numerada) ----

interface MdNode {
  id: string;
  label: string;
  children?: MdNode[];
}

function parseMarkdownFallback(md: string): MdNode[] {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  const tree: MdNode[] = [];
  let currentTop: MdNode | null = null;
  let currentSub: MdNode | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // H2 `## Título` OU "N. Título" (numeração plain) OU linha toda MAIÚSCULA com tamanho razoável
    const h2 = /^##\s+(.+)/.exec(line);
    const numbered = /^(\d+)\.\s+([A-ZÀ-Ÿ].{3,80})$/.exec(line);
    const upper = /^([A-ZÀ-Ÿ][A-ZÀ-Ÿ0-9\s\-—:]{4,60})$/.exec(line);

    const topLabel = h2?.[1] || numbered?.[2] || upper?.[1];
    if (topLabel && topLabel.length < 100) {
      currentTop = {
        id: `top-${tree.length}`,
        label: topLabel.trim(),
        children: [],
      };
      tree.push(currentTop);
      currentSub = null;
      continue;
    }

    // H3 `### Título` OU numeração `N.N Título`
    const h3 = /^###\s+(.+)/.exec(line);
    const subNumbered = /^(\d+\.\d+)\s+(.+)/.exec(line);
    const subLabel = h3?.[1] || subNumbered?.[2];
    if (subLabel && currentTop) {
      currentSub = {
        id: `sub-${currentTop.children!.length}`,
        label: subLabel.trim(),
        children: [],
      };
      currentTop.children!.push(currentSub);
      continue;
    }

    // Bullets `- **Nome**: descrição`
    const bullet = /^\s*[-*]\s+\*\*([^*]+)\*\*[:\-–—]?\s*(.*)/.exec(rawLine);
    if (bullet && (currentSub || currentTop)) {
      const parent = currentSub || currentTop!;
      parent.children = parent.children ?? [];
      parent.children.push({
        id: `leaf-${parent.children.length}`,
        label: bullet[2] ? `${bullet[1].trim()} — ${bullet[2].trim()}` : bullet[1].trim(),
      });
    }
  }

  return tree;
}

// ---- Component ----

export function LoreTreeView() {
  const { currentProject, documents } = useProjectStore();
  const openTab = useUiStore((s) => s.openTab);
  const [entries, setEntries] = useState<CanonEntry[] | null>(null);

  const refresh = useCallback(async () => {
    if (!currentProject) {
      setEntries(null);
      return;
    }
    const canon = await loadCanon(currentProject.id);
    setEntries(canon.entries);
  }, [currentProject?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("canon-updated", onUpdate as EventListener);
    return () => window.removeEventListener("canon-updated", onUpdate as EventListener);
  }, [refresh]);

  const canonTree = useMemo(() => buildCanonTree(entries ?? []), [entries]);

  const fallbackTree = useMemo(() => {
    // Usa fase 14 (worldbuilding_expansion, markdown rico) se existir; senão fase 5/6
    const doc14 = documents.find((d) => d.phase_number === 14 && d.status === "approved");
    const doc5 = documents.find((d) => d.phase_number === 5 && d.status === "approved");
    const source = doc14 ?? doc5;
    return parseMarkdownFallback(source?.content ?? "");
  }, [documents]);

  const hasCanonContent = canonTree.length > 0;

  if (!hasCanonContent && fallbackTree.length === 0) {
    return (
      <EmptyStateMap message="Complete a Etapa 5 (Lore), 6 (Personagens) ou 14 (Worldbuilding Expandido) para visualizar a árvore." />
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-1">
        <header className="flex items-center gap-2 mb-3 px-1">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Árvore de Lore</h2>
          {hasCanonContent && (
            <Badge variant="secondary" className="text-[10px]">
              {entries?.length ?? 0} entries no canon
            </Badge>
          )}
        </header>

        {hasCanonContent ? (
          canonTree.map((branch) => (
            <CanonBranchNode
              key={branch.id}
              branch={branch}
              onOpenEntry={(entry) => {
                openTab({
                  id: `canon-entry:${entry.slug}`,
                  kind: "canon",
                  title: entry.name,
                  payload: { slug: entry.slug, kind: entry.kind },
                });
              }}
            />
          ))
        ) : (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mb-2">
              Fallback · markdown da fase
            </div>
            {fallbackTree.map((n) => (
              <MdTreeNode key={n.id} node={n} level={0} />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function CanonBranchNode({
  branch,
  onOpenEntry,
}: {
  branch: TreeBranch;
  onOpenEntry: (entry: CanonEntry) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = branch.subGroups
    ? branch.subGroups.reduce((sum, g) => sum + g.children.length, 0)
    : branch.children.length;

  return (
    <div className="select-none">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 py-1.5 px-1 rounded hover:bg-accent/30"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-primary">{branch.icon}</span>
        <span className="text-sm font-semibold">{branch.label}</span>
        <Badge variant="outline" className="text-[9px] ml-auto">
          {total}
        </Badge>
      </button>

      {open && (
        <div className="ml-3 border-l border-border/40 pl-2">
          {branch.subGroups
            ? branch.subGroups.map((g) => (
                <SubGroup
                  key={g.label}
                  label={g.label}
                  children={g.children}
                  onOpenEntry={onOpenEntry}
                />
              ))
            : branch.children.map((leaf) => (
                <LeafNode key={leaf.id} leaf={leaf} onOpenEntry={onOpenEntry} />
              ))}
        </div>
      )}
    </div>
  );
}

function SubGroup({
  label,
  children,
  onOpenEntry,
}: {
  label: string;
  children: TreeLeaf[];
  onOpenEntry: (entry: CanonEntry) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
        <span>{label}</span>
        <span className="text-muted-foreground/70">({children.length})</span>
      </button>
      {open && (
        <div className="ml-2">
          {children.map((leaf) => (
            <LeafNode key={leaf.id} leaf={leaf} onOpenEntry={onOpenEntry} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeafNode({
  leaf,
  onOpenEntry,
}: {
  leaf: TreeLeaf;
  onOpenEntry: (entry: CanonEntry) => void;
}) {
  const { entry } = leaf;
  const kind = entry?.kind;
  const Icon = kind === "npc" ? User : kind === "lore" ? Scroll : Globe;

  return (
    <button
      onClick={() => entry && onOpenEntry(entry)}
      className={cn(
        "w-full text-left flex items-start gap-1.5 py-1 px-1 rounded hover:bg-accent/30 group",
        "text-xs"
      )}
    >
      <Icon className="h-3 w-3 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium truncate">{leaf.label}</span>
          {leaf.act && (
            <Badge variant="outline" className="text-[9px] px-1">
              Ato {romanAct(leaf.act)}
            </Badge>
          )}
          {leaf.tags?.map((t) => (
            <Badge key={t} variant="secondary" className="text-[9px] px-1">
              {t}
            </Badge>
          ))}
        </div>
        {leaf.sublabel && (
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
            {leaf.sublabel}
          </div>
        )}
      </div>
    </button>
  );
}

function MdTreeNode({ node, level }: { node: MdNode; level: number }) {
  const [open, setOpen] = useState(level < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <div style={{ paddingLeft: level * 10 }} className="select-none">
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1.5 py-0.5 text-left rounded hover:bg-accent/30 px-1",
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
        <span className={cn("text-xs", level === 0 && "font-semibold text-sm")}>
          {node.label}
        </span>
      </button>
      {open &&
        node.children?.map((c) => <MdTreeNode key={c.id} node={c} level={level + 1} />)}
    </div>
  );
}
