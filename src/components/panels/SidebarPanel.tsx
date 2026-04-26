import { useMemo } from "react";
import {
  FileText,
  Folder,
  Map as MapIcon,
  Network,
  GitBranch,
  MessagesSquare,
  Image as ImageIcon,
  Music4,
  Search,
  Download,
  Layers,
  Code2,
  Wand2,
  User,
  Grid3X3,
  Joystick,
  Zap,
  Volume2,
  FileCode2,
  BookOpen,
  Package,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { PHASES, orderedPhases } from "@/types/pipeline";
import { AGENTS } from "@/agents/agents";
import { cn } from "@/lib/utils";

export function SidebarPanel() {
  const { currentProject, documents, activePhase, setActivePhase } =
    useProjectStore();
  const openTab = useUiStore((s) => s.openTab);

  const docsByPhase = useMemo(() => {
    const map: Record<number, (typeof documents)[number]> = {};
    for (const d of documents) map[d.phase_number] = d;
    return map;
  }, [documents]);

  if (!currentProject)
    return <div className="h-full panel-shell" />;

  return (
    <div className="h-full panel-shell flex flex-col">
      <div className="panel-header">
        <Folder className="h-3 w-3" />
        <span className="truncate text-foreground/80">
          {currentProject.name}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          <Section title="Documentos das etapas">
            {orderedPhases().map((p, idx, arr) => {
              const d = docsByPhase[p.number];
              const agent = AGENTS[p.agent];
              const active = p.number === activePhase;
              const prev = idx > 0 ? arr[idx - 1] : undefined;
              const showNarrativeHeader =
                p.group === "narrative_expansion" &&
                prev?.group !== "narrative_expansion";
              const showProductionHeader =
                !p.position &&
                p.number === 9 &&
                prev?.group === "narrative_expansion";
              const label =
                p.position !== undefined
                  ? p.position.toFixed(1)
                  : String(p.number);
              return (
                <div key={p.number}>
                  {showNarrativeHeader && (
                    <div className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                      <BookOpen className="h-2.5 w-2.5" />
                      Expansão Narrativa (8.x)
                    </div>
                  )}
                  {showProductionHeader && (
                    <div className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-wider text-muted-foreground/80">
                      Direção & Produção
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setActivePhase(p.number);
                      openTab({
                        id: `doc:${p.number}`,
                        kind: "document",
                        title: p.title,
                        payload: { phase: p.number },
                      });
                    }}
                    className={cn(
                      "w-full text-left rounded-md px-2 py-1.5 flex items-start gap-2 text-xs hover:bg-accent/40",
                      active && "bg-accent/60 ring-1 ring-primary/40",
                      p.group === "narrative_expansion" && "pl-3"
                    )}
                  >
                    <span
                      className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        background: `${agent.color}20`,
                        color: agent.color,
                      }}
                    >
                      {label}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1">
                        <span className="truncate font-medium">{p.title}</span>
                        {d && (
                          <span
                            className={cn(
                              "text-[9px] uppercase tracking-wide rounded px-1",
                              d.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : d.status === "needs_revision"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {d.status === "approved"
                              ? "ok"
                              : d.status === "needs_revision"
                                ? "revisar"
                                : d.status}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground block truncate">
                        {p.subtitle}
                      </span>
                    </span>
                    <FileText className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
                  </button>
                </div>
              );
            })}
          </Section>

          <Section title="Painéis especializados">
            <SideTool
              icon={<Network className="h-3 w-3" />}
              label="Mapa de mecânicas"
              onClick={() =>
                openTab({
                  id: "panel:mechanics",
                  kind: "mechanics-map",
                  title: "Mecânicas",
                })
              }
            />
            <SideTool
              icon={<GitBranch className="h-3 w-3" />}
              label="Grafo Semântico"
              onClick={() =>
                openTab({
                  id: "panel:semantic-graph",
                  kind: "semantic-graph",
                  title: "Grafo Semântico",
                })
              }
            />
            <SideTool
              icon={<MapIcon className="h-3 w-3" />}
              label="Árvore de Lore"
              onClick={() =>
                openTab({
                  id: "panel:lore",
                  kind: "lore-tree",
                  title: "Lore",
                })
              }
            />
            <SideTool
              icon={<MessagesSquare className="h-3 w-3" />}
              label="Quests & Diálogos"
              onClick={() =>
                openTab({
                  id: "panel:quests",
                  kind: "quest-editor",
                  title: "Quests",
                })
              }
            />
            <SideTool
              icon={<ImageIcon className="h-3 w-3" />}
              label="Concept Arts"
              onClick={() =>
                openTab({
                  id: "panel:art",
                  kind: "asset-preview",
                  title: "Assets visuais",
                })
              }
            />
            <SideTool
              icon={<Wand2 className="h-3 w-3" />}
              label="F0 — Concept Arts"
              onClick={() =>
                openTab({
                  id: "panel:concept-pipeline",
                  kind: "concept-pipeline",
                  title: "F0 — Concept Arts",
                })
              }
            />
            <SideTool
              icon={<User className="h-3 w-3" />}
              label="F1 — Character Sprites"
              onClick={() =>
                openTab({
                  id: "panel:character-sprites",
                  kind: "character-sprites-pipeline",
                  title: "F1 — Character Sprites",
                })
              }
            />
            <SideTool
              icon={<ImageIcon className="h-3 w-3" />}
              label="Sprites Gallery"
              onClick={() =>
                openTab({
                  id: "panel:sprite-gallery",
                  kind: "sprite-gallery",
                  title: "Sprites Gallery",
                })
              }
            />
            <SideTool
              icon={<Grid3X3 className="h-3 w-3" />}
              label="F2 — Tilesets"
              onClick={() =>
                openTab({
                  id: "panel:tilesets",
                  kind: "tilesets-pipeline",
                  title: "F2 — Tilesets",
                })
              }
            />
            <SideTool
              icon={<Joystick className="h-3 w-3" />}
              label="F3 — UI / HUD"
              onClick={() =>
                openTab({
                  id: "panel:ui-hud",
                  kind: "ui-hud-pipeline",
                  title: "F3 — UI / HUD",
                })
              }
            />
            <SideTool
              icon={<Zap className="h-3 w-3" />}
              label="F4 — VFX / Itens"
              onClick={() =>
                openTab({
                  id: "panel:vfx-items",
                  kind: "vfx-items-pipeline",
                  title: "F4 — VFX / Itens",
                })
              }
            />
            <SideTool
              icon={<Volume2 className="h-3 w-3" />}
              label="F5 — Audio SFX"
              onClick={() =>
                openTab({
                  id: "panel:audio-sfx",
                  kind: "audio-sfx-pipeline",
                  title: "F5 — Audio SFX",
                })
              }
            />
            <SideTool
              icon={<Music4 className="h-3 w-3" />}
              label="F6 — Audio Music"
              onClick={() =>
                openTab({
                  id: "panel:audio-music",
                  kind: "audio-music-pipeline",
                  title: "F6 — Audio Music",
                })
              }
            />
            <SideTool
              icon={<FileCode2 className="h-3 w-3" />}
              label="F9 — Scene Builder"
              onClick={() =>
                openTab({
                  id: "panel:scene-builder",
                  kind: "scene-builder",
                  title: "F9 — Scene Builder",
                })
              }
            />
            <SideTool
              icon={<Music4 className="h-3 w-3" />}
              label="Áudio"
              onClick={() =>
                openTab({
                  id: "panel:audio",
                  kind: "audio-preview",
                  title: "Áudio",
                })
              }
            />
            <SideTool
              icon={<Search className="h-3 w-3" />}
              label="KB Explorer"
              onClick={() =>
                openTab({
                  id: "panel:kb",
                  kind: "kb-explorer",
                  title: "KB Explorer",
                })
              }
            />
            <SideTool
              icon={<BookOpen className="h-3 w-3" />}
              label="Canon Registry"
              onClick={() =>
                openTab({
                  id: "panel:canon",
                  kind: "canon",
                  title: "Canon Registry",
                })
              }
            />
            <SideTool
              icon={<Package className="h-3 w-3" />}
              label="Art Coverage"
              onClick={() =>
                openTab({
                  id: "panel:art-coverage",
                  kind: "art-coverage",
                  title: "Art Coverage",
                })
              }
            />
            <SideTool
              icon={<Layers className="h-3 w-3" />}
              label="Batch Producer"
              onClick={() =>
                openTab({
                  id: "panel:batch",
                  kind: "batch-producer",
                  title: "Batch Producer",
                })
              }
            />
            <SideTool
              icon={<Code2 className="h-3 w-3" />}
              label="Fase 14 — Implementação"
              onClick={() =>
                openTab({
                  id: "panel:impl",
                  kind: "implementation",
                  title: "Fase 14 — Implementação",
                })
              }
            />
            <SideTool
              icon={<Download className="h-3 w-3" />}
              label="Configurações & Export"
              onClick={() =>
                openTab({
                  id: "panel:settings",
                  kind: "settings",
                  title: "Configurações & Export",
                })
              }
            />
          </Section>
        </div>
      </ScrollArea>
      <div className="border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Projeto salvo em</span>
        <Badge variant="outline" className="font-mono">
          local
        </Badge>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SideTool({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 text-xs"
    >
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
