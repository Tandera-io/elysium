import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layers,
  Play,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  StopCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { documentsRepo, assetsRepo } from "@/lib/db";
import {
  type AssetManifest,
  extractManifestFromDocument,
  extractManifestViaClaude,
} from "@/lib/assetManifest";
import {
  runManifestBatch,
  type BatchItem,
} from "@/lib/assetProducer";
import { cn } from "@/lib/utils";

type GateStatus = "ok" | "not_found" | "not_approved";

export function BatchProducerView() {
  const { currentProject } = useProjectStore();
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gates, setGates] = useState<{
    phase9: GateStatus;
    phase11: GateStatus;
    phase12: GateStatus;
  }>({ phase9: "not_found", phase11: "not_found", phase12: "not_found" });
  const [phase12DocId, setPhase12DocId] = useState<string | null>(null);
  const [phase12Content, setPhase12Content] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    if (!currentProject) return;
    setError(null);
    const docs = await documentsRepo.listByProject(currentProject.id);
    const p9 = docs.find((d) => d.phase_number === 9);
    const p11 = docs.find((d) => d.phase_number === 11);
    const p12 = docs.find((d) => d.phase_number === 12);
    setGates({
      phase9: gateOf(p9),
      phase11: gateOf(p11),
      phase12: gateOf(p12),
    });
    setPhase12DocId(p12?.id ?? null);
    setPhase12Content(p12?.content ?? "");
    // Primeiro tenta o metadata.manifest persistido; senão tenta o bloco
    // <manifest> bruto no content.
    if (p12) {
      const meta = await documentsRepo.getManifest(p12.id);
      if (meta && typeof meta === "object" && Array.isArray((meta as any).assets)) {
        setManifest(meta as AssetManifest);
      } else {
        setManifest(extractManifestFromDocument(p12.content));
      }
    } else {
      setManifest(null);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const canRun =
    gates.phase9 === "ok" &&
    gates.phase11 === "ok" &&
    gates.phase12 === "ok" &&
    !!manifest &&
    manifest.assets.length > 0;

  const totals = useMemo(() => {
    const ok = items.filter((i) => i.status === "success").length;
    const err = items.filter((i) => i.status === "error").length;
    const run = items.filter((i) => i.status === "running").length;
    const pend = items.filter((i) => i.status === "pending").length;
    return { ok, err, run, pend, total: items.length };
  }, [items]);

  async function handleExtractViaClaude() {
    if (!currentProject || !phase12DocId || !phase12Content) return;
    setExtracting(true);
    setError(null);
    try {
      const extracted = await extractManifestViaClaude(phase12Content);
      if (!extracted) {
        setError(
          "Claude nao conseguiu extrair um manifest valido do documento da Etapa 12. Edite o documento e inclua um bloco <manifest>...</manifest> manualmente."
        );
      } else {
        await documentsRepo.setManifest(phase12DocId, extracted);
        setManifest(extracted);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setExtracting(false);
    }
  }

  async function handleRun(opts: { onlyFailed?: boolean } = {}) {
    if (!currentProject || !manifest) return;
    setBusy(true);
    setError(null);
    abortRef.current = new AbortController();

    const subsetManifest: AssetManifest = opts.onlyFailed
      ? {
          assets: items
            .filter((i) => i.status === "error")
            .map((i) => i.manifest),
        }
      : manifest;

    // Inicializa items visualmente como pending antes do run.
    if (!opts.onlyFailed) {
      const initial: BatchItem[] = [];
      for (const m of manifest.assets) {
        const n = Math.max(1, m.variations ?? 1);
        for (let v = 0; v < n; v++) {
          initial.push({
            id: n > 1 ? `${m.name}#${v + 1}` : m.name,
            manifest: m,
            variationIndex: v,
            status: "pending",
            attempt: 0,
          });
        }
      }
      setItems(initial);
    }

    try {
      const updateItem = (it: BatchItem) => {
        setItems((prev) => {
          const ix = prev.findIndex(
            (p) => p.id === it.id && p.manifest.name === it.manifest.name
          );
          if (ix < 0) return [...prev, { ...it }];
          const copy = [...prev];
          copy[ix] = { ...it };
          return copy;
        });
      };

      const result = await runManifestBatch({
        projectId: currentProject.id,
        manifest: subsetManifest,
        concurrency: 2,
        maxRetries: 2,
        onItemUpdate: updateItem,
        signal: abortRef.current.signal,
      });

      if (result.cancelled) {
        setError("Producao cancelada pelo usuario.");
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function handleApproveAllOk() {
    const ok = items.filter((i) => i.status === "success" && i.asset);
    for (const it of ok) {
      if (it.asset) {
        try {
          await assetsRepo.setStatus(it.asset.id, "approved");
        } catch (e) {
          console.warn("[batch] aprovar em lote falhou para", it.id, e);
        }
      }
    }
  }

  function cancelRun() {
    abortRef.current?.abort();
  }

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        Nenhum projeto selecionado.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header">
        <Layers className="h-3 w-3" />
        <span>Batch Producer — Etapa 12</span>
        <div className="flex-1" />
        {totals.total > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {totals.ok}/{totals.total} ok · {totals.err} erro · {totals.run} em execucao
          </span>
        )}
      </div>

      <GatesBar gates={gates} onRefresh={load} />

      {!manifest && gates.phase12 === "ok" && (
        <div className="p-4 border-b border-border/60 flex flex-col items-start gap-2 bg-amber-500/5">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span>
              Nenhum bloco &lt;manifest&gt; foi encontrado no documento da Etapa 12.
            </span>
          </div>
          <Button
            variant="glow"
            size="sm"
            className="h-7"
            disabled={extracting || !phase12Content}
            onClick={handleExtractViaClaude}
          >
            <Sparkles className="h-3 w-3" />
            {extracting ? "Extraindo..." : "Extrair manifest via IA"}
          </Button>
        </div>
      )}

      {manifest && (
        <div className="p-3 border-b border-border/60 flex items-center gap-2">
          <Button
            variant="glow"
            size="sm"
            className="h-7"
            disabled={!canRun || busy}
            onClick={() => handleRun()}
          >
            <Play className="h-3 w-3" />
            Produzir tudo ({manifest.assets.length} assets)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={busy || totals.err === 0}
            onClick={() => handleRun({ onlyFailed: true })}
          >
            <RefreshCw className="h-3 w-3" />
            Regerar falhas ({totals.err})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={totals.ok === 0}
            onClick={handleApproveAllOk}
          >
            <Check className="h-3 w-3" />
            Aprovar todos OK
          </Button>
          {busy && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7"
              onClick={cancelRun}
            >
              <StopCircle className="h-3 w-3" />
              Cancelar
            </Button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {expanded ? "Recolher manifest" : "Expandir manifest"}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 border-b border-destructive/40 bg-destructive/10 text-[12px] text-destructive">
          {error}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3">
          {manifest && expanded && (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="text-left py-1 px-2">Nome</th>
                  <th className="text-left py-1 px-2">Tipo</th>
                  <th className="text-left py-1 px-2">Prompt</th>
                  <th className="text-left py-1 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {manifest.assets.flatMap((m) => {
                  const n = Math.max(1, m.variations ?? 1);
                  return Array.from({ length: n }).map((_, v) => {
                    const id = n > 1 ? `${m.name}#${v + 1}` : m.name;
                    const it = items.find(
                      (x) => x.id === id && x.manifest.name === m.name
                    );
                    return (
                      <tr
                        key={`${m.name}-${v}`}
                        className="border-b border-border/30 hover:bg-accent/20"
                      >
                        <td className="py-1.5 px-2 font-mono text-[11px]">
                          {id}
                        </td>
                        <td className="py-1.5 px-2">
                          <KindBadge kind={m.kind} />
                        </td>
                        <td className="py-1.5 px-2 max-w-md">
                          <span
                            className="block truncate text-muted-foreground"
                            title={m.prompt}
                          >
                            {m.prompt}
                          </span>
                        </td>
                        <td className="py-1.5 px-2">
                          <StatusCell item={it} />
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
          {!manifest && gates.phase12 !== "ok" && (
            <p className="text-xs text-muted-foreground text-center py-12">
              A Etapa 12 (Producao de Assets) precisa estar aprovada para o Batch
              Producer extrair o manifest.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function gateOf(d?: { status: string } | undefined): GateStatus {
  if (!d) return "not_found";
  return d.status === "approved" ? "ok" : "not_approved";
}

function GatesBar({
  gates,
  onRefresh,
}: {
  gates: { phase9: GateStatus; phase11: GateStatus; phase12: GateStatus };
  onRefresh: () => void;
}) {
  return (
    <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2 text-[11px]">
      <GateBadge label="Etapa 9 — Art Direction" status={gates.phase9} />
      <GateBadge label="Etapa 11 — Audio Direction" status={gates.phase11} />
      <GateBadge label="Etapa 12 — Asset Producer" status={gates.phase12} />
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[10px]"
        onClick={onRefresh}
      >
        <RefreshCw className="h-3 w-3" />
        Atualizar
      </Button>
    </div>
  );
}

function GateBadge({ label, status }: { label: string; status: GateStatus }) {
  const variant =
    status === "ok"
      ? "success"
      : status === "not_approved"
        ? "warning"
        : "outline";
  const text =
    status === "ok"
      ? "aprovada"
      : status === "not_approved"
        ? "nao aprovada"
        : "ausente";
  return (
    <Badge variant={variant as any}>
      {label}: {text}
    </Badge>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const visual = ["concept_art", "sprite", "tile"].includes(kind);
  return (
    <Badge variant={visual ? "secondary" : "outline"}>
      {kind}
    </Badge>
  );
}

function StatusCell({ item }: { item?: BatchItem }) {
  if (!item) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  const map: Record<BatchItem["status"], { label: string; cls: string }> = {
    pending: { label: "pendente", cls: "text-muted-foreground" },
    running: { label: "gerando...", cls: "text-sky-400 animate-pulse" },
    success: { label: "ok", cls: "text-emerald-400" },
    error: { label: "erro", cls: "text-destructive" },
  };
  const s = map[item.status];
  return (
    <span
      className={cn("text-[11px] flex items-center gap-1", s.cls)}
      title={item.error}
    >
      {s.label}
      {item.attempt > 1 && (
        <span className="text-[9px] opacity-60">tentativa {item.attempt}</span>
      )}
      {item.error && <AlertCircle className="h-3 w-3" />}
    </span>
  );
}
