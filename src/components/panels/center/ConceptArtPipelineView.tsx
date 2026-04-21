// Pipeline end-to-end de Concept Arts:
//   idle      → pré-requisitos + botão "Planejar com IA" (ou "Retomar plano")
//   planning  → stream do Claude compondo o JSON do plano
//   review    → tabela editável de itens, contador, "Gerar selecionados"
//   generating→ grid de cards com status por item, barra de progresso global
//   done      → resumo, CTA para abrir o Grafo Semântico
//
// Cada imagem gerada com auto-aprovação dispara ingestAsset no KB e emite o
// evento global "kb-updated" consumido pelo SemanticGraphView para
// recarregar em tempo real.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  Wand2,
  Sparkles,
  Play,
  StopCircle,
  Check,
  X,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Network,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  checkPlanPreReqs,
  loadPlan,
  planConceptArts,
  savePlan,
  type ConceptArtPlan,
  type ConceptArtPlanItem,
  type ConceptArtSize,
  type PlanPreReqs,
} from "@/lib/conceptPlanner";
import {
  runConceptBatch,
  type RunItemState,
} from "@/lib/conceptRunner";
import { cn, truncate } from "@/lib/utils";

type PipelineStatus =
  | "idle"
  | "planning"
  | "review"
  | "generating"
  | "done"
  | "error";

const CATEGORY_LABEL: Record<ConceptArtPlanItem["category"], string> = {
  character: "Personagem",
  location: "Local",
  scene: "Cena",
  item: "Item",
  ui: "UI / Key Visual",
};

const CATEGORY_COLOR: Record<ConceptArtPlanItem["category"], string> = {
  character: "hsl(var(--primary))",
  location: "#4cc9f0",
  scene: "#b5179e",
  item: "#f4a261",
  ui: "#90e0ef",
};

const SIZES: ConceptArtSize[] = [64, 96, 128, 192, 256];

