// F9 — Scene Builder panel. Fluxo: idle → planning → review → building → done.
// Reusa o padrão dos pipelines de asset (planner Claude + revisão editável +
// execução). A geração aqui é local (não-pixellab), então a fase "building"
// é rápida: serializa .tscn e grava.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Play,
  StopCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  RefreshCw,
  FileCode2,
  GitCommit,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, truncate } from "@/lib/utils";
import {
  buildScenes,
  loadScenePlan,
  planSceneTree,
  saveScenePlan,
  type SceneTreePlan,
} from "@/lib/sceneBuilder";
import type { SceneSpec } from "@/lib/tscnWriter";

type Status =
  | "idle"
  | "planning"
  | "review"
  | "building"
  | "done"
  | "error";

const SCENE_TYPE_LABEL: Record<SceneSpec["type"], string> = {
  player: "Player",
  enemy: "Inimigo",
  boss: "Boss",
  npc: "NPC",
  level: "Nível",
  hud: "HUD",
  world: "World",
  menu: "Menu",
  cutscene: "Cutscene",
};

export function SceneBuilderView() {
  const { currentProject } = useProjectStore();
  const [status, setStatus] = useState<Status>("idle");
  const [plan, setPlan] = useState<SceneTreePlan | null>(null);
  const [planningText, setPlanningText] = useState("");
  const [buildResults, setBuildResults] = useState<
    { name: string; success: boolean; error?: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [autoCommit, setAutoCommit] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const loadExisting = useCallback(async () => {
    if (!currentProject) return;
    const p = await loadScenePlan(currentProject.id);
    if (p) setPlan(p);
  }, [currentProject?.id]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function startPlanning() {
    if (!currentProject) return;
    setStatus("planning");
    setError(null);
    setPlanningText("");
    abortRef.current = new AbortController();
    try {
      const p = await planSceneTree({
        projectId: currentProject.id,
        onText: (d) => setPlanningText((prev) => prev + d),
        signal: abortRef.current.signal,
      });
      setPlan(p);
      setStatus("review");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setStatus("error");
    }
  }

  function updateScene(index: number, patch: Partial<SceneSpec>) {
    if (!plan) return;
    const next = {
      ...plan,
      scenes: plan.scenes.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    };
    setPlan(next);
    saveScenePlan(next).catch(() => {});
  }

  function removeScene(index: number) {
    if (!plan) return;
    const next = { ...plan, scenes: plan.scenes.filter((_, i) => i !== index) };
    setPlan(next);
    saveScenePlan(next).catch(() => {});
  }

  async function startBuild() {
    if (!plan) return;
    setStatus("building");
    setError(null);
    setBuildResults([]);
    try {
      const results = await buildScenes(plan, { autoCommit });
      setBuildResults(
        results.map((r) => ({
          name: r.scene.name,
          success: r.success,
          error: r.error,
        }))
      );
      setStatus("done");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setStatus("error");
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  async function discard() {
    if (!confirm("Descartar plano atual de cenas?")) return;
    setPlan(null);
    setStatus("idle");
  }

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
        <header>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-primary" />
            Scene Builder — Fase 2.5
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Claude analisa personagens, níveis, quests e recursos Godot
            disponíveis para propor a árvore completa de cenas. Você edita,
            confirma, e o sistema gera os arquivos <code>.tscn</code>.
          </p>
        </header>

        {error && (
          <div className="rounded border border-destructive/60 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 whitespace-pre-wrap">{error}</div>
            <Button size="sm" variant="ghost" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {status === "idle" && (
          <div className="rounded border border-border/60 bg-card/40 p-5 space-y-4">
            <div className="text-sm">
              A IA vai escanear os documentos + KB + recursos .tres e propor a
              árvore completa de cenas Godot.
            </div>
            <div className="flex gap-2">
              {plan && (
                <>
                  <Button variant="outline" onClick={() => setStatus("review")}>
                    Retomar plano existente ({plan.scenes.length} cenas)
                  </Button>
                  <Button variant="ghost" size="sm" onClick={discard}>
                    <Trash2 className="h-3 w-3" />
                    Descartar
                  </Button>
                </>
              )}
              <Button onClick={startPlanning} variant="glow" className="ml-auto">
                <Sparkles className="h-3 w-3" />
                Planejar árvore de cenas
              </Button>
            </div>
          </div>
        )}

        {status === "planning" && (
          <div className="rounded border border-border/60 bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                A IA está planejando a árvore…
              </div>
              <Button size="sm" variant="ghost" onClick={cancel}>
                <StopCircle className="h-3 w-3" />
                Cancelar
              </Button>
            </div>
            <div className="h-64 rounded bg-background/40 p-3 overflow-auto font-mono text-[11px] whitespace-pre-wrap">
              {planningText || "Conectando…"}
            </div>
          </div>
        )}

        {status === "review" && plan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="outline">{plan.scenes.length} cenas</Badge>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={autoCommit}
                    onChange={(e) => setAutoCommit(e.target.checked)}
                  />
                  Auto git commit
                </label>
                <Button size="sm" variant="ghost" onClick={discard}>
                  <Trash2 className="h-3 w-3" /> Descartar
                </Button>
                <Button size="sm" variant="outline" onClick={startPlanning}>
                  <RefreshCw className="h-3 w-3" /> Replanejar
                </Button>
                <Button onClick={startBuild} variant="glow">
                  <Play className="h-3 w-3" /> Gerar cenas
                </Button>
              </div>
            </div>

            <div className="rounded border border-border/60 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-card/60 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Path (.tscn)</th>
                    <th className="p-2 text-left">Sprite/Tileset</th>
                    <th className="p-2 text-left">Script</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {plan.scenes.map((s, i) => (
                    <tr key={i} className="border-t border-border/40 hover:bg-accent/20">
                      <td className="p-2 font-medium">
                        <input
                          value={s.name}
                          onChange={(e) =>
                            updateScene(i, { name: e.target.value })
                          }
                          className="bg-transparent border-b border-border/30 focus:border-primary outline-none w-full"
                        />
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">
                          {SCENE_TYPE_LABEL[s.type]}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-[10px]">
                        <input
                          value={s.path}
                          onChange={(e) =>
                            updateScene(i, { path: e.target.value })
                          }
                          className="bg-transparent border-b border-border/30 focus:border-primary outline-none w-full"
                        />
                      </td>
                      <td className="p-2 text-[10px] text-muted-foreground">
                        {truncate(
                          s.sprite_ref ?? s.tileset_ref ?? s.atlas_ref ?? "—",
                          40
                        )}
                      </td>
                      <td className="p-2 text-[10px] text-muted-foreground">
                        {truncate(s.script ?? "—", 30)}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeScene(i)}
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
        )}

        {status === "building" && (
          <div className="rounded border border-border/60 bg-card/40 p-4 flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando arquivos .tscn…
          </div>
        )}

        {status === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Cenas geradas
              </Badge>
              <span className="text-xs text-muted-foreground">
                {buildResults.filter((r) => r.success).length} ok ·{" "}
                {buildResults.filter((r) => !r.success).length} falhas
              </span>
              {autoCommit && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <GitCommit className="h-3 w-3" /> commit automático
                </Badge>
              )}
            </div>
            <div className="rounded border border-border/60 divide-y divide-border/40 text-xs">
              {buildResults.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 p-2",
                    !r.success && "bg-destructive/5"
                  )}
                >
                  {r.success ? (
                    <CheckCircle2 className="h-3 w-3 text-success" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  )}
                  <span className="font-medium">{r.name}</span>
                  {r.error && (
                    <span className="text-destructive text-[10px] truncate flex-1">
                      {r.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={() => setStatus("review")}>
                Voltar ao plano
              </Button>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
