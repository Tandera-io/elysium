import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  Code2,
  FolderTree,
  Hammer,
  Sparkles,
  PlayCircle,
  Rocket,
  Undo2,
  Send,
  Bot,
  StopCircle,
  ChevronRight,
  FileCode2,
  Download,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Layers,
  Check,
  Circle,
  ArrowRight,
  ListChecks,
  Wand2,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { assetsRepo, documentsRepo } from "@/lib/db";
import { exportProjectMarkdown } from "@/lib/export";
import { PHASES } from "@/types/pipeline";
import { CODE_AGENTS, type CodeAgentDefinition, type CodeAgentId } from "@/agents/code_agents";
import { runCodeAgentTurn } from "@/agents/code_runner";
import { gameDiffLast, gameResetLast } from "@/lib/git";
import type { ClaudeMessage } from "@/lib/claude";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import type { GeneratedAsset } from "@/types/domain";
import { characterSpritePhase } from "@/lib/phases/characterSprites";
import { tilesetPhase } from "@/lib/phases/tilesets";
import { uiHudPhase } from "@/lib/phases/uiHud";
import { vfxItemsPhase } from "@/lib/phases/vfxItems";
import { audioSfxPhase } from "@/lib/phases/audioSfx";
import { audioMusicPhase } from "@/lib/phases/audioMusic";
import {
  packCharacterSheets,
  packTilesets,
  packUiAtlas,
} from "@/lib/asepritePacker";
import {
  generateCharacterGodotResources,
  generateTilesetGodotResources,
  generateUiGodotResources,
} from "@/lib/godotResources";
import { loadScenePlan } from "@/lib/sceneBuilder";
import { Package, Gamepad2, Music, Volume2, User, Grid3X3, Joystick, Zap, FolderOpen, CheckCircle2, AlertCircle } from "lucide-react";

type ImplTab = "scaffold" | "agents" | "build" | "roadmap";
type ImplMode = "wizard" | "advanced";
type WizardStep = 1 | 2 | 3 | 4;

interface GameFile {
  relative: string;
  is_dir: boolean;
  size: number;
}

interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  commit?: string;
  diffStat?: string;
}

interface AgentState {
  messages: AgentMessage[];
  busy: boolean;
}

