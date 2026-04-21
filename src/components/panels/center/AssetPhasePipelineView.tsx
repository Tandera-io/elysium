// Componente genérico de pipeline de sub-fase. Renderiza o state-machine
// idle → planning → review → generating → done/error reutilizando o mesmo
// ciclo do ConceptArtPipelineView, mas parametrizado por AssetPhaseConfig.
//
// Cada F-phase (F1..F6) importa este componente e passa as factories
// geradas por createAssetPhase() + metadados de apresentação (título, ícone,
// colunas extras a exibir na tabela).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import {
  Sparkles,
  Play,
  StopCircle,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Network,
  ArrowRight,
  Package,
  FolderOpen,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, truncate } from "@/lib/utils";
import type {
  AssetPhasePlan,
  BasePlanItem,
  RunItemState,
  PhasePreReqs,
  createAssetPhase,
} from "@/lib/assetPhase";

type PipelineStatus =
  | "idle"
  | "planning"
  | "review"
  | "generating"
  | "done"
  | "error";

export interface PipelineColumnSpec<T extends BasePlanItem> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  widthClass?: string;
}

export interface PipelineViewProps<T extends BasePlanItem> {
  title: string;
  subtitle: string;
  phase: ReturnType<typeof createAssetPhase<T>>;
  /** Descreve as colunas extras (além de Name/Included) na tabela de review. */
  columns: PipelineColumnSpec<T>[];
  /** Label friendly das Etapas requeridas (para mensagem de bloqueio). */
  prereqLabel?: (phaseNumber: number) => string;
  /** Callback p/ botão "Empacotar sheets" (só aparece se presente). */
  onPackAll?: (projectId: string) => Promise<unknown>;
  /** Callback p/ botão "Gerar recursos Godot" (opcional). */
  onGenerateGodot?: (projectId: string) => Promise<unknown>;
  /** Visual: se true, preview de cards inclui áudio em vez de imagem. */
  previewKind?: "image" | "audio";
}