export function ConceptArtPipelineView() {
  const { currentProject } = useProjectStore();
  const openTab = useUiStore((s) => s.openTab);

  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [preReqs, setPreReqs] = useState<PlanPreReqs | null>(null);
  const [plan, setPlan] = useState<ConceptArtPlan | null>(null);
  const [planningText, setPlanningText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [runStates, setRunStates] = useState<Map<string, RunItemState>>(
    new Map()
  );

  const abortRef = useRef<AbortController | null>(null);
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPreReqs = useCallback(async () => {
    if (!currentProject) return;
    try {
      const pr = await checkPlanPreReqs(currentProject.id);
      setPreReqs(pr);
    } catch {
      // ignora
    }
  }, [currentProject?.id]);

  useEffect(() => {
    refreshPreReqs();
    if (!currentProject) return;
    void loadPlan(currentProject.id).then((p) => {
      if (p) setPlan(p);
    });
  }, [currentProject?.id, refreshPreReqs]);

  useEffect(() => {
    return () => {
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      abortRef.current?.abort();
    };
  }, []);

  function schedulePlanSave(next: ConceptArtPlan) {
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(() => {
      savePlan(next).catch((e) =>
        console.warn("[pipeline] falha ao persistir plano:", e)
      );
    }, 600);
  }

  function updateItem(id: string, patch: Partial<ConceptArtPlanItem>) {
    setPlan((cur) => {
      if (!cur) return cur;
      const next: ConceptArtPlan = {
        ...cur,
        items: cur.items.map((it) =>
          it.id === id ? { ...it, ...patch } : it
        ),
      };
      schedulePlanSave(next);
      return next;
    });
  }

  async function startPlanning() {
    if (!currentProject) return;
    setError(null);
    setPlanningText("");
    setStatus("planning");
    abortRef.current = new AbortController();
    try {
      const p = await planConceptArts({
        projectId: currentProject.id,
        onText: (delta) => setPlanningText((t) => t + delta),
        signal: abortRef.current.signal,
      });
      setPlan(p);
      setStatus("review");
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }

  function cancelPlanning() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus(plan ? "review" : "idle");
  }

  async function startGeneration() {
    if (!currentProject || !plan) return;
    const included = plan.items.filter((it) => it.included);
    if (included.length === 0) return;
    setError(null);
    setRunStates(new Map());
    setStatus("generating");
    abortRef.current = new AbortController();
    try {
      await runConceptBatch({
        projectId: currentProject.id,
        items: included,
        autoApprove: true,
        concurrency: 2,
        onItemUpdate: (state) => {
          setRunStates((prev) => {
            const next = new Map(prev);
            next.set(state.plan.id, state);
            return next;
          });
        },
        signal: abortRef.current.signal,
      });
      setStatus("done");
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function discardPlan() {
    setPlan(null);
    setRunStates(new Map());
    setStatus("idle");
  }

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        Selecione um projeto.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header gap-3">
        <Wand2 className="h-3 w-3" />
        <span>Pipeline de Concept Arts</span>
        <StatusPill status={status} />
        <div className="flex-1" />
        {plan && (
          <span className="text-[10px] text-muted-foreground">
            {plan.items.length} itens no plano
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {status === "idle" && (
          <IdleView
            preReqs={preReqs}
            hasPlan={!!plan}
            onRefreshPreReqs={refreshPreReqs}
            onPlan={startPlanning}
            onResume={() => setStatus("review")}
            onDiscard={discardPlan}
          />
        )}
        {status === "planning" && (
          <PlanningView text={planningText} onCancel={cancelPlanning} />
        )}
        {status === "review" && plan && (
          <ReviewView
            plan={plan}
            onChange={updateItem}
            onToggleAll={(included) => {
              setPlan((cur) => {
                if (!cur) return cur;
                const next = {
                  ...cur,
                  items: cur.items.map((it) => ({ ...it, included })),
                };
                schedulePlanSave(next);
                return next;
              });
            }}
            onRemove={(id) => {
              setPlan((cur) => {
                if (!cur) return cur;
                const next = {
                  ...cur,
                  items: cur.items.filter((it) => it.id !== id),
                };
                schedulePlanSave(next);
                return next;
              });
            }}
            onReplan={startPlanning}
            onDiscard={discardPlan}
            onGenerate={startGeneration}
          />
        )}
        {status === "generating" && plan && (
          <GeneratingView
            items={plan.items.filter((it) => it.included)}
            runStates={runStates}
            onCancel={cancelGeneration}
          />
        )}
        {status === "done" && plan && (
          <DoneView
            items={plan.items.filter((it) => it.included)}
            runStates={runStates}
            onOpenGraph={() =>
              openTab({
                id: "panel:semantic-graph",
                kind: "semantic-graph",
                title: "Grafo Semântico",
              })
            }
            onReplan={() => setStatus("idle")}
          />
        )}
        {status === "error" && (
          <ErrorView
            message={error ?? "Erro desconhecido"}
            onReset={() => setStatus(plan ? "review" : "idle")}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------

function IdleView({
  preReqs,
  hasPlan,
  onRefreshPreReqs,
  onPlan,
  onResume,
  onDiscard,
}: {
  preReqs: PlanPreReqs | null;
  hasPlan: boolean;
  onRefreshPreReqs: () => void;
  onPlan: () => void;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const ready = preReqs?.ready ?? false;
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              Planejar Concept Arts com IA
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O planejador lê <strong>todos os documentos aprovados</strong> do
            projeto (Lore, Personagens, Níveis, Direção de Arte, Storyboard) e
            propõe uma lista estruturada de 8 a 16 concept arts cobrindo
            personagens principais, locais-chave, cenas narrativas, artefatos
            icônicos e key visuals. Você revisa, edita e aprova antes de
            disparar a geração em lote no Pixellab.
          </p>
          <PreReqList preReqs={preReqs} onRefresh={onRefreshPreReqs} />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="glow"
              size="sm"
              onClick={onPlan}
              disabled={!ready}
            >
              <Wand2 className="h-3 w-3" />
              {hasPlan
                ? "Re-planejar com IA"
                : "Planejar Concept Arts com IA"}
            </Button>
            {hasPlan && (
              <>
                <Button variant="outline" size="sm" onClick={onResume}>
                  Retomar plano anterior
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDiscard}
                  className="text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Descartar plano
                </Button>
              </>
            )}
          </div>
          {!ready && preReqs && preReqs.missing.length > 0 && (
            <p className="text-[11px] text-amber-400">
              Aprove antes: {preReqs.missing.join(", ")}.
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function PreReqList({
  preReqs,
  onRefresh,
}: {
  preReqs: PlanPreReqs | null;
  onRefresh: () => void;
}) {
  if (!preReqs) {
    return (
      <div className="text-[11px] text-muted-foreground">
        Verificando pré-requisitos…
      </div>
    );
  }
  const rows: Array<[boolean, string]> = [
    [preReqs.phase9Approved, "Etapa 9 — Direção de Arte (obrigatório, RN007)"],
    [preReqs.phase5Approved, "Etapa 5 — Lore (obrigatório)"],
    [preReqs.phase6Approved, "Etapa 6 — Personagens (obrigatório)"],
    [preReqs.phase10Approved, "Etapa 10 — Storyboard (recomendado)"],
  ];
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Pré-requisitos
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onRefresh}
          title="Recarregar"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      {rows.map(([ok, label]) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          {ok ? (
            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          ) : (
            <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className={ok ? "text-foreground" : "text-muted-foreground"}>
            {label}
          </span>
        </div>
      ))}
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
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b border-border/60">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span className="text-xs font-medium">
          Planejando com Claude… analisando documentos aprovados
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onCancel}>
          <StopCircle className="h-3 w-3" />
          Cancelar
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <pre className="p-4 text-[10px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
          {text || "(aguardando resposta…)"}
        </pre>
      </ScrollArea>
    </div>
  );
}

function ReviewView({
  plan,
  onChange,
  onToggleAll,
  onRemove,
  onReplan,
  onDiscard,
  onGenerate,
}: {
  plan: ConceptArtPlan;
  onChange: (id: string, patch: Partial<ConceptArtPlanItem>) => void;
  onToggleAll: (included: boolean) => void;
  onRemove: (id: string) => void;
  onReplan: () => void;
  onDiscard: () => void;
  onGenerate: () => void;
}) {
  const includedCount = plan.items.filter((it) => it.included).length;
  const allIncluded =
    plan.items.length > 0 && includedCount === plan.items.length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/60">
        <Badge variant="secondary">
          {includedCount} de {plan.items.length} incluídos
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          Criado em {new Date(plan.createdAt).toLocaleString()}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleAll(!allIncluded)}
        >
          {allIncluded ? "Desmarcar todos" : "Marcar todos"}
        </Button>
        <Button variant="outline" size="sm" onClick={onReplan}>
          <RefreshCw className="h-3 w-3" />
          Re-planejar com IA
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={onDiscard}
        >
          <Trash2 className="h-3 w-3" />
          Descartar
        </Button>
        <Button
          variant="glow"
          size="sm"
          disabled={includedCount === 0}
          onClick={onGenerate}
        >
          <Play className="h-3 w-3" />
          Gerar {includedCount} selecionado{includedCount === 1 ? "" : "s"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {plan.items.map((it) => (
            <ReviewRow
              key={it.id}
              item={it}
              onChange={(patch) => onChange(it.id, patch)}
              onRemove={() => onRemove(it.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ReviewRow({
  item,
  onChange,
  onRemove,
}: {
  item: ConceptArtPlanItem;
  onChange: (patch: Partial<ConceptArtPlanItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-2 transition-colors",
        item.included
          ? "border-border/60 bg-card/40"
          : "border-border/40 bg-card/20 opacity-60"
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={item.included}
          onChange={(e) => onChange({ included: e.target.checked })}
          className="h-3.5 w-3.5 accent-primary"
        />
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-border/60 pb-0.5"
        />
        <Badge
          variant="outline"
          style={{
            borderColor: CATEGORY_COLOR[item.category],
            color: CATEGORY_COLOR[item.category],
          }}
        >
          {CATEGORY_LABEL[item.category]}
        </Badge>
        <Badge variant="secondary" className="text-[9px]">
          fase {item.sourcePhase}
        </Badge>
        <select
          value={item.size}
          onChange={(e) =>
            onChange({ size: Number(e.target.value) as ConceptArtSize })
          }
          className="bg-secondary rounded px-2 py-1 text-[11px]"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}x{s}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={onRemove}
          title="Remover item"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Textarea
        rows={2}
        value={item.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        className="text-[11px] font-mono"
      />
      {item.rationale && (
        <p className="text-[10px] text-muted-foreground italic">
          {item.rationale}
        </p>
      )}
    </div>
  );
}

function GeneratingView({
  items,
  runStates,
  onCancel,
}: {
  items: ConceptArtPlanItem[];
  runStates: Map<string, RunItemState>;
  onCancel: () => void;
}) {
  const total = items.length;
  const done = useMemo(
    () =>
      items.filter((it) => {
        const s = runStates.get(it.id);
        return s?.status === "success" || s?.status === "error";
      }).length,
    [items, runStates]
  );
  const success = useMemo(
    () =>
      items.filter((it) => runStates.get(it.id)?.status === "success").length,
    [items, runStates]
  );
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/60 space-y-2">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs font-medium">
            Gerando concept arts… {done}/{total} ({success} ok)
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onCancel}>
            <StopCircle className="h-3 w-3" />
            Cancelar
          </Button>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => (
            <GenerateCard
              key={it.id}
              item={it}
              state={runStates.get(it.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function GenerateCard({
  item,
  state,
}: {
  item: ConceptArtPlanItem;
  state: RunItemState | undefined;
}) {
  const status: RunItemState["status"] = state?.status ?? "pending";
  const asset = state?.asset;
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="bg-black/40 aspect-square flex items-center justify-center overflow-hidden relative">
        {asset && status === "success" ? (
          <img
            src={convertFileSrc(asset.file_path)}
            alt={item.name}
            className="w-full h-full object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : status === "running" ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-[10px]">
              gerando… tentativa {state?.attempt ?? 1}
            </span>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center gap-1 text-destructive p-3 text-center">
            <AlertCircle className="h-6 w-6" />
            <span className="text-[10px] leading-tight">
              {truncate(state?.error ?? "erro", 80)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
            <span className="text-[10px]">aguardando…</span>
          </div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <div className="flex items-center gap-1">
          <StatusBadge status={status} />
          <span className="text-[10px] font-medium truncate">{item.name}</span>
        </div>
        <p
          className="text-[10px] text-muted-foreground leading-tight line-clamp-2"
          title={item.prompt}
        >
          {item.prompt}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RunItemState["status"] }) {
  const map: Record<RunItemState["status"], { label: string; variant: any }> = {
    pending: { label: "aguard.", variant: "outline" },
    running: { label: "gerando", variant: "secondary" },
    success: { label: "ok", variant: "success" },
    error: { label: "erro", variant: "destructive" },
  };
  const s = map[status];
  return (
    <Badge variant={s.variant} className="text-[9px]">
      {s.label}
    </Badge>
  );
}

function DoneView({
  items,
  runStates,
  onOpenGraph,
  onReplan,
}: {
  items: ConceptArtPlanItem[];
  runStates: Map<string, RunItemState>;
  onOpenGraph: () => void;
  onReplan: () => void;
}) {
  const success = items.filter(
    (it) => runStates.get(it.id)?.status === "success"
  ).length;
  const errors = items.filter(
    (it) => runStates.get(it.id)?.status === "error"
  ).length;
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-300">
              Pipeline concluído
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {success} concept arts gerados e aprovados automaticamente.
            {errors > 0 &&
              ` ${errors} falhou${errors === 1 ? "" : "ram"} após ${3} tentativas.`}{" "}
            Cada art aprovado foi ingerido no Knowledge Base — o Grafo
            Semântico já reflete as correlações.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="glow" size="sm" onClick={onOpenGraph}>
              <Network className="h-3 w-3" />
              Abrir Grafo Semântico
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={onReplan}>
              <Wand2 className="h-3 w-3" />
              Novo plano
            </Button>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => (
            <GenerateCard
              key={it.id}
              item={it}
              state={runStates.get(it.id)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function ErrorView({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 max-w-xl space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">
            Erro no pipeline
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
          {message}
        </p>
        <Button variant="outline" size="sm" onClick={onReset}>
          Voltar
        </Button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: PipelineStatus }) {
  const map: Record<
    PipelineStatus,
    { label: string; variant: any }
  > = {
    idle: { label: "pronto", variant: "outline" },
    planning: { label: "planejando", variant: "secondary" },
    review: { label: "revisão", variant: "secondary" },
    generating: { label: "gerando", variant: "secondary" },
    done: { label: "concluído", variant: "success" },
    error: { label: "erro", variant: "destructive" },
  };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
