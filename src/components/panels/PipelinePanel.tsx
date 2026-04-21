import { useMemo } from "react";
import { Check, Lock, RefreshCw } from "lucide-react";
import { PHASES, orderedPhases } from "@/types/pipeline";
import { AGENTS } from "@/agents/agents";
import { useProjectStore } from "@/stores/projectStore";
import { cn } from "@/lib/utils";

export function PipelinePanel() {
  const { currentProject, documents, activePhase, setActivePhase } =
    useProjectStore();

  const ordered = useMemo(() => orderedPhases(), []);

  const statusByPhase = useMemo(() => {
    const out: Record<
      number,
      "pending" | "active" | "draft" | "approved" | "needs_revision"
    > = {};
    for (const p of PHASES) {
      const d = documents.find((x) => x.phase_number === p.number);
      if (!d) {
        out[p.number] =
          p.number === activePhase
            ? "active"
            : p.number <= (currentProject?.current_phase ?? 1)
              ? "active"
              : "pending";
        continue;
      }
      if (d.status === "approved") out[p.number] = "approved";
      else if (d.status === "needs_revision") out[p.number] = "needs_revision";
      else out[p.number] = "draft";
    }
    return out;
  }, [documents, activePhase, currentProject?.current_phase]);

  const canEnter = (n: number) => {
    if (!currentProject) return false;
    if (n === 1) return true;
    const phase = PHASES.find((p) => p.number === n);
    if (!phase) return false;
    // Para phases com position (ex.: Expansão Narrativa 14-21), usa
    // dependsOn como gate em vez do number — assim elas destravam assim que
    // Etapa 8 estiver concluída, mesmo com number alto.
    if (phase.position !== undefined) {
      return phase.dependsOn.every((d) => d <= currentProject.current_phase);
    }
    return n <= currentProject.current_phase;
  };

  return (
    <div className="h-full panel-shell flex flex-col">
      <div className="panel-header">
        <span>Pipeline de Etapas</span>
        <span className="text-muted-foreground">
          · {currentProject?.current_phase ?? 1}/{PHASES.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="flex h-full min-w-max items-center px-4 gap-2">
          {ordered.map((p, idx) => {
            const s = statusByPhase[p.number];
            const active = p.number === activePhase;
            const locked = !canEnter(p.number);
            const agent = AGENTS[p.agent];
            const isNarrative = p.group === "narrative_expansion";
            const label =
              p.position !== undefined
                ? `${p.position.toFixed(1)}`
                : String(p.number);
            return (
              <div key={p.number} className="flex items-center gap-1">
                <button
                  disabled={locked}
                  onClick={() => setActivePhase(p.number)}
                  title={isNarrative ? "Expansão Narrativa (Etapa 8.x)" : undefined}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                    active &&
                      "bg-primary/10 border-primary/60 ring-1 ring-primary/40",
                    !active && !locked && "border-border/60 hover:bg-accent/40",
                    locked && "border-border/30 opacity-50 cursor-not-allowed",
                    s === "approved" && "border-emerald-500/40",
                    s === "needs_revision" && "border-amber-500/40",
                    isNarrative && !active && "border-dashed"
                  )}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold"
                    style={{
                      background:
                        s === "approved"
                          ? "rgba(16,185,129,0.15)"
                          : s === "needs_revision"
                            ? "rgba(245,158,11,0.18)"
                            : `${agent.color}22`,
                      color:
                        s === "approved"
                          ? "rgb(52, 211, 153)"
                          : s === "needs_revision"
                            ? "rgb(251, 191, 36)"
                            : agent.color,
                    }}
                  >
                    {s === "approved" ? (
                      <Check className="h-3 w-3" />
                    ) : s === "needs_revision" ? (
                      <RefreshCw className="h-3 w-3" />
                    ) : locked ? (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      label
                    )}
                  </span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="font-medium text-foreground/90">
                      {p.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {agent.displayName.replace(" Agent", "")}
                    </span>
                  </div>
                </button>
                {idx < ordered.length - 1 && (
                  <span className="h-[1px] w-4 bg-border/60" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
