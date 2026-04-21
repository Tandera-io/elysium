import { useEffect, useState } from "react";
import {
  Download,
  Settings2,
  Save,
  FolderOpen,
  Palette,
  CheckCircle2,
  XCircle,
  CloudUpload,
  Loader2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { settingsRepo } from "@/lib/db";
import { invalidateKeyCache } from "@/lib/apis/env";
import { exportProjectMarkdown, exportProjectJson } from "@/lib/export";
import {
  getBackupWorkspaceRoot,
  setBackupWorkspaceRoot,
  isBackupEnabled,
  setBackupEnabled,
  syncAppDataToBackup,
  commitAndPushBackup,
} from "@/lib/backup";

interface Keys {
  pixellab_api_key: string;
  elevenlabs_api_key: string;
  openai_api_key: string;
  aseprite_path: string;
}

export function SettingsExportView() {
  const { currentProject } = useProjectStore();
  const [keys, setKeys] = useState<Keys>({
    pixellab_api_key: "",
    elevenlabs_api_key: "",
    openai_api_key: "",
    aseprite_path: "",
  });
  const [saved, setSaved] = useState(false);
  const [projectsDir, setProjectsDir] = useState("");
  const [asepriteStatus, setAsepriteStatus] = useState<
    { kind: "idle" } | { kind: "testing" } | { kind: "ok"; version: string } | { kind: "err"; message: string }
  >({ kind: "idle" });

  // Backup
  const [backupWorkspace, setBackupWorkspace] = useState("");
  const [backupEnabled, setBackupEnabledLocal] = useState(false);
  const [backupStatus, setBackupStatus] = useState<
    | { kind: "idle" }
    | { kind: "running" }
    | { kind: "ok"; message: string }
    | { kind: "err"; message: string }
  >({ kind: "idle" });
  const [backupSaved, setBackupSaved] = useState(false);

  useEffect(() => {
    settingsRepo.all().then((all) => {
      setKeys({
        pixellab_api_key: all.pixellab_api_key ?? "",
        elevenlabs_api_key: all.elevenlabs_api_key ?? "",
        openai_api_key: all.openai_api_key ?? "",
        aseprite_path: all.aseprite_path ?? "",
      });
    });
    invoke<string>("get_projects_dir").then(setProjectsDir).catch(() => {});
    getBackupWorkspaceRoot().then((v) => setBackupWorkspace(v ?? ""));
    isBackupEnabled().then(setBackupEnabledLocal);
  }, []);

  async function saveBackupConfig() {
    await setBackupWorkspaceRoot(backupWorkspace);
    await setBackupEnabled(backupEnabled);
    setBackupSaved(true);
    setTimeout(() => setBackupSaved(false), 2000);
  }

  async function runBackupNow() {
    if (!backupWorkspace.trim()) {
      setBackupStatus({
        kind: "err",
        message: "Configure o workspace root antes.",
      });
      return;
    }
    setBackupStatus({ kind: "running" });
    try {
      // Grava workspace/enabled ANTES do backup pra que syncAppDataToBackup
      // consiga ler do settings (fonte de verdade).
      await setBackupWorkspaceRoot(backupWorkspace);
      const report = await syncAppDataToBackup(currentProject?.id ?? null);
      const push = await commitAndPushBackup(
        `manual snapshot · ${report.files_copied} arquivos (${Math.round(
          report.bytes_copied / 1024
        )} KB)`
      );
      setBackupStatus({
        kind: "ok",
        message: `${push.message}\nArquivos: ${report.files_copied} · ${Math.round(
          report.bytes_copied / 1024
        )} KB · voláteis ignorados: ${report.skipped_volatile}`,
      });
    } catch (e: any) {
      setBackupStatus({
        kind: "err",
        message: e?.message ?? String(e),
      });
    }
  }

  async function save() {
    for (const [k, v] of Object.entries(keys)) {
      await settingsRepo.set(k, v);
    }
    invalidateKeyCache();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testAseprite() {
    setAsepriteStatus({ kind: "testing" });
    try {
      const version = await invoke<string>("aseprite_check_installed", {
        path: keys.aseprite_path || null,
      });
      setAsepriteStatus({ kind: "ok", version });
    } catch (e) {
      setAsepriteStatus({
        kind: "err",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function doExportMd() {
    if (!currentProject) return;
    const path = await exportProjectMarkdown(
      currentProject.id,
      currentProject.name
    );
    alert(`GDD exportado em:\n${path}`);
  }

  async function doExportJson() {
    if (!currentProject) return;
    const path = await exportProjectJson(currentProject.id, currentProject.name);
    alert(`JSON exportado em:\n${path}`);
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar GDD
          </h2>
          <p className="text-xs text-muted-foreground">
            Gera um único arquivo consolidado com todas as etapas aprovadas do
            projeto atual.
          </p>
          <div className="flex gap-2">
            <Button onClick={doExportMd} disabled={!currentProject}>
              <Download className="h-3 w-3" /> Markdown
            </Button>
            <Button
              onClick={doExportJson}
              disabled={!currentProject}
              variant="outline"
            >
              <Download className="h-3 w-3" /> JSON
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Chaves de API
          </h2>
          <p className="text-xs text-muted-foreground">
            As chaves são armazenadas localmente no SQLite. Também é possível
            configurar via variáveis <code>VITE_*</code> no{" "}
            <code>.env</code>.
          </p>
          <div className="space-y-2">
            {(
              [
                [
                  "pixellab_api_key",
                  "PIXELLAB_API_KEY",
                  "Pixellab (concept arts / sprites)",
                ],
                [
                  "elevenlabs_api_key",
                  "ELEVENLABS_API_KEY",
                  "ElevenLabs (música / SFX)",
                ],
                [
                  "openai_api_key",
                  "OPENAI_API_KEY",
                  "OpenAI (opcional — fallback de LLM; os agentes usam Claude Code CLI por padrão)",
                ],
              ] as const
            ).map(([k, label, hint]) => (
              <label key={k} className="block space-y-1">
                <span className="text-xs font-medium flex items-center gap-2">
                  {label} <Badge variant="outline">{hint}</Badge>
                </span>
                <Input
                  type="password"
                  value={keys[k]}
                  onChange={(e) => setKeys({ ...keys, [k]: e.target.value })}
                  placeholder="cole a chave aqui"
                />
              </label>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={save}>
                <Save className="h-3 w-3" /> Salvar
              </Button>
              {saved && (
                <Badge variant="success">Salvo</Badge>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" /> Aseprite (integração local)
          </h2>
          <p className="text-xs text-muted-foreground">
            Usado para empacotar spritesheets, fatiar animações e extrair
            paletas. Default do instalador Windows:{" "}
            <code>C:\Program Files\Aseprite\Aseprite.exe</code>. Deixe em branco
            para auto-detectar.
          </p>
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium">Caminho do executável</span>
              <Input
                value={keys.aseprite_path}
                onChange={(e) =>
                  setKeys({ ...keys, aseprite_path: e.target.value })
                }
                placeholder="C:\Program Files\Aseprite\Aseprite.exe"
              />
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={testAseprite}
                disabled={asepriteStatus.kind === "testing"}
              >
                {asepriteStatus.kind === "testing"
                  ? "Testando..."
                  : "Testar Aseprite"}
              </Button>
              {asepriteStatus.kind === "ok" && (
                <Badge
                  variant="success"
                  className="flex items-center gap-1 max-w-md"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="truncate">{asepriteStatus.version}</span>
                </Badge>
              )}
              {asepriteStatus.kind === "err" && (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1 max-w-md"
                >
                  <XCircle className="h-3 w-3" />
                  <span className="truncate">{asepriteStatus.message}</span>
                </Badge>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Diretório de projetos
          </h2>
          <div className="rounded border border-border/60 p-3 bg-card/40">
            <code className="text-xs break-all text-muted-foreground">
              {projectsDir || "—"}
            </code>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada projeto vive em uma subpasta com <code>assets/</code>,{" "}
            <code>exports/</code>, <code>docs/</code> e{" "}
            <code>kb.json</code> (índice vetorial).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CloudUpload className="h-4 w-4" /> Backup no GitHub
          </h2>
          <p className="text-xs text-muted-foreground">
            Espelha o banco (<code>elysium.db</code>), a pasta do projeto
            atual e os <code>exports/</code> para{" "}
            <code>&lt;workspace&gt;/backup/</code>. Depois faz{" "}
            <code>git add</code>/<code>commit</code>/<code>push</code> no
            workspace (que precisa ser um repo git com LFS — rode{" "}
            <code>scripts/init-backup-repo.ps1</code> primeiro).
          </p>
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium">
                Workspace root (onde está o repo git de backup)
              </span>
              <Input
                value={backupWorkspace}
                onChange={(e) => setBackupWorkspace(e.target.value)}
                placeholder="D:\\Indie Game Vibe Dev"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={backupEnabled}
                onChange={(e) => setBackupEnabledLocal(e.target.checked)}
              />
              Rodar backup automático após aprovar cada etapa
            </label>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={saveBackupConfig}>
                <Save className="h-3 w-3" /> Salvar config
              </Button>
              <Button
                size="sm"
                onClick={runBackupNow}
                disabled={backupStatus.kind === "running"}
              >
                {backupStatus.kind === "running" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CloudUpload className="h-3 w-3" />
                )}{" "}
                Backup agora
              </Button>
              {backupSaved && <Badge variant="success">Salvo</Badge>}
            </div>
            {backupStatus.kind === "ok" && (
              <div className="rounded border border-green-500/40 bg-green-500/10 p-2 text-[11px] text-green-200 whitespace-pre-wrap">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                {backupStatus.message}
              </div>
            )}
            {backupStatus.kind === "err" && (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive whitespace-pre-wrap">
                <XCircle className="h-3 w-3 inline mr-1" />
                {backupStatus.message}
              </div>
            )}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
