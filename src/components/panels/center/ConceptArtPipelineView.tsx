// F0 Concept Arts — Pipeline v2.
// Sincroniza plano determinístico derivado do canon.json com a fila asset_jobs,
// permite revisar/filtrar/editar prompts e dispara geração resiliente via OpenAI.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  Sparkles,
  Play,
  Square,
  RefreshCw,
  Search,
  AlertTriangle,
  Check,
  Clock,
  X,
  RotateCw,
  Wand2,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { assetsRepo } from "@/lib/db";
import { loadCanon } from "@/lib/canon";
import { buildPlanFromCanon } from "@/lib/conceptPlannerV2";
import * as jobsRepo from "@/lib/assetJobs";
import { runAssetQueue } from "@/lib/conceptRunnerV2";
import { TIER_COST_USD } from "@/lib/conceptPrompts";
import type {
  AssetJob,
  AssetJobStatus,
  AssetJobTier,
  GeneratedAsset,
  QueueSnapshot,
} from "@/types/domain";
import { invoke } from "@tauri-apps/api/core";

type StatusFilter = AssetJobStatus | "all";

const TIERS: AssetJobTier[] = ["high", "medium", "low"];
const STATUS_ORDER: AssetJobStatus[] = [
  "pending",
  "running",
  "generated",
  "approved",
  "failed",
  "skipped",
];

const STATUS_LABELS: Record<AssetJobStatus, string> = {
  pending: "Pendente",
  running: "Gerando…",
  generated: "Gerado",
  approved: "Aprovado",
  failed: "Falhou",
  skipped: "Pulado",
};

