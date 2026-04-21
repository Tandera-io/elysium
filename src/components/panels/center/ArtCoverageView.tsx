// Aba "Art Coverage" — dashboard visual mostrando, para cada entry do canon,
// quais estágios de produção (F0 concept, F1 sprite, F7 sheet, F8 .tres)
// já têm asset linkado. Permite visualizar buracos e disparar o planner da
// fase correspondente filtrado pelos slugs pendentes.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { loadCanon, type Canon, type CanonEntry, type CanonKind } from "@/lib/canon";

type Stage = "concept" | "sprite" | "sheet" | "tres";
const STAGES: Array<{ key: Stage; label: string; phase: string }> = [
  { key: "concept", label: "F0 concept", phase: "F0" },
  { key: "sprite", label: "F1 sprite", phase: "F1/F2/F4" },
  { key: "sheet", label: "F7 sheet", phase: "F7" },
  { key: "tres", label: "F8 .tres", phase: "F8" },
];

function hasStage(entry: CanonEntry, stage: Stage): boolean {
  switch (stage) {
    case "concept":
      return entry.conceptAssetIds.length > 0;
    case "sprite":
      return entry.spriteAssetIds.length > 0;
    case "sheet":
      return entry.sheetAssetIds.length > 0;
    case "tres":
      return entry.godotTresPaths.length > 0;
  }
}

const VISUAL_KINDS: CanonKind[] = [
  "character",
  "npc",
  "enemy",
  "boss",
  "creature",
  "weapon",
  "armor",
  "item",
  "consumable",
  "biome",
  "location",
];

export function ArtCoverageView() {
  const { currentProject } = useProjectStore();
  const openTab = useUiStore((s) => s.openTab);
  const [canon, setCanon] = useState<Canon | null>(null);
  const [loading, setLoading] = useState(false);

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
    window.addEventListener("kb-updated", onUpdate as EventListener);
    return () => {
      window.removeEventListener("canon-updated", onUpdate as EventListener);
      window.removeEventListener("kb-updated", onUpdate as EventListener);
    };
  }, [refresh]);

  const byKind = useMemo(() => {
    const m = new Map<CanonKind, CanonEntry[]>();
    for (const e of canon?.entries ?? []) {
      if (!VISUAL_KINDS.includes(e.kind)) continue;
      if (!m.has(e.kind)) m.set(e.kind, []);
      m.get(e.kind)!.push(e);
    }
    return m;
  }, [canon]);

  const totals = useMemo(() => {
    const t: Record<Stage, { done: number; total: number }> = {
      concept: { done: 0, total: 0 },
      sprite: { done: 0, total: 0 },
      sheet: { done: 0, total: 0 },
      tres: { done: 0, total: 0 },
    };
    for (const e of canon?.entries ?? []) {
      if (!VISUAL_KINDS.includes(e.kind)) continue;
      for (const s of STAGES) {
        t[s.key].total++;
        if (hasStage(e, s.key)) t[s.key].done++;
      }
    }
    return t;
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
        <header className="space-y-1 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Art Coverage
            </h1>
            <p className="text-xs text-muted-foreground">
              Mostra, para cada entry do canon, quais estágios da pipeline
              visual já têm asset linkado. Clique em "Gerar faltantes" para
              abrir o pipeline correspondente focado nos slugs sem asset.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Recarregar
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STAGES.map((s) => {
            const pct =
              totals[s.key].total === 0
                ? 0
                : (totals[s.key].done / totals[s.key].total) * 100;
            return (
              <div
                key={s.key}
                className="rounded border border-border/60 bg-card/40 p-3 space-y-1"
              >
                <div className="text-xs font-semibold">{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.phase}</div>
                <div className="text-lg font-mono">
                  {totals[s.key].done}/{totals[s.key].total}
                </div>
                <div className="h-1.5 rounded bg-background overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      pct >= 80
                        ? "bg-emerald-500"
                        : pct >= 40
                          ? "bg-yellow-500"
                          : "bg-destructive"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {(!canon || canon.entries.length === 0) && (
          <div className="rounded border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
            Canon vazio. Nada para avaliar cobertura ainda.
          </div>
        )}

        {Array.from(byKind.entries()).map(([kind, list]) => (
          <div
            key={kind}
            className="rounded border border-border/60 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-card/60 text-xs">
              <div className="font-semibold">
                {kind} <span className="text-muted-foreground">({list.length})</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px]"
                onClick={() => {
                  const tabKind =
                    kind === "biome"
                      ? "tilesets-pipeline"
                      : kind === "weapon" || kind === "armor" || kind === "item" || kind === "consumable"
                        ? "vfx-items-pipeline"
                        : "character-sprites-pipeline";
                  openTab({
                    id: `panel:${tabKind}`,
                    kind: tabKind as any,
                    title: `Pipeline · ${kind}`,
                  });
                }}
              >
                Abrir pipeline
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead className="text-muted-foreground text-left">
                <tr>
                  <th className="p-2 w-56">Slug / Nome</th>
                  {STAGES.map((s) => (
                    <th key={s.key} className="p-2 w-20">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const missing = STAGES.filter((s) => !hasStage(e, s.key));
                  return (
                    <tr
                      key={e.id}
                      className={cn(
                        "border-t border-border/40",
                        missing.length === 0 && "bg-emerald-500/5"
                      )}
                    >
                      <td className="p-2">
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {e.slug}
                          {e.act ? ` · A${e.act}` : ""}
                        </div>
                        <div className="font-medium">{e.name}</div>
                      </td>
                      {STAGES.map((s) => (
                        <td key={s.key} className="p-2">
                          {hasStage(e, s.key) ? (
                            <Badge variant="success" className="text-[10px]">
                              ok
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-destructive border-destructive/40 flex items-center gap-0.5"
                            >
                              <AlertCircle className="h-2.5 w-2.5" />
                              falta
                            </Badge>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
