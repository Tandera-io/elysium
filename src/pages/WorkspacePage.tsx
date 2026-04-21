import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { SidebarPanel } from "@/components/panels/SidebarPanel";
import { CenterPanel } from "@/components/panels/CenterPanel";
import { AgentPanel } from "@/components/panels/AgentPanel";
import { PipelinePanel } from "@/components/panels/PipelinePanel";
import { getPhase } from "@/types/pipeline";

export default function WorkspacePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    loadProject,
    currentProject,
    activePhase,
  } = useProjectStore();
  const ui = useUiStore();

  useEffect(() => {
    if (!projectId) return;
    loadProject(projectId).catch(() => {
      navigate("/");
    });
  }, [projectId]);

  const phase = useMemo(() => {
    try {
      return getPhase(activePhase);
    } catch {
      return getPhase(1);
    }
  }, [activePhase]);

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Carregando projeto…
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <PanelGroup direction="vertical" className="flex-1 min-h-0">
        <Panel defaultSize={100 - ui.bottomHeight} minSize={40}>
          <PanelGroup direction="horizontal">
            <Panel
              defaultSize={ui.leftWidth}
              minSize={12}
              maxSize={35}
              onResize={(n) => ui.setLeftWidth(n)}
            >
              <SidebarPanel />
            </Panel>
            <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-primary/30 transition-colors" />
            <Panel minSize={30}>
              <CenterPanel phase={phase} />
            </Panel>
            <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-primary/30 transition-colors" />
            <Panel
              defaultSize={ui.rightWidth}
              minSize={22}
              maxSize={55}
              onResize={(n) => ui.setRightWidth(n)}
            >
              <AgentPanel phase={phase} />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="h-[3px] bg-transparent hover:bg-primary/30 transition-colors" />
        <Panel
          defaultSize={ui.bottomHeight}
          minSize={8}
          maxSize={40}
          onResize={(n) => ui.setBottomHeight(n)}
        >
          <PipelinePanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