export function ConceptArtPipelineView() {
  const { currentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<AssetJob[]>([]);
  const [assetsById, setAssetsById] = useState<Map<string, GeneratedAsset>>(new Map());
  const [snap, setSnap] = useState<QueueSnapshot | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tierFilter, setTierFilter] = useState<Set<AssetJobTier>>(new Set(TIERS));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [pauseNotice, setPauseNotice] = useState<string | null>(null);
  const [concurrency, setConcurrency] = useState(4);
  const abortRef = useRef<AbortController | null>(null);

  // ---------- Carregamento ----------

  const loadAll = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const list = await jobsRepo.listByProject(currentProject.id);
      setJobs(list);
      const snapshot = await jobsRepo.snapshot(currentProject.id);
      setSnap(snapshot);
      const assetIds = list.map((j) => j.asset_id).filter((x): x is string => !!x);
      if (assetIds.length > 0) {
        const assets = await assetsRepo.listByProject(currentProject.id);
        const byId = new Map(assets.map((a) => [a.id, a]));
        setAssetsById(byId);
      } else {
        setAssetsById(new Map());
      }
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener("canon-updated", handler);
    return () => window.removeEventListener("canon-updated", handler);
  }, [loadAll]);

  // ---------- Sincronização com canon ----------

  const handleSync = useCallback(async () => {
    if (!currentProject || syncing) return;
    setSyncing(true);
    try {
      const [plan, canon] = await Promise.all([
        buildPlanFromCanon(currentProject.id),
        loadCanon(currentProject.id),
      ]);
      const canonAssetsBySlug = new Map<string, string>();
      for (const e of canon.entries) {
        if (e.conceptAssetIds && e.conceptAssetIds.length > 0) {
          canonAssetsBySlug.set(e.slug, e.conceptAssetIds[0]);
        }
      }
      const result = await jobsRepo.syncPlan(currentProject.id, plan.items, canonAssetsBySlug);
      console.log("[F0] sync result", result, "skipped kinds:", plan.skipped);
      await loadAll();
    } finally {
      setSyncing(false);
    }
  }, [currentProject?.id, syncing, loadAll]);

  // ---------- Filtragem ----------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!tierFilter.has(j.tier)) return false;
      if (q) {
        const hay = `${j.canon_slug} ${j.kind} ${j.category} ${j.prompt}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, tierFilter, search]);

  const selectedPending = useMemo(
    () =>
      filtered.filter(
        (j) => selected.has(j.id) && (j.status === "pending" || j.status === "failed")
      ),
    [filtered, selected]
  );

  const estCost = useMemo(() => {
    return selectedPending.reduce((sum, j) => sum + TIER_COST_USD[j.tier], 0);
  }, [selectedPending]);

  // ---------- Execução ----------

  const handleRun = useCallback(async () => {
    if (!currentProject || running) return;
    if (selectedPending.length === 0) return;

    // Marca falhos selecionados como pending pra entrarem na fila
    for (const j of selectedPending) {
      if (j.status === "failed") {
        await jobsRepo.requeue(j.id);
      }
    }

    // Pending não-selecionados ficam skipped temporariamente pra runner só pegar os certos.
    const nonSelectedPending = jobs.filter(
      (j) => j.status === "pending" && !selected.has(j.id)
    );
    for (const j of nonSelectedPending) {
      await jobsRepo.skipJob(j.id);
    }

    setRunning(true);
    setPauseNotice(null);
    abortRef.current = new AbortController();

    try {
      await runAssetQueue({
        projectId: currentProject.id,
        concurrency,
        tierFilter: Array.from(tierFilter),
        signal: abortRef.current.signal,
        onEvent: (e) => {
          if (e.kind === "snapshot") setSnap(e.snapshot);
          if (e.kind === "paused")
            setPauseNotice(
              `Pausado (${e.reason}). Retoma às ${new Date(e.resumeAt).toLocaleTimeString()}.`
            );
          if (e.kind === "resumed") setPauseNotice(null);
          if (e.kind === "job-success" || e.kind === "job-failed") void loadAll();
        },
      });
    } finally {
      for (const j of nonSelectedPending) {
        await jobsRepo.requeue(j.id);
      }
      setRunning(false);
      abortRef.current = null;
      await loadAll();
    }
  }, [currentProject?.id, running, selectedPending, jobs, selected, concurrency, tierFilter, loadAll]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const handleRequeueStale = useCallback(async () => {
    if (!currentProject) return;
    const n = await jobsRepo.requeueStale(currentProject.id, 60);
    console.log(`[F0] requeued ${n} stale jobs`);
    await loadAll();
  }, [currentProject?.id, loadAll]);

  const handleRetryAllFailed = useCallback(async () => {
    if (!currentProject) return;
    const n = await jobsRepo.retryFailed(currentProject.id);
    console.log(`[F0] retry ${n} failed jobs -> pending`);
    await loadAll();
  }, [currentProject?.id, loadAll]);

  // ---------- Ações por job ----------

  const toggleJob = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const next = new Set(selected);
    for (const j of filtered) {
      if (j.status === "pending" || j.status === "failed") next.add(j.id);
    }
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const handleSavePrompt = async () => {
    if (!editing) return;
    const newPrompt = editing.text.trim();
    if (!newPrompt) return;
    const hash = await invoke<string>("compute_prompt_hash", {
      prompt: newPrompt,
      generator: "openai",
      kind: "concept_art",
    });
    await jobsRepo.updatePrompt(editing.id, newPrompt, hash);
    setEditing(null);
    await loadAll();
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Selecione um projeto.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-border/60 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">F0 · Concept Arts</h1>
          {snap && (
            <div className="text-[11px] text-muted-foreground ml-2">
              {snap.total} items · {snap.byStatus.approved} aprovados ·{" "}
              {snap.byStatus.generated} gerados · {snap.byStatus.pending} pendentes
              {snap.byStatus.failed > 0 && (
                <span className="text-destructive"> · {snap.byStatus.failed} falhou</span>
              )}
            </div>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn("h-3 w-3 mr-1", syncing && "animate-spin")} />
            Sincronizar com Canon
          </Button>
          <Button size="sm" variant="outline" onClick={handleRequeueStale}>
            Recuperar órfãos
          </Button>
          {snap && snap.byStatus.failed > 0 && (
            <Button size="sm" variant="outline" onClick={handleRetryAllFailed}>
              <RotateCw className="h-3 w-3 mr-1" />
              Retry todos falhos
            </Button>
          )}
        </div>

        {pauseNotice && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" /> {pauseNotice}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="buscar slug, kind, prompt..."
              className="pl-7 h-8"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 rounded border border-border/60 bg-background px-2 text-xs"
          >
            <option value="all">Todos os status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]} ({snap?.byStatus[s] ?? 0})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTierFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                    return next;
                  });
                }}
                className={cn(
                  "text-[10px] px-2 h-7 rounded border",
                  tierFilter.has(t)
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/40 text-muted-foreground"
                )}
              >
                {t.toUpperCase()} ({snap?.byTier[t] ?? 0})
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <label className="text-[11px] text-muted-foreground flex items-center gap-1">
            workers
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="h-7 rounded border border-border/60 bg-background px-1 text-xs"
              disabled={running}
            >
              {[1, 2, 3, 4, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {filtered.length} visíveis · {selected.size} selecionados
            {selectedPending.length > 0 && (
              <span>
                {" "}
                · <b>{selectedPending.length}</b> para gerar ≈{" "}
                <b>${estCost.toFixed(2)}</b>
              </span>
            )}
          </span>
          <Button size="sm" variant="ghost" onClick={selectAllFiltered}>
            Selecionar todos filtrados (pending/failed)
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Limpar seleção
          </Button>
          <div className="flex-1" />
          {!running ? (
            <Button size="sm" onClick={handleRun} disabled={selectedPending.length === 0}>
              <Play className="h-3 w-3 mr-1" />
              Gerar {selectedPending.length} selecionados
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={handleStop}>
              <Square className="h-3 w-3 mr-1" />
              Parar
            </Button>
          )}
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/40">
          {loading && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Carregando…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum job encontrado. Clique em "Sincronizar com Canon" para gerar a fila
              a partir do canon.json.
            </div>
          )}
          {filtered.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              asset={job.asset_id ? assetsById.get(job.asset_id) : undefined}
              selected={selected.has(job.id)}
              onToggle={() => toggleJob(job.id)}
              onEdit={() => setEditing({ id: job.id, text: job.prompt })}
              onSkip={async () => {
                await jobsRepo.skipJob(job.id);
                await loadAll();
              }}
              onRetry={async () => {
                await jobsRepo.requeue(job.id);
                await loadAll();
              }}
            />
          ))}
        </div>
      </ScrollArea>

      {editing && (
        <EditPromptModal
          text={editing.text}
          onChange={(t) => setEditing({ ...editing, text: t })}
          onSave={handleSavePrompt}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function JobRow({
  job,
  asset,
  selected,
  onToggle,
  onEdit,
  onSkip,
  onRetry,
}: {
  job: AssetJob;
  asset?: GeneratedAsset;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSkip: () => void;
  onRetry: () => void;
}) {
  const canSelect = job.status === "pending" || job.status === "failed";
  return (
    <div className={cn("p-2 flex gap-3 hover:bg-accent/10", selected && "bg-primary/5")}>
      <input
        type="checkbox"
        checked={selected}
        disabled={!canSelect}
        onChange={onToggle}
        className="mt-1"
      />
      {asset ? (
        <img
          src={convertFileSrc(asset.file_path)}
          alt={job.canon_slug}
          className="h-14 w-14 object-cover rounded border border-border/40 shrink-0"
        />
      ) : (
        <div className="h-14 w-14 rounded border border-border/30 border-dashed flex items-center justify-center text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={job.status} />
          <span className="font-mono text-[11px] text-muted-foreground">
            {job.canon_slug}
          </span>
          <Badge variant="outline" className="text-[9px]">
            {job.kind}
          </Badge>
          <Badge
            variant={
              job.tier === "high"
                ? "default"
                : job.tier === "medium"
                  ? "secondary"
                  : "outline"
            }
            className="text-[9px]"
          >
            {job.tier.toUpperCase()}
          </Badge>
          {job.attempts > 0 && (
            <span className="text-[10px] text-muted-foreground">#{job.attempts}</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{job.prompt}</div>
        {job.last_error && (
          <div className="text-[10px] text-destructive truncate">
            <AlertTriangle className="h-2.5 w-2.5 inline mr-1" />
            {job.last_error}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={onEdit} title="Editar prompt">
          <Wand2 className="h-3 w-3" />
        </Button>
        {job.status === "failed" && (
          <Button size="sm" variant="ghost" onClick={onRetry} title="Retry">
            <RotateCw className="h-3 w-3" />
          </Button>
        )}
        {(job.status === "pending" || job.status === "failed") && (
          <Button size="sm" variant="ghost" onClick={onSkip} title="Pular">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: AssetJobStatus }) {
  const base =
    "text-[9px] px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1";
  if (status === "approved")
    return (
      <span className={cn(base, "bg-emerald-500/20 text-emerald-300")}>
        <Check className="h-2.5 w-2.5" /> aprovado
      </span>
    );
  if (status === "generated")
    return (
      <span className={cn(base, "bg-sky-500/20 text-sky-300")}>
        <Check className="h-2.5 w-2.5" /> gerado
      </span>
    );
  if (status === "running")
    return (
      <span className={cn(base, "bg-violet-500/20 text-violet-300")}>
        <RefreshCw className="h-2.5 w-2.5 animate-spin" /> gerando
      </span>
    );
  if (status === "failed")
    return (
      <span className={cn(base, "bg-red-500/20 text-red-300")}>
        <AlertTriangle className="h-2.5 w-2.5" /> falhou
      </span>
    );
  if (status === "skipped")
    return <span className={cn(base, "bg-muted text-muted-foreground")}>pulado</span>;
  return (
    <span className={cn(base, "bg-amber-500/20 text-amber-200")}>
      <Clock className="h-2.5 w-2.5" /> pendente
    </span>
  );
}

function EditPromptModal({
  text,
  onChange,
  onSave,
  onCancel,
}: {
  text: string;
  onChange: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-card border border-border/60 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold">Editar prompt</h3>
        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="text-xs font-mono"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onSave}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