export function AssetPhasePipelineView<T extends BasePlanItem>(
  props: PipelineViewProps<T>
) {
  const {
    title,
    subtitle,
    phase,
    columns,
    prereqLabel,
    onPackAll,
    onGenerateGodot,
    previewKind = "image",
  } = props;

  const { currentProject } = useProjectStore();
  const openTab = useUiStore((s) => s.openTab);

  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [preReqs, setPreReqs] = useState<PhasePreReqs | null>(null);
  const [plan, setPlan] = useState<AssetPhasePlan<T> | null>(null);
  const [planningText, setPlanningText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [runStates, setRunStates] = useState<Map<string, RunItemState<T>>>(
    new Map()
  );
  const [postBusy, setPostBusy] = useState<"pack" | "godot" | null>(null);
  const [versions, setVersions] = useState<
    Array<{ version: number; filename: string; discarded: boolean; size: number }>
  >([]);
  const [postResult, setPostResult] = useState<{
    kind: "pack" | "godot";
    items: Array<{
      name: string;
      outPng?: string;
      outJson?: string;
      success: boolean;
      frameCount?: number;
      message: string;
      stderr?: string;
    }>;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPreReqs = useCallback(async () => {
    if (!currentProject) return;
    try {
      const pr = await phase.checkPreReqs(currentProject.id);
      setPreReqs(pr);
    } catch {
      /* ignore */
    }
  }, [currentProject?.id, phase]);

  const loadExistingPlan = useCallback(async () => {
    if (!currentProject) return;
    const p = await phase.loadPlan(currentProject.id);
    if (p) setPlan(p);
  }, [currentProject?.id, phase]);

  const refreshVersions = useCallback(async () => {
    if (!currentProject) return;
    try {
      const vs = await phase.listPlanVersions(currentProject.id);
      setVersions(vs);
    } catch {
      /* ignore */
    }
  }, [currentProject?.id, phase]);

  useEffect(() => {
    refreshPreReqs();
    loadExistingPlan();
    refreshVersions();
  }, [refreshPreReqs, loadExistingPlan, refreshVersions]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-save debounce ao editar o plano em review.
  const scheduleSave = useCallback(
    (next: AssetPhasePlan<T>) => {
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      saveDebounce.current = setTimeout(() => {
        phase.savePlan(next).catch(() => {});
      }, 500);
    },
    [phase]
  );

  async function startPlanning() {
    if (!currentProject) return;
    setStatus("planning");
    setError(null);
    setPlanningText("");
    abortRef.current = new AbortController();
    try {
      const p = await phase.plan({
        projectId: currentProject.id,
        onText: (delta) => setPlanningText((prev) => prev + delta),
        signal: abortRef.current.signal,
      });
      setPlan(p);
      setStatus("review");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setStatus("error");
    }
  }

  function updatePlanItems(next: T[]) {
    if (!plan) return;
    const upd = { ...plan, items: next };
    setPlan(upd);
    scheduleSave(upd);
  }

  function updateItem(id: string, patch: Partial<T>) {
    if (!plan) return;
    const next = plan.items.map((it) =>
      it.id === id ? ({ ...it, ...patch } as T) : it
    );
    updatePlanItems(next);
  }

  function removeItem(id: string) {
    if (!plan) return;
    updatePlanItems(plan.items.filter((it) => it.id !== id));
  }

  function toggleAll(included: boolean) {
    if (!plan) return;
    updatePlanItems(plan.items.map((it) => ({ ...it, included })));
  }

  async function startGeneration() {
    if (!plan || !currentProject) return;
    const items = plan.items.filter((i) => i.included);
    if (items.length === 0) {
      setError("Nenhum item selecionado.");
      setStatus("error");
      return;
    }
    setStatus("generating");
    setError(null);
    const initial = new Map<string, RunItemState<T>>();
    for (const it of items) {
      initial.set(it.id, { plan: it, status: "pending", attempt: 0 });
    }
    setRunStates(initial);
    abortRef.current = new AbortController();
    try {
      await phase.run({
        projectId: currentProject.id,
        items,
        onItemUpdate: (state) => {
          setRunStates((prev) => {
            const n = new Map(prev);
            n.set(state.plan.id, state);
            return n;
          });
        },
        signal: abortRef.current.signal,
      });
      setStatus("done");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setStatus("error");
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  async function retryFailed() {
    if (!plan || !currentProject) return;
    const failedIds = new Set(
      Array.from(runStates.values())
        .filter((s) => s.status === "error")
        .map((s) => s.plan.id)
    );
    if (failedIds.size === 0) return;
    const items = plan.items.filter((i) => failedIds.has(i.id));
    setStatus("generating");
    abortRef.current = new AbortController();
    try {
      await phase.run({
        projectId: currentProject.id,
        items,
        onItemUpdate: (state) => {
          setRunStates((prev) => {
            const n = new Map(prev);
            n.set(state.plan.id, state);
            return n;
          });
        },
        signal: abortRef.current.signal,
      });
      setStatus("done");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setStatus("error");
    }
  }

  async function discardPlan() {
    if (
      !confirm(
        "Descartar o plano atual? A IA re-planejará do zero. O plano atual será movido para <phase>.history/ e poderá ser restaurado depois."
      )
    )
      return;
    if (currentProject) {
      await phase.discardPlan(currentProject.id).catch(() => {});
    }
    setPlan(null);
    setPlanningText("");
    setStatus("idle");
  }

  async function runPostStep(
    kind: "pack" | "godot",
    fn: (projectId: string) => Promise<unknown>
  ) {
    if (!currentProject) return;
    setPostBusy(kind);
    setPostResult(null);
    try {
      const raw = await fn(currentProject.id);
      // Normaliza resultados: packers retornam PackResult[]; godot gens
      // também retornam array de { name, success, message }.
      const items = Array.isArray(raw)
        ? (raw as Array<Record<string, unknown>>).map((r) => {
            const name = String(r.name ?? "item");
            const success = r.success !== false;
            const frameCount =
              typeof r.frameCount === "number" ? r.frameCount : undefined;
            const outPng =
              typeof r.outPng === "string" ? (r.outPng as string) : undefined;
            const outJson =
              typeof r.outJson === "string" ? (r.outJson as string) : undefined;
            const tres =
              typeof r.tresPath === "string"
                ? (r.tresPath as string)
                : undefined;
            const message =
              typeof r.message === "string" && r.message
                ? (r.message as string)
                : success
                  ? `OK · ${name}${frameCount ? ` (${frameCount} frames)` : ""}${
                      tres ? ` → ${tres.split(/[\\/]/).pop()}` : ""
                    }`
                  : `FALHOU · ${name}`;
            const stderr =
              typeof r.stderr === "string" ? (r.stderr as string) : undefined;
            return {
              name,
              outPng: outPng ?? tres,
              outJson,
              success,
              frameCount,
              message,
              stderr,
            };
          })
        : [];

      if (items.length === 0) {
        setPostResult({
          kind,
          items: [
            {
              name: "nenhum grupo",
              success: false,
              message:
                kind === "pack"
                  ? "Nenhum asset aprovado para empacotar. Aprove os sprites/tiles antes."
                  : "Nenhum sheet empacotado encontrado. Rode o Empacotar antes.",
            },
          ],
        });
      } else {
        setPostResult({ kind, items });
      }
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      setError(msg);
      setPostResult({
        kind,
        items: [
          {
            name: "erro fatal",
            success: false,
            message: msg,
          },
        ],
      });
    } finally {
      setPostBusy(null);
    }
  }

  async function revealPath(p?: string) {
    if (!p) return;
    try {
      await invoke("reveal_in_explorer", { path: p });
    } catch (e) {
      console.warn("reveal_in_explorer falhou:", e);
    }
  }

  const includedCount = plan?.items.filter((i) => i.included).length ?? 0;
  const stats = useMemo(() => {
    const ss = Array.from(runStates.values());
    return {
      total: ss.length,
      success: ss.filter((s) => s.status === "success").length,
      error: ss.filter((s) => s.status === "error").length,
      running: ss.filter((s) => s.status === "running").length,
      pending: ss.filter((s) => s.status === "pending").length,
    };
  }, [runStates]);

  // ---------- Render ----------

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Selecione um projeto.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </header>

        {error && (
          <div className="rounded border border-destructive/60 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Erro</div>
              <div className="whitespace-pre-wrap">{error}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {status === "idle" && (
          <IdleView
            preReqs={preReqs}
            hasExistingPlan={!!plan}
            currentVersion={plan?.version}
            versions={versions}
            onPlan={startPlanning}
            onResume={() => setStatus("review")}
            onDiscard={discardPlan}
            onRestore={async (filename: string) => {
              if (!currentProject) return;
              const restored = await phase.restorePlanVersion(
                currentProject.id,
                filename
              );
              if (restored) {
                setPlan(restored);
                await refreshVersions();
                setStatus("review");
              }
            }}
            prereqLabel={prereqLabel}
          />
        )}

        {status === "planning" && (
          <PlanningView text={planningText} onCancel={cancel} />
        )}

        {status === "review" && plan && (
          <ReviewView
            plan={plan}
            columns={columns}
            includedCount={includedCount}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onToggleAll={toggleAll}
            onRun={startGeneration}
            onDiscard={discardPlan}
            onRePlan={startPlanning}
          />
        )}

        {(status === "generating" || status === "done") && (
          <GeneratingView
            plan={plan}
            runStates={runStates}
            stats={stats}
            done={status === "done"}
            previewKind={previewKind}
            onCancel={cancel}
            onRetryFailed={retryFailed}
            onOpenGraph={() =>
              openTab({
                id: "panel:semantic-graph",
                kind: "semantic-graph",
                title: "Grafo Semântico",
              })
            }
            onOpenAssets={() =>
              openTab({
                id: "panel:art",
                kind: "asset-preview",
                title: "Assets visuais",
              })
            }
          />
        )}

        {(onPackAll || onGenerateGodot) &&
          (status === "done" ||
            status === "idle" ||
            status === "review" ||
            status === "error") && (
            <div className="rounded border border-border/60 bg-card/40 p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Pós-processamento
              </div>
              <div className="flex flex-wrap gap-2">
                {onPackAll && (
                  <Button
                    size="sm"
                    onClick={() => runPostStep("pack", onPackAll)}
                    disabled={postBusy !== null}
                  >
                    {postBusy === "pack" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Package className="h-3 w-3" />
                    )}
                    Empacotar sheets (Aseprite)
                  </Button>
                )}
                {onGenerateGodot && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runPostStep("godot", onGenerateGodot)}
                    disabled={postBusy !== null}
                  >
                    {postBusy === "godot" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3" />
                    )}
                    Gerar recursos Godot (.tres)
                  </Button>
                )}
              </div>

              {postResult && (
                <div className="rounded border border-border/50 bg-background/50 p-2 space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Resultado (
                    {postResult.kind === "pack"
                      ? "Empacotar sheets"
                      : "Gerar .tres"}
                    ) — {postResult.items.filter((i) => i.success).length}/
                    {postResult.items.length} ok
                  </div>
                  <ul className="text-xs space-y-1 font-mono">
                    {postResult.items.map((it, idx) => (
                      <li
                        key={idx}
                        className={cn(
                          "flex items-start gap-2 p-1 rounded",
                          it.success
                            ? "bg-success/10 text-success-foreground"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {it.success ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">
                            {it.name}
                            {typeof it.frameCount === "number" &&
                              ` · ${it.frameCount} frames`}
                          </div>
                          <div className="break-words whitespace-pre-wrap text-[10px] opacity-90">
                            {it.message}
                          </div>
                          {it.stderr && !it.success && (
                            <div className="break-words whitespace-pre-wrap text-[10px] opacity-70 mt-0.5">
                              {it.stderr.slice(-400)}
                            </div>
                          )}
                        </div>
                        {(it.outPng || it.outJson) && it.success && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1"
                            title="Abrir pasta"
                            onClick={() => revealPath(it.outPng ?? it.outJson)}
                          >
                            <FolderOpen className="h-3 w-3" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
      </div>
    </ScrollArea>
  );
}

// ---------------- Sub-componentes ----------------

function IdleView({
  preReqs,
  hasExistingPlan,
  currentVersion,
  versions,
  onPlan,
  onResume,
  onDiscard,
  onRestore,
  prereqLabel,
}: {
  preReqs: PhasePreReqs | null;
  hasExistingPlan: boolean;
  currentVersion?: number;
  versions: Array<{
    version: number;
    filename: string;
    discarded: boolean;
    size: number;
  }>;
  onPlan: () => void;
  onResume: () => void;
  onDiscard: () => void;
  onRestore: (filename: string) => void | Promise<void>;
  prereqLabel?: (n: number) => string;
}) {
  return (
    <div className="rounded border border-border/60 bg-card/40 p-5 space-y-4">
      <div className="text-sm">
        A IA irá escanear os documentos aprovados, propor a lista completa de
        itens necessários e mostrar para você aprovar antes de gerar.
      </div>

      {preReqs && !preReqs.ready && (
        <div className="rounded border border-warning/60 bg-warning/10 p-3 text-xs space-y-1">
          <div className="font-medium">Pré-requisitos pendentes:</div>
          <ul className="list-disc list-inside">
            {preReqs.missing.map((m) => (
              <li key={m}>
                {prereqLabel
                  ? prereqLabel(Number(m.replace(/\D/g, "")) || 0) || m
                  : m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {versions.length > 0 && (
        <div className="rounded border border-border/50 bg-background/50 p-2 text-[11px] space-y-1">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {currentVersion ? `Plano v${currentVersion}` : "Plano sem versão"}
              <span className="text-muted-foreground ml-1">
                · {versions.length} snapshot(s) no histórico
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {versions.slice(0, 8).map((v) => (
              <Button
                key={v.filename}
                size="sm"
                variant="ghost"
                className="h-6 text-[10px]"
                title={v.filename}
                onClick={() => onRestore(v.filename)}
              >
                <RefreshCw className="h-2.5 w-2.5" />v{v.version}
                {v.discarded && (
                  <span className="ml-0.5 text-destructive">(desc.)</span>
                )}
              </Button>
            ))}
            {versions.length > 8 && (
              <span className="text-muted-foreground self-center ml-1">
                +{versions.length - 8} mais
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {hasExistingPlan && (
          <>
            <Button onClick={onResume} variant="outline">
              Retomar plano existente
            </Button>
            <Button onClick={onDiscard} variant="ghost" size="sm">
              <Trash2 className="h-3 w-3" />
              Descartar
            </Button>
          </>
        )}
        <Button
          onClick={onPlan}
          variant="glow"
          disabled={preReqs ? !preReqs.ready : false}
          className="ml-auto"
        >
          <Sparkles className="h-3 w-3" />
          Planejar com IA
        </Button>
      </div>
    </div>
  );
}

function PlanningView({
  text,
  onCancel,
}: {
  text: string;
  onCancel: () => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [text]);
  return (
    <div className="rounded border border-border/60 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          A IA está planejando…
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <StopCircle className="h-3 w-3" />
          Cancelar
        </Button>
      </div>
      <div className="h-64 rounded bg-background/40 p-3 overflow-auto font-mono text-[11px] whitespace-pre-wrap">
        {text || "Conectando ao agente..."}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function ReviewView<T extends BasePlanItem>({
  plan,
  columns,
  includedCount,
  onUpdateItem,
  onRemoveItem,
  onToggleAll,
  onRun,
  onDiscard,
  onRePlan,
}: {
  plan: AssetPhasePlan<T>;
  columns: PipelineColumnSpec<T>[];
  includedCount: number;
  onUpdateItem: (id: string, patch: Partial<T>) => void;
  onRemoveItem: (id: string) => void;
  onToggleAll: (v: boolean) => void;
  onRun: () => void;
  onDiscard: () => void;
  onRePlan: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {includedCount}/{plan.items.length} selecionados
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => onToggleAll(true)}>
            Marcar todos
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onToggleAll(false)}>
            Desmarcar todos
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            <Trash2 className="h-3 w-3" />
            Descartar
          </Button>
          <Button size="sm" variant="outline" onClick={onRePlan}>
            <RefreshCw className="h-3 w-3" />
            Replanejar
          </Button>
          <Button onClick={onRun} disabled={includedCount === 0} variant="glow">
            <Play className="h-3 w-3" />
            Gerar {includedCount} itens
          </Button>
        </div>
      </div>

      <div className="rounded border border-border/60 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-card/60 text-muted-foreground">
            <tr>
              <th className="p-2 text-left w-6"></th>
              <th className="p-2 text-left">Nome</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("p-2 text-left", c.widthClass)}
                >
                  {c.label}
                </th>
              ))}
              <th className="p-2 text-right w-12"></th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "border-t border-border/40 hover:bg-accent/30",
                  !item.included && "opacity-50"
                )}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={(e) =>
                      onUpdateItem(item.id, {
                        included: e.target.checked,
                      } as Partial<T>)
                    }
                  />
                </td>
                <td className="p-2 font-medium">
                  <input
                    value={item.name}
                    onChange={(e) =>
                      onUpdateItem(item.id, {
                        name: e.target.value,
                      } as Partial<T>)
                    }
                    className="bg-transparent border-b border-border/30 focus:border-primary outline-none w-full"
                  />
                  {item.rationale && (
                    <div className="text-[10px] text-muted-foreground mt-1 italic">
                      {truncate(item.rationale, 120)}
                    </div>
                  )}
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={cn("p-2", c.widthClass)}>
                    {c.render(item)}
                  </td>
                ))}
                <td className="p-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeneratingView<T extends BasePlanItem>({
  plan,
  runStates,
  stats,
  done,
  previewKind,
  onCancel,
  onRetryFailed,
  onOpenGraph,
  onOpenAssets,
}: {
  plan: AssetPhasePlan<T> | null;
  runStates: Map<string, RunItemState<T>>;
  stats: {
    total: number;
    success: number;
    error: number;
    running: number;
    pending: number;
  };
  done: boolean;
  previewKind: "image" | "audio";
  onCancel: () => void;
  onRetryFailed: () => void;
  onOpenGraph: () => void;
  onOpenAssets: () => void;
}) {
  const progress = stats.total
    ? ((stats.success + stats.error) / stats.total) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm flex items-center gap-3">
          {done ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Concluído
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Gerando…
            </Badge>
          )}
          <span className="text-muted-foreground">
            {stats.success} ok · {stats.error} falhas · {stats.running} em curso ·{" "}
            {stats.pending} pendentes
          </span>
        </div>
        <div className="flex gap-2">
          {done && stats.error > 0 && (
            <Button size="sm" variant="outline" onClick={onRetryFailed}>
              <RefreshCw className="h-3 w-3" />
              Retentar falhas ({stats.error})
            </Button>
          )}
          {!done && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <StopCircle className="h-3 w-3" />
              Cancelar
            </Button>
          )}
          {done && (
            <>
              <Button size="sm" variant="outline" onClick={onOpenAssets}>
                Abrir assets
              </Button>
              <Button size="sm" variant="outline" onClick={onOpenGraph}>
                <Network className="h-3 w-3" />
                Grafo Semântico
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="h-2 rounded bg-card overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {plan?.items
          .filter((i) => i.included)
          .map((item) => {
            const st = runStates.get(item.id);
            return (
              <ItemCard
                key={item.id}
                item={item}
                state={st}
                previewKind={previewKind}
              />
            );
          })}
      </div>
    </div>
  );
}

function ItemCard<T extends BasePlanItem>({
  item,
  state,
  previewKind,
}: {
  item: T;
  state: RunItemState<T> | undefined;
  previewKind: "image" | "audio";
}) {
  const statusBadge = () => {
    switch (state?.status) {
      case "running":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            gerando
          </Badge>
        );
      case "success":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Check className="h-3 w-3" />
            ok
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <X className="h-3 w-3" />
            falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">pendente</Badge>;
    }
  };

  const preview = () => {
    if (!state?.asset) return null;
    if (previewKind === "audio") {
      return (
        <audio
          controls
          src={convertFileSrc(state.asset.file_path)}
          className="w-full"
        />
      );
    }
    return (
      <img
        src={convertFileSrc(state.asset.file_path)}
        alt={item.name}
        className="w-full h-32 object-contain rounded bg-background/40"
        style={{ imageRendering: "pixelated" }}
      />
    );
  };

  return (
    <div
      className={cn(
        "rounded border border-border/60 p-2 space-y-2 text-xs",
        state?.status === "error" && "border-destructive/60",
        state?.status === "success" && "border-success/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium truncate flex-1" title={item.name}>
          {item.name}
        </div>
        {statusBadge()}
      </div>
      {state?.asset && preview()}
      {state?.status === "error" && state.error && (
        <div className="text-[10px] text-destructive truncate" title={state.error}>
          {state.error}
        </div>
      )}
    </div>
  );
}
