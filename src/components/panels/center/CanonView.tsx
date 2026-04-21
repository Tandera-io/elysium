// Aba "Canon" — mostra o registro único de entidades aprovadas do projeto
// (`canon.json`). Filtrável por kind/act/status; destaca entries com e
// sem assets já gerados (concept/sprite/sheet/tres) via badges.

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, RefreshCw, Search, X, Link2 } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  loadCanon,
  type Canon,
  type CanonEntry,
  type CanonKind,
  type CanonStatus,
} from "@/lib/canon";

const ALL_KINDS: CanonKind[] = [
  "character",
  "npc",
  "enemy",
  "boss",
  "creature",
  "weapon",
  "armor",
  "item",
  "consumable",
  "material",
  "biome",
  "location",
  "faction",
  "quest",
  "poi",
  "recipe",
  "dialogue",
  "lore",
];

export function CanonView() {
  const { currentProject } = useProjectStore();
  const openTab = useUiStore((s) => s.openTab);
  const [canon, setCanon] = useState<Canon | null>(null);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | CanonKind>("all");
  const [actFilter, setActFilter] = useState<"all" | 1 | 2 | 3>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CanonStatus>("all");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const c = await loadCanon(currentProject.id);
      setCanon(c);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("canon-updated", onUpdate as EventListener);
    return () =>
      window.removeEventListener("canon-updated", onUpdate as EventListener);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!canon) return [];
    const q = query.trim().toLowerCase();
    return canon.entries.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (actFilter !== "all" && e.act !== actFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (q) {
        const hay = `${e.slug} ${e.name} ${e.aliases.join(" ")} ${e.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [canon, kindFilter, actFilter, statusFilter, query]);

  const countsByKind = useMemo(() => {
    const m = new Map<CanonKind, number>();
    for (const e of canon?.entries ?? []) {
      m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
    }
    return m;
  }, [canon]);

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Selecione um projeto.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Canon Registry
          </h1>
          <p className="text-xs text-muted-foreground">
            Fonte única de entidades aprovadas do projeto. Todos os planners
            (concept, sprites, tilesets, história) leem daqui para evitar
            duplicação e garantir coesão. Você pode editar/retirar entries
            abrindo `canon.json` no projeto.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="buscar slug/nome/tag..."
              className="pl-7 h-8 w-64"
            />
            {query && (
              <button
                className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setQuery("")}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as any)}
            className="h-8 rounded border border-border/60 bg-background px-2 text-xs"
          >
            <option value="all">Todos os tipos</option>
            {ALL_KINDS.map((k) => (
              <option key={k} value={k}>
                {k} ({countsByKind.get(k) ?? 0})
              </option>
            ))}
          </select>
          <select
            value={actFilter as any}
            onChange={(e) =>
              setActFilter(
                e.target.value === "all"
                  ? "all"
                  : (Number(e.target.value) as 1 | 2 | 3)
              )
            }
            className="h-8 rounded border border-border/60 bg-background px-2 text-xs"
          >
            <option value="all">Todos os atos</option>
            <option value={1}>Ato I</option>
            <option value={2}>Ato II</option>
            <option value={3}>Ato III</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 rounded border border-border/60 bg-background px-2 text-xs"
          >
            <option value="all">Todos os status</option>
            <option value="approved">approved</option>
            <option value="draft">draft</option>
            <option value="retired">retired</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Recarregar
          </Button>
          <div className="flex-1" />
          <div className="text-xs text-muted-foreground">
            {canon ? `${filtered.length} / ${canon.entries.length} entries` : "—"}
          </div>
        </div>

        <div className="rounded border border-border/60 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-card/60 text-muted-foreground text-left">
              <tr>
                <th className="p-2">Slug</th>
                <th className="p-2">Nome</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Ato</th>
                <th className="p-2">Status</th>
                <th className="p-2">Assets</th>
                <th className="p-2">Origem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {canon && canon.entries.length === 0
                      ? "Canon vazio. Aprove um documento com bloco YAML canon_entries (Etapa 8.5 Specialist Writers) ou edite canon.json manualmente."
                      : "Nenhum entry corresponde ao filtro."}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <CanonRow key={e.id} entry={e} onOpenGraph={() =>
                    openTab({
                      id: "panel:semantic-graph",
                      kind: "semantic-graph",
                      title: "Grafo Semântico",
                    })
                  } />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
}

function CanonRow({
  entry,
  onOpenGraph,
}: {
  entry: CanonEntry;
  onOpenGraph: () => void;
}) {
  const assetCount =
    entry.conceptAssetIds.length +
    entry.spriteAssetIds.length +
    entry.sheetAssetIds.length +
    entry.godotTresPaths.length;

  return (
    <tr className="border-t border-border/40 hover:bg-accent/20">
      <td className="p-2 font-mono text-[11px]">{entry.slug}</td>
      <td className="p-2 font-medium">
        {entry.name}
        {entry.aliases.length > 0 && (
          <span className="text-muted-foreground ml-1 text-[10px]">
            ({entry.aliases.slice(0, 2).join(", ")})
          </span>
        )}
        {entry.description && (
          <div className="text-[10px] text-muted-foreground italic mt-0.5 line-clamp-2">
            {entry.description}
          </div>
        )}
      </td>
      <td className="p-2">
        <Badge variant="outline" className="text-[10px]">
          {entry.kind}
        </Badge>
      </td>
      <td className="p-2">{entry.act ? `A${entry.act}` : "—"}</td>
      <td className="p-2">
        <Badge
          variant={
            entry.status === "approved"
              ? "success"
              : entry.status === "retired"
                ? "destructive"
                : "outline"
          }
          className="text-[10px]"
        >
          {entry.status}
        </Badge>
      </td>
      <td className="p-2">
        <div className="flex items-center gap-1 text-[10px]">
          {entry.conceptAssetIds.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px]"
              title={`${entry.conceptAssetIds.length} concept(s)`}
            >
              F0:{entry.conceptAssetIds.length}
            </Badge>
          )}
          {entry.spriteAssetIds.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px]"
              title={`${entry.spriteAssetIds.length} sprite(s)`}
            >
              F1:{entry.spriteAssetIds.length}
            </Badge>
          )}
          {entry.sheetAssetIds.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px]"
              title={`${entry.sheetAssetIds.length} sheet(s)`}
            >
              F7:{entry.sheetAssetIds.length}
            </Badge>
          )}
          {entry.godotTresPaths.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px]"
              title={`${entry.godotTresPaths.length} .tres`}
            >
              F8:{entry.godotTresPaths.length}
            </Badge>
          )}
          {assetCount === 0 && (
            <span className="text-muted-foreground italic">pendente</span>
          )}
          {assetCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1"
              onClick={onOpenGraph}
              title="Ver no Grafo Semântico"
            >
              <Link2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </td>
      <td className="p-2 text-[10px] text-muted-foreground">
        {entry.sourceDocs.length === 0
          ? "manual"
          : entry.sourceDocs
              .slice(0, 2)
              .map((s) => `E${s.phase}`)
              .join(", ")}
      </td>
    </tr>
  );
}
