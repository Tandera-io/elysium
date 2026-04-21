import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Music4, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { assetsRepo, documentsRepo } from "@/lib/db";
import { generateElevenLabs, type ElevenLabsKind } from "@/lib/apis/elevenlabs";
import type { GeneratedAsset } from "@/types/domain";
import { formatDate, truncate } from "@/lib/utils";

export function AudioPreviewView() {
  const { currentProject } = useProjectStore();
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<ElevenLabsKind>("sfx");
  const [duration, setDuration] = useState<number>(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioApproved, setAudioApproved] = useState<boolean>(false);

  async function refresh() {
    if (!currentProject) return;
    const all = await assetsRepo.listByProject(currentProject.id);
    setAssets(all.filter((a) => a.generator === "elevenlabs"));
    const docs = await documentsRepo.listByProject(currentProject.id);
    const audio = docs.find((d) => d.phase_number === 11);
    setAudioApproved(!!audio && audio.status === "approved");
  }

  useEffect(() => {
    refresh();
  }, [currentProject?.id]);

  async function doGenerate() {
    if (!currentProject) return;
    if (!audioApproved) {
      setError(
        "RN008: A Etapa 11 (Audio Direction) precisa estar aprovada antes de gerar áudio."
      );
      return;
    }
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await generateElevenLabs({
        projectId: currentProject.id,
        prompt: prompt.trim(),
        kind,
        durationSeconds: duration,
      });
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    await assetsRepo.setStatus(id, status);
    await refresh();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header">
        <Music4 className="h-3 w-3" />
        <span>Trilha sonora & SFX (ElevenLabs)</span>
        {!audioApproved && (
          <Badge variant="warning" className="ml-2">
            Etapa 11 não aprovada
          </Badge>
        )}
      </div>
      <div className="p-3 space-y-2 border-b border-border/60">
        <Textarea
          rows={2}
          placeholder="Prompt de áudio. Ex: 'melancholic piano motif, slow tempo, minor key, subtle reverb'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex items-center gap-2 text-xs">
          <label>Tipo:</label>
          <select
            className="bg-secondary rounded px-2 py-1 text-xs"
            value={kind}
            onChange={(e) => setKind(e.target.value as ElevenLabsKind)}
          >
            <option value="sfx">SFX</option>
            <option value="music">Música</option>
          </select>
          <label>Duração:</label>
          <input
            type="number"
            min={1}
            max={120}
            className="bg-secondary rounded px-2 py-1 text-xs w-16"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <span>seg</span>
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-7"
            variant="glow"
            onClick={doGenerate}
            disabled={busy || !prompt.trim() || !audioApproved}
          >
            <Sparkles className="h-3 w-3" />
            {busy ? "Gerando…" : "Gerar"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {assets.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">
              Nenhum áudio gerado ainda.
            </p>
          )}
          {assets.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-border/60 bg-card/40 p-2 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {a.asset_type === "music" ? "música" : "sfx"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(a.created_at)}
                  </span>
                </div>
                <p className="text-xs mt-1 truncate" title={a.prompt}>
                  {truncate(a.prompt, 140)}
                </p>
                <audio
                  controls
                  src={convertFileSrc(a.file_path)}
                  className="mt-1 w-full h-8"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setStatus(a.id, "approved")}
                >
                  <Check className="h-3 w-3 text-emerald-400" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setStatus(a.id, "rejected")}
                >
                  <X className="h-3 w-3 text-destructive" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setPrompt(a.prompt)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
