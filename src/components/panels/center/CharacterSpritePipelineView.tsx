// F1 — Character Sprites v2 (determinístico, espelha F0 concept pipeline).
// Sincroniza plano com canon.json (kinds: character/npc/boss/enemy/creature),
// gera sprites via Pixellab (portrait + skeleton + slice + custom actions) com
// workers paralelos, dedup por canon_slug e retry resiliente.

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
  Users,
  Trash2,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { assetsRepo } from "@/lib/db";
import { loadCanon } from "@/lib/canon";
import { buildSpritePlanFromCanon } from "@/lib/spritePlannerV2";
import * as jobsRepo from "@/lib/assetJobs";
import { runSpriteQueue } from "@/lib/spriteRunnerV2";
import { PIXELLAB_COST_PER_CALL_USD } from "@/lib/spritePrompts";
import { parseSpriteBundle } from "@/lib/spritePlannerV2";
import { resetCharacterSprites } from "@/lib/spriteReset";
import type {
  AssetJob,
  AssetJobStatus,
  AssetJobTier,
  GeneratedAsset,
  QueueSnapshot,
} from "@/types/domain";

type StatusFilter = AssetJobStatus | "all";
type RoleFilter =
  | "all"
  | "character"
  | "npc"
  | "boss"
  | "enemy"
  | "creature"
  | "mount";

const DOMAIN = "character_sprite" as const;
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

