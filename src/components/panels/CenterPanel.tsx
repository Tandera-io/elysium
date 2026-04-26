import { useEffect } from "react";
import { X } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useProjectStore } from "@/stores/projectStore";
import { cn } from "@/lib/utils";
import { DocumentView } from "./center/DocumentView";
import { MechanicsMapView } from "./center/MechanicsMapView";
import { LoreTreeView } from "./center/LoreTreeView";
import { QuestEditorView } from "./center/QuestEditorView";
import { AssetPreviewView } from "./center/AssetPreviewView";
import { AudioPreviewView } from "./center/AudioPreviewView";
import { KbExplorerView } from "./center/KbExplorerView";
import { SemanticGraphView } from "./center/SemanticGraphView";
import { SettingsExportView } from "./center/SettingsExportView";
import { BatchProducerView } from "./center/BatchProducerView";
import { ConceptArtPipelineView } from "./center/ConceptArtPipelineView";
import { CharacterSpritePipelineView } from "./center/CharacterSpritePipelineView";
import { SpriteGalleryView } from "./center/SpriteGalleryView";
import { TilesetPipelineView } from "./center/TilesetPipelineView";
import { UiHudPipelineView } from "./center/UiHudPipelineView";
import { VfxItemsPipelineView } from "./center/VfxItemsPipelineView";
import { AudioSfxPipelineView } from "./center/AudioSfxPipelineView";
import { AudioMusicPipelineView } from "./center/AudioMusicPipelineView";
import { SceneBuilderView } from "./center/SceneBuilderView";
import { CanonView } from "./center/CanonView";
import { ArtCoverageView } from "./center/ArtCoverageView";
import { ImplementationView } from "./center/ImplementationView";
import type { PhaseDefinition } from "@/types/pipeline";
import { phaseLabel } from "@/types/pipeline";

export function CenterPanel({ phase }: { phase: PhaseDefinition }) {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useUiStore();
  const { currentProject, activePhase } = useProjectStore();

  useEffect(() => {
    if (!currentProject) return;
    openTab({
      id: `doc:${activePhase}`,
      kind: "document",
      title: `Etapa ${phaseLabel(phase)} — ${phase.title}`,
      payload: { phase: activePhase },
    });
  }, [currentProject?.id, activePhase]);

  const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <div className="h-full panel-shell flex flex-col">
      <div className="flex items-center gap-0.5 border-b border-border/60 bg-card/40 overflow-x-auto">
        {tabs.length === 0 && (
          <div className="panel-header">
            <span>Selecione uma etapa na barra lateral</span>
          </div>
        )}
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border/40 hover:bg-accent/40",
              active?.id === t.id && "bg-accent/60 text-foreground"
            )}
          >
            <span className="truncate max-w-[180px]">{t.title}</span>
            <span
              className="opacity-40 group-hover:opacity-100 hover:text-destructive rounded-sm p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {active ? <TabRenderer tabId={active.id} /> : null}
      </div>
    </div>
  );
}

function TabRenderer({ tabId }: { tabId: string }) {
  const tab = useUiStore((s) => s.tabs.find((t) => t.id === tabId));
  if (!tab) return null;

  switch (tab.kind) {
    case "document":
      return <DocumentView phase={Number(tab.payload?.phase)} />;
    case "mechanics-map":
      return <MechanicsMapView />;
    case "lore-tree":
      return <LoreTreeView />;
    case "quest-editor":
      return <QuestEditorView />;
    case "asset-preview":
      return <AssetPreviewView />;
    case "audio-preview":
      return <AudioPreviewView />;
    case "kb-explorer":
      return <KbExplorerView />;
    case "semantic-graph":
      return <SemanticGraphView />;
    case "settings":
      return <SettingsExportView />;
    case "batch-producer":
      return <BatchProducerView />;
    case "concept-pipeline":
      return <ConceptArtPipelineView />;
    case "character-sprites-pipeline":
      return <CharacterSpritePipelineView />;
    case "sprite-gallery":
      return <SpriteGalleryView />;
    case "tilesets-pipeline":
      return <TilesetPipelineView />;
    case "ui-hud-pipeline":
      return <UiHudPipelineView />;
    case "vfx-items-pipeline":
      return <VfxItemsPipelineView />;
    case "audio-sfx-pipeline":
      return <AudioSfxPipelineView />;
    case "audio-music-pipeline":
      return <AudioMusicPipelineView />;
    case "scene-builder":
      return <SceneBuilderView />;
    case "canon":
      return <CanonView />;
    case "art-coverage":
      return <ArtCoverageView />;
    case "implementation":
      return <ImplementationView />;
    default:
      return null;
  }
}