export function ImplementationView() {
  const { currentProject } = useProjectStore();
  const [mode, setMode] = useState<ImplMode>("wizard");
  const [tab, setTab] = useState<ImplTab>("scaffold");

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        Selecione um projeto para acessar a Fase 14.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header gap-4">
        <Code2 className="h-3 w-3" />
        <span>Fase 14 — Implementação (Godot 4 + C# / .NET 8)</span>
        <div className="flex items-center gap-0.5 ml-4">
          <TabButton active={mode === "wizard"} onClick={() => setMode("wizard")}>
            <Wand2 className="h-3 w-3" />
            Wizard
          </TabButton>
          <TabButton
            active={mode === "advanced"}
            onClick={() => setMode("advanced")}
          >
            <ListChecks className="h-3 w-3" />
            Modo avançado
          </TabButton>
        </div>
        {mode === "advanced" && (
          <div className="flex items-center gap-0.5 ml-4">
            <TabButton
              active={tab === "scaffold"}
              onClick={() => setTab("scaffold")}
            >
              <FolderTree className="h-3 w-3" />
              Scaffold
            </TabButton>
            <TabButton active={tab === "agents"} onClick={() => setTab("agents")}>
              <Bot className="h-3 w-3" />
              Agentes
            </TabButton>
            <TabButton active={tab === "build"} onClick={() => setTab("build")}>
              <Hammer className="h-3 w-3" />
              Build & Run
            </TabButton>
            <TabButton active={tab === "roadmap"} onClick={() => setTab("roadmap")}>
              <Rocket className="h-3 w-3" />
              Roadmap
            </TabButton>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === "wizard" && (
          <WizardView
            projectId={currentProject.id}
            projectName={currentProject.name}
          />
        )}
        {mode === "advanced" && tab === "scaffold" && (
          <ScaffoldTab
            projectId={currentProject.id}
            projectName={currentProject.name}
          />
        )}
        {mode === "advanced" && tab === "agents" && (
          <AgentsTab projectId={currentProject.id} />
        )}
        {mode === "advanced" && tab === "build" && (
          <BuildRunTab projectId={currentProject.id} />
        )}
        {mode === "advanced" && tab === "roadmap" && (
          <RoadmapTab projectId={currentProject.id} />
        )}
      </div>
    </div>
  );
}

// ===============================================================
// Wizard — 3 passos sequenciais (Concept Arts → Assets/Sprites → Código)
// ===============================================================

function WizardView({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [docsApprovedCount, setDocsApprovedCount] = useState(0);
  const [phase9Approved, setPhase9Approved] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [allAssets, docs] = await Promise.all([
        assetsRepo.listByProject(projectId),
        documentsRepo.listByProject(projectId),
      ]);
      setAssets(allAssets.filter((a) => a.generator === "pixellab"));
      const approved = docs.filter((d) => d.status === "approved");
      setDocsApprovedCount(approved.length);
      setPhase9Approved(
        approved.some((d) => d.phase_number === 9)
      );
    } catch {
      // ignora
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  const conceptApproved = useMemo(
    () =>
      assets.filter(
        (a) => a.asset_type === "concept_art" && a.status === "approved"
      ).length,
    [assets]
  );

  const MIN_CONCEPTS = 3;
  const totalPhases = PHASES.length;
  const discoveryComplete = docsApprovedCount >= totalPhases;
  const step1Complete = conceptApproved >= MIN_CONCEPTS;

  // Stats dos planos F1..F6
  const [phaseStats, setPhaseStats] = useState<PhaseStats>({});
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next: PhaseStats = {};
      const pairs: Array<[PhaseKey, { loadPlan: (p: string) => Promise<any> }]> = [
        ["character-sprites", characterSpritePhase],
        ["tilesets", tilesetPhase],
        ["ui-hud", uiHudPhase],
        ["vfx-items", vfxItemsPhase],
        ["audio-sfx", audioSfxPhase],
        ["audio-music", audioMusicPhase],
      ];
      for (const [key, phase] of pairs) {
        try {
          const plan = await phase.loadPlan(projectId);
          if (plan && Array.isArray(plan.items)) {
            next[key] = {
              planned: plan.items.length,
              included: plan.items.filter((it: any) => it.included !== false)
                .length,
            };
          } else {
            next[key] = { planned: 0, included: 0 };
          }
        } catch {
          next[key] = { planned: 0, included: 0 };
        }
      }
      if (!cancelled) setPhaseStats(next);
    }
    load();
    const itv = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(itv);
    };
  }, [projectId]);

  const [scenePlanItems, setScenePlanItems] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const plan = await loadScenePlan(projectId);
        if (!cancelled) setScenePlanItems(plan ? plan.scenes.length : 0);
      } catch {
        if (!cancelled) setScenePlanItems(0);
      }
    }
    load();
    const itv = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(itv);
    };
  }, [projectId]);

  const step2Complete =
    (phaseStats["character-sprites"]?.planned ?? 0) > 0 &&
    (phaseStats["tilesets"]?.planned ?? 0) > 0;
  const step3Complete = scenePlanItems > 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-4xl mx-auto space-y-5">
        <PreReqsChecklist
          discoveryComplete={discoveryComplete}
          docsApprovedCount={docsApprovedCount}
          totalPhases={totalPhases}
          phase9Approved={phase9Approved}
        />

        <Stepper
          step={step}
          setStep={setStep}
          step1Complete={step1Complete}
          step2Complete={step2Complete}
          step3Complete={step3Complete}
        />

        {step === 1 && (
          <WizardStep1ConceptArts
            count={conceptApproved}
            required={MIN_CONCEPTS}
            total={assets.filter((a) => a.asset_type === "concept_art").length}
            phase9Approved={phase9Approved}
            onAdvance={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <WizardStep2AssetPipelines
            projectId={projectId}
            stats={phaseStats}
            onBack={() => setStep(1)}
            onAdvance={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <WizardStep3SceneBuilder
            scenePlanItems={scenePlanItems}
            onBack={() => setStep(2)}
            onAdvance={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <WizardStep4Code
            projectId={projectId}
            projectName={projectName}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </ScrollArea>
  );
}

type PhaseKey =
  | "character-sprites"
  | "tilesets"
  | "ui-hud"
  | "vfx-items"
  | "audio-sfx"
  | "audio-music";

type PhaseStats = Partial<Record<PhaseKey, { planned: number; included: number }>>;

function PreReqsChecklist({
  discoveryComplete,
  docsApprovedCount,
  totalPhases,
  phase9Approved,
}: {
  discoveryComplete: boolean;
  docsApprovedCount: number;
  totalPhases: number;
  phase9Approved: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-1.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        Pré-requisitos
      </div>
      <PreReqLine
        ok={discoveryComplete}
        label={`Discovery concluído: ${docsApprovedCount}/${totalPhases} etapas aprovadas`}
      />
      <PreReqLine
        ok={phase9Approved}
        label="Etapa 9 (Direção de Arte) aprovada — RN007 para gerar Concept Arts"
      />
    </div>
  );
}

function PreReqLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

function Stepper({
  step,
  setStep,
  step1Complete,
  step2Complete,
  step3Complete,
}: {
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
}) {
  const steps: Array<{
    n: WizardStep;
    label: string;
    sub: string;
    icon: React.ReactNode;
    done: boolean;
  }> = [
    {
      n: 1,
      label: "Concept Arts",
      sub: "Linguagem visual (F0)",
      icon: <ImageIcon className="h-4 w-4" />,
      done: step1Complete,
    },
    {
      n: 2,
      label: "Assets & Sprites",
      sub: "F1..F6 produção em lote",
      icon: <Layers className="h-4 w-4" />,
      done: step2Complete,
    },
    {
      n: 3,
      label: "Scene Builder",
      sub: "F9 montagem Godot",
      icon: <FileCode2 className="h-4 w-4" />,
      done: step3Complete,
    },
    {
      n: 4,
      label: "Código",
      sub: "Godot 4 + C# / .NET 8",
      icon: <Code2 className="h-4 w-4" />,
      done: false,
    },
  ];

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-stretch gap-2">
        {steps.map((s, i) => {
          const active = s.n === step;
          return (
            <div key={s.n} className="flex items-center flex-1">
              <button
                onClick={() => setStep(s.n)}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10"
                    : s.done
                      ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
                      : "border-border/40 hover:bg-accent/40"
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                    active
                      ? "bg-primary text-primary-foreground"
                      : s.done
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {s.done ? <Check className="h-3.5 w-3.5" /> : s.n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {s.icon}
                    <span>{s.label}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {s.sub}
                  </div>
                </div>
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WizardStep1ConceptArts({
  count,
  required,
  total,
  phase9Approved,
  onAdvance,
}: {
  count: number;
  required: number;
  total: number;
  phase9Approved: boolean;
  onAdvance: () => void;
}) {
  const openTab = useUiStore((s) => s.openTab);
  const done = count >= required;
  return (
    <WizardStepCard
      stepNumber={1}
      title="Concept Arts"
      description="Gere a linguagem visual do projeto antes da produção em série. Aprove pelo menos 3 concept arts que representem estética, paleta e iluminação do jogo."
    >
      {!phase9Approved && (
        <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
          Aprove a <strong>Etapa 9 (Direção de Arte)</strong> no Discovery antes
          de gerar concept arts (regra RN007).
        </div>
      )}
      <Progress
        label="Concept arts aprovados"
        value={count}
        max={required}
        subtitle={`${total} geradas no total`}
      />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="glow"
          onClick={() =>
            openTab({
              id: "panel:concept-pipeline",
              kind: "concept-pipeline",
              title: "Pipeline de Concept Arts",
            })
          }
          disabled={!phase9Approved}
        >
          <Wand2 className="h-3 w-3" />
          Planejar automaticamente com IA
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            openTab({
              id: "panel:art",
              kind: "asset-preview",
              title: "Assets visuais",
            })
          }
        >
          <ImageIcon className="h-3 w-3" />
          Abrir painel manual de Concept Arts
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            openTab({
              id: "panel:semantic-graph",
              kind: "semantic-graph",
              title: "Grafo Semântico",
            })
          }
        >
          Ver correlações no Grafo Semântico
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={done ? "glow" : "outline"}
          disabled={!done}
          onClick={onAdvance}
        >
          Avançar para Assets & Sprites
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </WizardStepCard>
  );
}

function WizardStep2AssetPipelines({
  projectId,
  stats,
  onBack,
  onAdvance,
}: {
  projectId: string;
  stats: PhaseStats;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const openTab = useUiStore((s) => s.openTab);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [lastErr, setLastErr] = useState<string | null>(null);
  const [postDetails, setPostDetails] = useState<{
    key: PhaseKey;
    kind: "pack" | "godot";
    items: Array<{
      name: string;
      success: boolean;
      message: string;
      stderr?: string;
      outPng?: string;
    }>;
  } | null>(null);

  const rows: Array<{
    key: PhaseKey;
    tabId: string;
    tabKind: any;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    canPack: boolean;
    canGodot: boolean;
  }> = [
    {
      key: "character-sprites",
      tabId: "panel:character-sprites",
      tabKind: "character-sprites-pipeline",
      title: "F1 — Character Sprites",
      subtitle: "Personagens com animações (idle/walk/attack)",
      icon: <User className="h-3.5 w-3.5" />,
      canPack: true,
      canGodot: true,
    },
    {
      key: "tilesets",
      tabId: "panel:tilesets",
      tabKind: "tilesets-pipeline",
      title: "F2 — Tilesets",
      subtitle: "Blocos de cenário (grass, stone, water)",
      icon: <Grid3X3 className="h-3.5 w-3.5" />,
      canPack: true,
      canGodot: true,
    },
    {
      key: "ui-hud",
      tabId: "panel:ui-hud",
      tabKind: "ui-hud-pipeline",
      title: "F3 — UI / HUD",
      subtitle: "Ícones, botões e atlas de interface",
      icon: <Joystick className="h-3.5 w-3.5" />,
      canPack: true,
      canGodot: true,
    },
    {
      key: "vfx-items",
      tabId: "panel:vfx-items",
      tabKind: "vfx-items-pipeline",
      title: "F4 — VFX & Itens",
      subtitle: "Partículas, explosões, poções",
      icon: <Zap className="h-3.5 w-3.5" />,
      canPack: false,
      canGodot: false,
    },
    {
      key: "audio-sfx",
      tabId: "panel:audio-sfx",
      tabKind: "audio-sfx-pipeline",
      title: "F5 — Audio SFX",
      subtitle: "Efeitos sonoros (ElevenLabs)",
      icon: <Volume2 className="h-3.5 w-3.5" />,
      canPack: false,
      canGodot: false,
    },
    {
      key: "audio-music",
      tabId: "panel:audio-music",
      tabKind: "audio-music-pipeline",
      title: "F6 — Audio Music",
      subtitle: "Trilhas (15-60s por track)",
      icon: <Music className="h-3.5 w-3.5" />,
      canPack: false,
      canGodot: false,
    },
  ];

  async function runPack(key: PhaseKey) {
    setBusy(`pack:${key}`);
    setLastErr(null);
    setLastMsg(null);
    setPostDetails(null);
    try {
      let results: Array<{
        name: string;
        success: boolean;
        frameCount?: number;
        message?: string;
        outPng?: string;
        stderr?: string;
      }> = [];
      if (key === "character-sprites")
        results = await packCharacterSheets(projectId);
      else if (key === "tilesets") results = await packTilesets(projectId);
      else if (key === "ui-hud") results = await packUiAtlas(projectId);

      const ok = results.filter((r) => r.success).length;
      const fail = results.length - ok;
      if (results.length === 0) {
        setLastErr(
          "Nenhum asset aprovado para empacotar. Aprove os sprites/tiles no F1/F2/F3 antes."
        );
      } else if (fail > 0) {
        setLastErr(
          `Empacotou ${ok}/${results.length} sheets. ${fail} falha(s). Veja detalhes abaixo.`
        );
      } else {
        setLastMsg(
          `Empacotou ${ok} sheet(s) em game/assets/generated/. Detalhes abaixo.`
        );
      }
      setPostDetails({
        key,
        kind: "pack",
        items: results.map((r) => ({
          name: r.name,
          success: r.success,
          message:
            r.message ??
            (r.success
              ? `OK · ${r.frameCount ?? 0} frames`
              : `FALHOU (${r.frameCount ?? 0} frames)`),
          stderr: r.stderr,
          outPng: r.outPng,
        })),
      });
    } catch (e: any) {
      setLastErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function runGodot(key: PhaseKey) {
    setBusy(`godot:${key}`);
    setLastErr(null);
    setLastMsg(null);
    setPostDetails(null);
    try {
      let results: Array<{
        name: string;
        success: boolean;
        tresPath?: string;
        message?: string;
        error?: string;
      }> = [];
      if (key === "character-sprites")
        results = await generateCharacterGodotResources(projectId);
      else if (key === "tilesets")
        results = await generateTilesetGodotResources(projectId);
      else if (key === "ui-hud")
        results = await generateUiGodotResources(projectId);

      const ok = results.filter((r) => r.success).length;
      const fail = results.length - ok;
      if (results.length === 0) {
        setLastErr(
          "Nenhum sheet empacotado encontrado. Rode Empacotar antes de Gerar .tres."
        );
      } else if (fail > 0) {
        setLastErr(
          `.tres gerados: ${ok}/${results.length}. ${fail} falha(s).`
        );
      } else {
        setLastMsg(`.tres gerado(s): ${ok}`);
      }
      setPostDetails({
        key,
        kind: "godot",
        items: results.map((r) => ({
          name: r.name,
          success: r.success,
          message:
            r.message ??
            (r.success
              ? `OK · ${r.tresPath?.split(/[\\/]/).pop() ?? ""}`
              : `FALHOU · ${r.error ?? ""}`),
          outPng: r.tresPath,
          stderr: r.error,
        })),
      });
    } catch (e: any) {
      setLastErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
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

  const anyPlanned = rows.some((r) => (stats[r.key]?.planned ?? 0) > 0);

  return (
    <WizardStepCard
      stepNumber={2}
      title="Assets & Sprites — F1..F6"
      description="Cada sub-fase tem seu próprio planner/runner: Claude planeja, você aprova e a geração dispara em lote. F1/F2/F3 podem ser empacotados em spritesheets e convertidos em recursos Godot (.tres) nativos."
    >
      <div className="space-y-2">
        {rows.map((row) => {
          const stat = stats[row.key] ?? { planned: 0, included: 0 };
          const planExists = stat.planned > 0;
          return (
            <div
              key={row.key}
              className="rounded-md border border-border/50 bg-background/40 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{row.title}</span>
                    {planExists ? (
                      <Badge variant="secondary" className="text-[9px]">
                        {stat.included}/{stat.planned} itens
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
                        sem plano
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {row.subtitle}
                  </div>
                  <Progress
                    label="Plano"
                    value={stat.included}
                    max={Math.max(1, stat.planned)}
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() =>
                        openTab({
                          id: row.tabId,
                          kind: row.tabKind,
                          title: row.title,
                        })
                      }
                    >
                      <ArrowRight className="h-3 w-3" />
                      Abrir pipeline
                    </Button>
                    {row.canPack && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        disabled={!planExists || busy !== null}
                        onClick={() => runPack(row.key)}
                      >
                        <Package className="h-3 w-3" />
                        {busy === `pack:${row.key}`
                          ? "Empacotando…"
                          : "Empacotar"}
                      </Button>
                    )}
                    {row.canGodot && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        disabled={!planExists || busy !== null}
                        onClick={() => runGodot(row.key)}
                      >
                        <Gamepad2 className="h-3 w-3" />
                        {busy === `godot:${row.key}`
                          ? "Gerando…"
                          : "Gerar .tres"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(lastMsg || lastErr) && (
        <div
          className={cn(
            "text-[11px] rounded px-3 py-2 mt-1",
            lastErr
              ? "border border-destructive/40 bg-destructive/10 text-destructive"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          )}
        >
          {lastErr ?? lastMsg}
        </div>
      )}

      {postDetails && postDetails.items.length > 0 && (
        <div className="rounded border border-border/50 bg-background/50 p-2 space-y-1 mt-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {postDetails.kind === "pack"
              ? "Resultado · Empacotar"
              : "Resultado · Gerar .tres"}{" "}
            — {postDetails.items.filter((i) => i.success).length}/
            {postDetails.items.length} ok
          </div>
          <ul className="text-xs space-y-1 font-mono">
            {postDetails.items.map((it, idx) => (
              <li
                key={idx}
                className={cn(
                  "flex items-start gap-2 p-1 rounded",
                  it.success
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {it.success ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{it.name}</div>
                  <div className="break-words whitespace-pre-wrap text-[10px] opacity-90">
                    {it.message}
                  </div>
                  {it.stderr && !it.success && (
                    <div className="break-words whitespace-pre-wrap text-[10px] opacity-70 mt-0.5">
                      {it.stderr.slice(-400)}
                    </div>
                  )}
                </div>
                {it.outPng && it.success && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1"
                    title="Abrir pasta"
                    onClick={() => revealPath(it.outPng)}
                  >
                    <FolderOpen className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={anyPlanned ? "glow" : "outline"}
          disabled={!anyPlanned}
          onClick={onAdvance}
        >
          Avançar para Scene Builder
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </WizardStepCard>
  );
}

function WizardStep3SceneBuilder({
  scenePlanItems,
  onBack,
  onAdvance,
}: {
  scenePlanItems: number;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const openTab = useUiStore((s) => s.openTab);
  return (
    <WizardStepCard
      stepNumber={3}
      title="Scene Builder — F9"
      description="Com os assets produzidos, peça ao Claude para projetar toda a árvore de cenas Godot (Player.tscn, enemies, levels, HUD, World). O plano é auto-aprovado e o .tscn é gerado e commitado."
    >
      <Progress
        label="Cenas planejadas"
        value={scenePlanItems}
        max={Math.max(1, scenePlanItems)}
        subtitle={
          scenePlanItems > 0
            ? `${scenePlanItems} .tscn previstos`
            : "nenhum plano ainda"
        }
      />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="glow"
          onClick={() =>
            openTab({
              id: "panel:scene-builder",
              kind: "scene-builder",
              title: "F9 — Scene Builder",
            })
          }
        >
          <FileCode2 className="h-3 w-3" />
          Abrir Scene Builder
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button
          size="sm"
          variant={scenePlanItems > 0 ? "glow" : "outline"}
          disabled={scenePlanItems === 0}
          onClick={onAdvance}
        >
          Avançar para Código
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </WizardStepCard>
  );
}

function WizardStep4Code({
  projectId,
  projectName,
  onBack,
}: {
  projectId: string;
  projectName: string;
  onBack: () => void;
}) {
  return (
    <WizardStepCard
      stepNumber={4}
      title="Código — Godot 4 + C# / .NET 8"
      description="Agora que você tem a visão (concept arts), os assets e as cenas, vamos conectar tudo ao projeto Godot. Execute as quatro ações abaixo em ordem."
    >
      <ScaffoldTab
        projectId={projectId}
        projectName={projectName}
        variant="wizard"
      />
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={onBack}>
          Voltar
        </Button>
      </div>
    </WizardStepCard>
  );
}

function WizardStepCard({
  stepNumber,
  title,
  description,
  children,
}: {
  stepNumber: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
            {stepNumber}
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function Progress({
  label,
  value,
  max,
  subtitle,
}: {
  label: string;
  value: number;
  max: number;
  subtitle?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const done = value >= max;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "text-[10px]",
            done ? "text-emerald-400" : "text-muted-foreground"
          )}
        >
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            done ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {subtitle && (
        <div className="text-[10px] text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-[11px] rounded hover:bg-accent/40",
        active && "bg-accent/60 text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ===============================================================
// Scaffold tab
// ===============================================================

function ScaffoldTab({
  projectId,
  projectName,
  variant = "default",
}: {
  projectId: string;
  projectName: string;
  variant?: "default" | "wizard";
}) {
  const [files, setFiles] = useState<GameFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await invoke<GameFile[]>("list_game_files", {
        projectId,
      });
      setFiles(list);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleScaffold(safe: boolean) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // Puxa roadmap da Etapa 13 (se aprovada) para o README.
      let roadmapMd: string | null = null;
      try {
        const docs = await documentsRepo.listByProject(projectId);
        const p13 = docs.find((d) => d.phase_number === 13);
        if (p13?.status === "approved") roadmapMd = p13.content;
      } catch {
        // ignora
      }
      const out = await invoke<{ game_dir: string; files_written: string[]; already_existed: boolean }>(
        "scaffold_godot_csharp",
        {
          args: {
            project_id: projectId,
            project_name: projectName,
            roadmap_md: roadmapMd,
            safe,
          },
        }
      );
      setResult(
        `Scaffold ok em ${out.game_dir} — ${out.files_written.length} arquivos ${
          out.already_existed ? "(projeto já existia)" : "(novo projeto)"
        }`
      );
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyAssets() {
    setBusy(true);
    setError(null);
    try {
      const out = await invoke<{ copied: number; skipped: number; errors: string[] }>(
        "copy_approved_assets_to_game",
        {
          args: { project_id: projectId, status_filter: "approved" },
        }
      );
      setResult(
        `Assets copiados: ${out.copied} novos, ${out.skipped} ja existentes, ${out.errors.length} erros`
      );
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleExportGddToGame() {
    setBusy(true);
    setError(null);
    try {
      await exportProjectMarkdown(projectId, projectName, { alsoLatest: true });
      // Também copia exports/gdd-latest.md para game/docs/gdd-latest.md
      // para o Claude Code encontrar no cwd.
      const content = await invoke<string>("read_project_file", {
        projectId,
        relative: "exports/gdd-latest.md",
      }).catch(() => null);
      if (content) {
        await invoke<string>("write_project_file", {
          args: {
            project_id: projectId,
            relative: "game/docs/gdd-latest.md",
            content,
          },
        });
        setResult("GDD exportado e copiado para game/docs/gdd-latest.md");
        await refresh();
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const steps: Array<{
    n: number;
    title: string;
    description: string;
    button: React.ReactNode;
  }> = [
    {
      n: 1,
      title: "Inicializar projeto Godot (C#)",
      description:
        "Cria a estrutura de pastas do projeto Godot 4 com .NET 8 em game/ (project.godot, .csproj, Main.tscn, scripts base). Executar uma vez por projeto.",
      button: (
        <Button
          variant="glow"
          size="sm"
          className="h-7"
          disabled={busy}
          onClick={() => handleScaffold(false)}
        >
          <Sparkles className="h-3 w-3" />
          Inicializar projeto Godot (C#)
        </Button>
      ),
    },
    {
      n: 2,
      title: "Atualizar scaffold (modo seguro)",
      description:
        "Re-executa o scaffold sem sobrescrever arquivos existentes. Útil ao adicionar novos templates sem perder código que você já escreveu.",
      button: (
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={busy}
          onClick={() => handleScaffold(true)}
        >
          Atualizar (safe — não sobrescreve)
        </Button>
      ),
    },
    {
      n: 3,
      title: "Copiar assets aprovados → game/assets",
      description:
        "Copia todos os concept arts, sprites, tiles e áudios aprovados para game/assets/, acessíveis ao Godot importar.",
      button: (
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={busy}
          onClick={handleCopyAssets}
        >
          <Download className="h-3 w-3" />
          Copiar assets aprovados → game/assets
        </Button>
      ),
    },
    {
      n: 4,
      title: "Exportar GDD para game/docs/",
      description:
        "Exporta o GDD consolidado (Markdown) para game/docs/gdd-latest.md. Claude Code e outros agentes de implementação leem esse arquivo como fonte de verdade.",
      button: (
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={busy}
          onClick={handleExportGddToGame}
        >
          Exportar GDD para game/docs/
        </Button>
      ),
    },
  ];

  const statusBanner = (result || error) && (
    <div
      className={cn(
        "px-4 py-2 text-[12px] rounded",
        error
          ? "border border-destructive/40 bg-destructive/10 text-destructive"
          : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      )}
    >
      {error ?? result}
    </div>
  );

  const fileTree = (
    <div className="p-3 font-mono text-[11px]">
      {files.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhum arquivo em <code>game/</code> ainda. Clique em "Inicializar projeto Godot".
        </p>
      ) : (
        <ul className="space-y-0.5">
          {files.map((f) => (
            <li
              key={f.relative}
              className="flex items-center gap-2 hover:bg-accent/20 px-1 rounded"
              style={{ paddingLeft: `${depth(f.relative) * 12}px` }}
            >
              {f.is_dir ? (
                <FolderTree className="h-3 w-3 text-primary shrink-0" />
              ) : (
                <FileCode2 className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <span className={cn(f.is_dir && "text-primary")}>
                {basename(f.relative)}
              </span>
              {!f.is_dir && (
                <span className="text-[9px] text-muted-foreground ml-auto">
                  {humanSize(f.size)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (variant === "wizard") {
    return (
      <div className="space-y-3">
        <ol className="space-y-2.5">
          {steps.map((s) => (
            <li
              key={s.n}
              className="rounded-md border border-border/50 bg-background/40 p-3"
            >
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-accent text-accent-foreground text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {s.n}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{s.title}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {s.description}
                  </p>
                  <div className="mt-2">{s.button}</div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {statusBanner}
        <div className="rounded-md border border-border/50 bg-background/40">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/40">
            Estrutura de <code>game/</code>
          </div>
          <ScrollArea className="max-h-[300px]">{fileTree}</ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/60 flex flex-wrap items-center gap-2">
        {steps.map((s) => (
          <div key={s.n}>{s.button}</div>
        ))}
      </div>
      {statusBanner && <div className="px-4 py-2">{statusBanner}</div>}
      <ScrollArea className="flex-1">{fileTree}</ScrollArea>
    </div>
  );
}

function depth(rel: string): number {
  return rel.split("/").length - 1;
}
function basename(rel: string): string {
  const p = rel.split("/");
  return p[p.length - 1] || rel;
}
function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ===============================================================
// Agents tab — chat com agentes de codigo
// ===============================================================

function AgentsTab({ projectId }: { projectId: string }) {
  const [agentId, setAgentId] = useState<CodeAgentId>("engine_architect");
  const [byAgent, setByAgent] = useState<Record<CodeAgentId, AgentState>>(() => {
    const init = {} as Record<CodeAgentId, AgentState>;
    for (const id of Object.keys(CODE_AGENTS) as CodeAgentId[]) {
      init[id] = { messages: [], busy: false };
    }
    return init;
  });
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const agent = CODE_AGENTS[agentId];
  const state = byAgent[agentId];

  async function send() {
    if (!input.trim() || state.busy) return;
    const userMsg: AgentMessage = {
      id: nanoid(),
      role: "user",
      content: input.trim(),
    };
    const asstId = nanoid();
    const asst: AgentMessage = { id: asstId, role: "assistant", content: "" };
    setByAgent((prev) => ({
      ...prev,
      [agentId]: {
        messages: [...prev[agentId].messages, userMsg, asst],
        busy: true,
      },
    }));
    const history: ClaudeMessage[] = state.messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
    const userText = input.trim();
    setInput("");
    abortRef.current = new AbortController();
    try {
      const result = await runCodeAgentTurn({
        agent,
        projectId,
        history,
        userMessage: userText,
        signal: abortRef.current.signal,
        onText: (delta) => {
          setByAgent((prev) => {
            const cur = prev[agentId];
            const msgs = cur.messages.map((m) =>
              m.id === asstId ? { ...m, content: m.content + delta } : m
            );
            return { ...prev, [agentId]: { ...cur, messages: msgs } };
          });
        },
      });
      // Captura diff da ultima commit para mostrar inline.
      let diffStat: string | undefined;
      if (result.committed) {
        try {
          const d = await gameDiffLast(projectId);
          diffStat = d.stdout.trim() || undefined;
        } catch {
          // ignora
        }
      }
      setByAgent((prev) => {
        const cur = prev[agentId];
        const msgs = cur.messages.map((m) =>
          m.id === asstId
            ? {
                ...m,
                content: result.fullText,
                commit: result.commitMessage,
                diffStat,
              }
            : m
        );
        return { ...prev, [agentId]: { messages: msgs, busy: false } };
      });
    } catch (e: any) {
      setByAgent((prev) => {
        const cur = prev[agentId];
        const msgs = cur.messages.map((m) =>
          m.id === asstId
            ? {
                ...m,
                content: m.content + `\n\n_[erro: ${String(e?.message ?? e)}]_`,
              }
            : m
        );
        return { ...prev, [agentId]: { messages: msgs, busy: false } };
      });
    } finally {
      abortRef.current = null;
    }
  }

  async function undoLastTurn() {
    if (!confirm("Reverter o ultimo commit do game/ (git reset --hard HEAD~1)? Alteracoes nao commitadas serao perdidas.")) {
      return;
    }
    try {
      const r = await gameResetLast(projectId);
      if (!r.success) {
        alert(`git reset falhou (code=${r.code}): ${r.stderr || r.stdout}`);
        return;
      }
      alert("Ultimo commit do game/ revertido.");
    } catch (e: any) {
      alert(String(e?.message ?? e));
    }
  }

  return (
    <div className="h-full flex">
      <div className="w-56 border-r border-border/60 p-2 space-y-1">
        {(Object.values(CODE_AGENTS) as CodeAgentDefinition[]).map((a) => (
          <button
            key={a.id}
            onClick={() => setAgentId(a.id)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md flex items-start gap-2 text-xs hover:bg-accent/40",
              agentId === a.id && "bg-accent/60 ring-1 ring-primary/40"
            )}
          >
            <span
              className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
              style={{ background: `${a.color}22`, color: a.color }}
            >
              {a.displayName[0]}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate font-medium">{a.displayName}</span>
              <span className="block truncate text-muted-foreground text-[10px]">
                {a.role}
              </span>
            </span>
          </button>
        ))}
        <div className="pt-3 border-t border-border/60 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full"
            onClick={undoLastTurn}
          >
            <Undo2 className="h-3 w-3" />
            Reverter ultimo turno
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2 border-b border-border/60 flex items-center gap-2">
          <span
            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ background: `${agent.color}22`, color: agent.color }}
          >
            {agent.displayName[0]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{agent.displayName}</div>
            <div className="text-[11px] text-muted-foreground">
              modelo: {agent.model} · modo: {agent.permissionMode} · cwd:{" "}
              <code className="text-foreground/70">game/</code>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Claude Code Agent
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {state.messages.length === 0 && (
              <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                {agent.firstMessage}
              </div>
            )}
            {state.messages.map((m) => (
              <MsgBubble key={m.id} msg={m} color={agent.color} />
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-border/60 p-3 space-y-2">
          <Textarea
            rows={3}
            placeholder={`Instrua o ${agent.displayName}… ex: "Leia game/docs/gdd-latest.md e proponha a arquitetura inicial em docs/architecture.md"`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              Ctrl+Enter envia
            </span>
            <div className="flex-1" />
            {state.busy && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7"
                onClick={() => abortRef.current?.abort()}
              >
                <StopCircle className="h-3 w-3" />
                Cancelar
              </Button>
            )}
            <Button
              variant="glow"
              size="sm"
              className="h-7"
              onClick={send}
              disabled={state.busy || !input.trim()}
            >
              <Send className="h-3 w-3" />
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MsgBubble({ msg, color }: { msg: AgentMessage; color: string }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-xs whitespace-pre-wrap",
        isUser
          ? "border-primary/30 bg-primary/5 ml-8"
          : "border-border/60 bg-card/40 mr-8"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-semibold"
          style={{
            background: isUser ? "transparent" : `${color}22`,
            color: isUser ? undefined : color,
          }}
        >
          {isUser ? "V" : "A"}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {isUser ? "você" : "agente"}
        </span>
        {msg.commit && (
          <Badge variant="outline" className="text-[9px] ml-auto">
            commit: {msg.commit}
          </Badge>
        )}
      </div>
      <div className="font-mono text-[11px]">{msg.content || "_(sem texto)_"}</div>
      {msg.diffStat && (
        <div className="mt-2 rounded border border-border/60 bg-black/30 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            git diff --stat (ultimo commit)
          </div>
          <pre className="font-mono text-[10px] whitespace-pre-wrap">
            {msg.diffStat}
          </pre>
        </div>
      )}
    </div>
  );
}

// ===============================================================
// Build & Run tab
// ===============================================================

interface LogLine {
  kind: "stdout" | "stderr" | "done" | "info";
  line: string;
}

function BuildRunTab({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  async function runCmd(
    cmdName: string,
    commandId: "godot_import" | "dotnet_build" | "godot_run_headless",
    channelPrefix: string
  ) {
    if (running) return;
    setLogs((prev) => [...prev, { kind: "info", line: `> ${cmdName}…` }]);
    setRunning(cmdName);
    const streamId = nanoid();
    try {
      const channel = await invoke<string>(commandId, {
        args: {
          project_id: projectId,
          stream_id: streamId,
          extra_args: [],
        },
      });
      const _ = channelPrefix; // canal é devolvido pelo backend
      const unlisten = await listen<any>(channel, (evt) => {
        const p = evt.payload;
        if (!p) return;
        if (p.kind === "done") {
          setLogs((prev) => [
            ...prev,
            {
              kind: "info",
              line: `> ${cmdName} finalizado (code=${p.code ?? "?"})`,
            },
          ]);
          setRunning(null);
          unlisten();
          unlistenRef.current = null;
        } else if (p.line) {
          setLogs((prev) => [
            ...prev,
            { kind: p.kind === "stderr" ? "stderr" : "stdout", line: p.line },
          ]);
        }
      });
      unlistenRef.current = unlisten;
    } catch (e: any) {
      setLogs((prev) => [
        ...prev,
        {
          kind: "stderr",
          line: `[erro] ${String(e?.message ?? e)}`,
        },
      ]);
      setRunning(null);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/60 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={!!running}
          onClick={() =>
            runCmd("godot --headless --editor --quit", "godot_import", "godot://import")
          }
        >
          <Download className="h-3 w-3" />
          Importar assets
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={!!running}
          onClick={() => runCmd("dotnet build", "dotnet_build", "dotnet://build")}
        >
          <Hammer className="h-3 w-3" />
          dotnet build
        </Button>
        <Button
          variant="glow"
          size="sm"
          className="h-7"
          disabled={!!running}
          onClick={() =>
            runCmd(
              "godot --headless --script tools/run_smoke_test.gd",
              "godot_run_headless",
              "godot://run"
            )
          }
        >
          <PlayCircle className="h-3 w-3" />
          Smoke test
        </Button>
        <div className="flex-1" />
        {running && (
          <Badge variant="warning" className="text-[10px]">
            executando: {running}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => setLogs([])}
        >
          Limpar
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <pre className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {logs.length === 0 ? (
            <span className="text-muted-foreground">
              Logs vao aparecer aqui. Rode um comando acima.
            </span>
          ) : (
            logs.map((l, i) => (
              <div
                key={i}
                className={cn(
                  l.kind === "stderr" && "text-destructive",
                  l.kind === "info" && "text-primary"
                )}
              >
                {l.line}
              </div>
            ))
          )}
        </pre>
      </ScrollArea>
    </div>
  );
}

// ===============================================================
// Roadmap tab
// ===============================================================

interface RoadmapItem {
  id: string;
  text: string;
  done: boolean;
}

const ROADMAP_STORAGE_KEY = (projectId: string) => `elysium-roadmap-${projectId}`;

function RoadmapTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [rawContent, setRawContent] = useState<string>("");

  const load = useCallback(async () => {
    const docs = await documentsRepo.listByProject(projectId);
    const p13 = docs.find((d) => d.phase_number === 13);
    if (!p13) {
      setRawContent("");
      setItems([]);
      return;
    }
    setRawContent(p13.content);
    // Extrai bullet lists e transforma em tarefas
    const extracted = extractTasks(p13.content);
    // Mescla com estado salvo
    try {
      const saved = JSON.parse(
        localStorage.getItem(ROADMAP_STORAGE_KEY(projectId)) ?? "[]"
      );
      const doneSet = new Set(
        Array.isArray(saved)
          ? saved.filter((x: any) => x?.done).map((x: any) => x.id)
          : []
      );
      setItems(extracted.map((it) => ({ ...it, done: doneSet.has(it.id) })));
    } catch {
      setItems(extracted);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    localStorage.setItem(
      ROADMAP_STORAGE_KEY(projectId),
      JSON.stringify(items)
    );
  }, [items, projectId]);

  function toggle(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/60 flex items-center gap-2">
        <Rocket className="h-3 w-3 text-primary" />
        <span className="text-xs">
          Checklist executável do roadmap da Etapa 13
        </span>
        <div className="flex-1" />
        <Badge variant="secondary" className="text-[10px]">
          {doneCount} / {items.length} concluídos
        </Badge>
        <Button variant="ghost" size="sm" className="h-7" onClick={load}>
          Recarregar
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {items.length === 0 && !rawContent && (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Aprove a Etapa 13 (GDD Final & Roadmap) para popular este checklist.
            </p>
          )}
          {items.length === 0 && rawContent && (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Nenhum item de roadmap detectado (espera-se bullets em lista
              markdown dentro do documento da Etapa 13).
            </p>
          )}
          <ul className="space-y-1">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-start gap-2 hover:bg-accent/20 rounded px-2 py-1"
              >
                <button
                  onClick={() => toggle(it.id)}
                  className="mt-0.5 shrink-0 text-primary"
                >
                  {it.done ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-xs flex-1",
                    it.done && "line-through text-muted-foreground"
                  )}
                >
                  {it.text}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 mt-1" />
              </li>
            ))}
          </ul>
        </div>
      </ScrollArea>
    </div>
  );
}

function extractTasks(md: string): RoadmapItem[] {
  const lines = md.split("\n");
  const tasks: RoadmapItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*[-*+]\s+(?:\[[ xX]\]\s+)?(.+?)\s*$/);
    if (m) {
      const text = m[1].trim();
      if (!text || text.startsWith("#")) continue;
      tasks.push({
        id: `t${i}-${text.slice(0, 40).replace(/\s+/g, "-").toLowerCase()}`,
        text,
        done: false,
      });
    }
  }
  return tasks;
}
