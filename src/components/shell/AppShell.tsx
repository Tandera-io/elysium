import { PropsWithChildren, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, Home as HomeIcon, Settings2, Activity } from "lucide-react";
import { Button } from "../ui/button";
import { isClaudeInstalled } from "@/lib/claude";
import { isTauri } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

export function AppShell({ children }: PropsWithChildren) {
  const [claudeOk, setClaudeOk] = useState<null | boolean>(null);
  const [claudeVersion, setClaudeVersion] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  const openTab = useUiStore((s) => s.openTab);
  const inProject = location.pathname !== "/";

  function openSettings() {
    if (!inProject) return;
    openTab({
      id: "panel:settings",
      kind: "settings",
      title: "Configurações & Export",
    });
  }

  useEffect(() => {
    if (!isTauri()) {
      setClaudeOk(false);
      return;
    }
    isClaudeInstalled().then((res) => {
      setClaudeOk(res.ok);
      setClaudeVersion(res.version ?? "");
    });
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <header className="h-11 shrink-0 flex items-center gap-3 px-3 border-b border-border/60 bg-card/40 backdrop-blur-sm">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80"
        >
          <span className="relative flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-elysium-glow text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span>
            Elysium <span className="text-muted-foreground">Build Platform</span>
          </span>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <ClaudeBadge ok={claudeOk} version={claudeVersion} />
          {inProject && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => navigate("/")}
            >
              <HomeIcon className="h-3.5 w-3.5 mr-1" />
              Projetos
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={
              inProject
                ? "Configurações & Export (API keys, Aseprite, GDD)"
                : "Abra um projeto para acessar as configurações"
            }
            disabled={!inProject}
            onClick={openSettings}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function ClaudeBadge({
  ok,
  version,
}: {
  ok: boolean | null;
  version: string;
}) {
  if (ok === null)
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Activity className="h-3 w-3 animate-spin" /> verificando claude…
      </span>
    );
  if (!ok)
    return (
      <span
        className="text-xs text-destructive flex items-center gap-1"
        title="Claude Code CLI não disponível. Instale com `npm i -g @anthropic-ai/claude-code` e faça login executando `claude` uma vez."
      >
        <span className="h-2 w-2 rounded-full bg-destructive" /> claude offline
      </span>
    );
  return (
    <span
      className="text-xs text-emerald-400/90 flex items-center gap-1"
      title={`Claude CLI ${version}`}
    >
      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-glow" />
      claude{version ? ` ${version.split(" ")[0]}` : ""}
    </span>
  );
}