export function CharacterSpritePipelineView() {
  const { currentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<AssetJob[]>([]);
  const [assetsById, setAssetsById] = useState<Map<string, GeneratedAsset>>(new Map());
  const [snap, setSnap] = useState<QueueSnapshot | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [tierFilter, setTierFilter] = useState<Set<AssetJobTier>>(new Set(TIERS));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pauseNotice, setPauseNotice] = useState<string | null>(null);
  const [concurrency, setConcurrency] = useState(2);
  const [syncReport, setSyncReport] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadAll = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const list = await jobsRepo.listByProject(currentProject.id, { domain: [DOMAIN] });
      setJobs(list);
      const snapshot = await jobsRepo.snapshot(currentProject.id, DOMAIN);
      setSnap(snapshot);
      const assetIds = list.map((j) => j.asset_id).filter((x): x is string => !!x);
      if (assetIds.length > 0) {
        const assets = await assetsRepo.listByProject(currentProject.id);
        setAssetsById(new Map(assets.map((a) => [a.id, a])));
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

  const handleSync = useCallback(async () => {
    if (!currentProject || syncing) return;
    setSyncing(true);
    setSyncReport(null);
    try {
      const [plan, canon] = await Promise.all([
        buildSpritePlanFromCanon(currentProject.id),
        loadCanon(currentProject.id),
      ]);
      const canonAssetsBySlug = new Map<string, string>();
      for (const e of canon.entries) {
        if (e.spriteAssetIds && e.spriteAssetIds.length > 0) {
          canonAssetsBySlug.set(e.slug, e.spriteAssetIds[0]);
        }
      }
      const result = await jobsRepo.syncPlan(
        currentProject.id,
        plan.items,
        canonAssetsBySlug,
        DOMAIN
      );
      setSyncReport(
        `+${result.inserted} novos · ${result.updated} atualizados · ${result.markedApproved} já aprovados · ${plan.estimatedCalls} Pixellab calls estimadas (~$${plan.estimatedCostUsd.toFixed(2)})`
      );
      await loadAll();
    } catch (e) {
      setSyncReport(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  }, [currentProject?.id, syncing, loadAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!tierFilter.has(j.tier)) return false;
      if (roleFilter !== "all") {
        const bundle = parseSpriteBundle(j.prompt);
        const role = bundle?.role ?? j.category;
        if (role !== roleFilter) return false;
      }
      if (q) {
        const hay = `${j.canon_slug} ${j.kind} ${j.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, tierFilter, roleFilter, search]);

  const selectedPending = useMemo(
    () =>
      filtered.filter(
        (j) => selected.has(j.id) && (j.status === "pending" || j.status === "failed")
      ),
    [filtered, selected]
  );

  const estCalls = useMemo(() => {
    let total = 0;
    for (const j of selectedPending) {
      const bundle = parseSpriteBundle(j.prompt);
      if (bundle) {
        total += 1 + bundle.animations.length + bundle.customActions.length;
      }
    }
    return total;
  }, [selectedPending]);

  const estCost = estCalls * PIXELLAB_COST_PER_CALL_USD;

  const handleRun = useCallback(async () => {
    if (!currentProject || running || selectedPending.length === 0) return;

    // Restaura 'failed' para 'pending' antes do runner poder pegar
    for (const j of selectedPending) {
      if (j.status === "failed") await jobsRepo.requeue(j.id);
    }

    setRunning(true);
    setPauseNotice(null);
    abortRef.current = new AbortController();

    // Lista explícita de ids permitidos — runner só pega esses. Sem skip
    // temporário dos não-selecionados (que antes marcava 'skipped' em massa
    // e deixava órfãos se o app caísse).
    const allowedIds = selectedPending.map((j) => j.id);

    try {
      await runSpriteQueue({
        projectId: currentProject.id,
        concurrency,
        tierFilter: Array.from(tierFilter),
        allowedJobIds: allowedIds,
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
      setRunning(false);
      abortRef.current = null;
      await loadAll();
    }
  }, [
    currentProject?.id,
    running,
    selectedPending,
    concurrency,
    tierFilter,
    loadAll,
  ]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const handleRequeueStale = useCallback(async () => {
    if (!currentProject) return;
    const n = await jobsRepo.requeueStale(currentProject.id, 60, DOMAIN);
    console.log(`[F1] requeued ${n} stale`);
    await loadAll();
  }, [currentProject?.id, loadAll]);

  const handleRetryAllFailed = useCallback(async () => {
    if (!currentProject) return;
    const n = await jobsRepo.retryFailed(currentProject.id, DOMAIN);
    console.log(`[F1] retry ${n} failed -> pending`);
    await loadAll();
  }, [currentProject?.id, loadAll]);

  const handleReset = useCallback(async () => {
    if (!currentProject || resetting || running) return;
    const existing = (snap?.byStatus.generated ?? 0) + (snap?.byStatus.approved ?? 0);
    const confirmed = window.confirm(
      `Deletar TODOS os ${existing} sprites já gerados/aprovados deste projeto?\n\n` +
        `Esta ação é IRREVERSÍVEL:\n` +
        `• Remove PNGs do disco (inclui frames fatiados)\n` +
        `• Apaga rows em generated_assets\n` +
        `• Reseta todos os jobs character_sprite para pending\n` +
        `• Limpa canon.spriteAssetIds\n\n` +
        `Continuar?`
    );
    if (!confirmed) return;

    setResetting(true);
    setSyncReport(null);
    try {
      const result = await resetCharacterSprites(currentProject.id);
      setSyncReport(
        `Reset OK · ${result.assetsDeleted} assets DB + ${result.filesRemoved} PNGs + ${result.framesDirsRemoved} pastas de frames removidos · ${result.jobsReset} jobs resetados · ${result.canonEntriesCleaned} canon entries limpas`
      );
      await loadAll();
    } catch (e) {
      setSyncReport(`Reset falhou: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResetting(false);
    }
  }, [currentProject?.id, resetting, running, snap, loadAll]);

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
          <Users className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">F1 · Character Sprites</h1>
          {snap && (
            <div className="text-[11px] text-muted-foreground ml-2">
              {snap.total} entidades · {snap.byStatus.approved} aprovadas ·{" "}
              {snap.byStatus.generated} geradas · {snap.byStatus.pending} pendentes
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
          {snap && (snap.byStatus.generated + snap.byStatus.approved) > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={resetting || running}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className={cn("h-3 w-3 mr-1", resetting && "animate-pulse")} />
              Reset sprites
            </Button>
          )}
        </div>

        {syncReport && (
          <div className="text-[11px] text-muted-foreground rounded bg-accent/20 px-3 py-1.5">
            <Sparkles className="h-3 w-3 inline mr-1" />
            {syncReport}
          </div>
        )}

        {pauseNotice && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" /> {pauseNotice}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="buscar slug/kind/role..."
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
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-8 rounded border border-border/60 bg-background px-2 text-xs"
          >
            <option value="all">Todos os roles</option>
            <option value="character">character (player)</option>
            <option value="npc">npc</option>
            <option value="boss">boss</option>
            <option value="enemy">enemy</option>
            <option value="creature">creature</option>
          </select>
          <div className="flex items-center gap-1">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setTierFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                    return next;
                  })
                }
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
              {[1, 2, 3, 4, 6].map((n) => (
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
                · <b>{selectedPending.length}</b> entidades · <b>~{estCalls}</b>{" "}
                Pixellab calls ≈ <b>${estCost.toFixed(2)}</b>
              </span>
            )}
          </span>
          <Button size="sm" variant="ghost" onClick={selectAllFiltered}>
            Selecionar filtrados (pending/failed)
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Limpar
          </Button>
          <div className="flex-1" />
          {!running ? (
            <Button size="sm" onClick={handleRun} disabled={selectedPending.length === 0}>
              <Play className="h-3 w-3 mr-1" />
              Gerar {selectedPending.length} sprites
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
              Nenhum job. Clique em "Sincronizar com Canon" para gerar a fila a partir
              dos canon entries (character/npc/boss/enemy/creature).
            </div>
          )}
          {filtered.map((job) => (
            <SpriteRow
              key={job.id}
              job={job}
              asset={job.asset_id ? assetsById.get(job.asset_id) : undefined}
              selected={selected.has(job.id)}
              onToggle={() => toggleJob(job.id)}
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
    </div>
  );
}

function SpriteRow({
  job,
  asset,
  selected,
  onToggle,
  onSkip,
  onRetry,
}: {
  job: AssetJob;
  asset?: GeneratedAsset;
  selected: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onRetry: () => void;
}) {
  const canSelect = job.status === "pending" || job.status === "failed";
  const bundle = useMemo(() => parseSpriteBundle(job.prompt), [job.prompt]);

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
          {bundle && (
            <Badge variant="secondary" className="text-[9px]">
              {bundle.role}/{bundle.size}px
            </Badge>
          )}
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
          {bundle && (
            <span className="text-[10px] text-muted-foreground">
              {bundle.animations.length} anims + {bundle.customActions.length} customs
            </span>
          )}
          {job.attempts > 0 && (
            <span className="text-[10px] text-muted-foreground">#{job.attempts}</span>
          )}
        </div>
        {bundle && (
          <div className="text-[11px] text-muted-foreground truncate">
            {bundle.portraitPrompt.slice(0, 180)}
            {bundle.portraitPrompt.length > 180 ? "…" : ""}
          </div>
        )}
        {job.last_error && (
          <div className="text-[10px] text-destructive truncate">
            <AlertTriangle className="h-2.5 w-2.5 inline mr-1" />
            {job.last_error}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
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
