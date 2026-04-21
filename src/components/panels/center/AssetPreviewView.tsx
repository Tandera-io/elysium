import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Image as ImageIcon, Sparkles, Check, X, RefreshCw, Wand2 } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { assetsRepo, documentsRepo, kbRepo } from "@/lib/db";
import { generatePixellab, type PixellabSize } from "@/lib/apis/pixellab";
import { ingestAsset, removeAssetFromKb } from "@/lib/kb";
import type { GeneratedAsset } from "@/types/domain";
import { formatDate, truncate } from "@/lib/utils";

export function AssetPreviewView() {
  const { currentProject } = useProjectStore();
  const openTab = useUiStore((s) => s.openTab);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<PixellabSize>(128);
  const [kind, setKind] = useState<"sprite" | "tile" | "concept_art">(
    "concept_art"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artApproved, setArtApproved] = useState<boolean>(false);

  async function refresh() {
    if (!currentProject) return;
    const all = await assetsRepo.listByProject(currentProject.id);
    const pixellabAssets = all.filter((a) => a.generator === "pixellab");
    setAssets(pixellabAssets);
    // Checa RN007: precisa da Etapa 9 aprovada para gerar concept arts.
    const docs = await documentsRepo.listByProject(currentProject.id);
    const art = docs.find((d) => d.phase_number === 9);
    setArtApproved(!!art && art.status === "approved");

    // Backfill: assets aprovados que ainda não estão no KB são ingeridos
    // em background (não bloqueia a UI).
    void backfillKb(currentProject.id, pixellabAssets);
  }

  useEffect(() => {
    refresh();
  }, [currentProject?.id]);

  async function doGenerate() {
    if (!currentProject) return;
    if (!artApproved) {
      setError(
        "RN007: A Etapa 9 (Art Direction) precisa estar aprovada antes de gerar concept arts."
      );
      return;
    }
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await generatePixellab({
        projectId: currentProject.id,
        prompt: prompt.trim(),
        size,
        assetType: kind,
      });
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(
    id: string,
    status: "approved" | "rejected"
  ): Promise<void> {
    await assetsRepo.setStatus(id, status);
    if (currentProject) {
      const asset = assets.find((a) => a.id === id);
      if (asset) {
        try {
          if (status === "approved") {
            await ingestAsset({
              projectId: currentProject.id,
              assetId: asset.id,
              assetPath: asset.file_path,
              assetType: asset.asset_type as
                | "concept_art"
                | "sprite"
                | "tile",
              prompt: asset.prompt,
              phaseNumber:
                asset.asset_type === "concept_art"
                  ? 10
                  : asset.asset_type === "sprite"
                    ? 12
                    : undefined,
              metadata: safeParseMetadata(asset.generation_metadata),
            });
          } else {
            await removeAssetFromKb(currentProject.id, asset.id);
          }
          try {
            window.dispatchEvent(
              new CustomEvent("kb-updated", {
                detail: { projectId: currentProject.id },
              })
            );
          } catch {
            // ambientes sem window — ignora
          }
        } catch (e) {
          console.warn("[kb] falha ao sincronizar asset no KB", e);
        }
      }
    }
    await refresh();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header gap-2">
        <ImageIcon className="h-3 w-3" />
        <span>Concept Arts & Sprites (Pixellab)</span>
        {!artApproved && (
          <Badge variant="warning" className="ml-2">
            Etapa 9 não aprovada
          </Badge>
        )}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="h-6"
          onClick={() =>
            openTab({
              id: "panel:concept-pipeline",
              kind: "concept-pipeline",
              title: "Pipeline de Concept Arts",
            })
          }
          title="Abrir o planejador automático de concept arts"
        >
          <Wand2 className="h-3 w-3" />
          Planejar com IA
        </Button>
      </div>
      <div className="p-3 space-y-2 border-b border-border/60">
        <Textarea
          rows={2}
          placeholder="Prompt para Pixellab… ex: 'lonely knight standing at the edge of a misty cliff, moody purple palette, pixel art'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex items-center gap-2 text-xs">
          <label>Tipo:</label>
          <select
            className="bg-secondary rounded px-2 py-1 text-xs"
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
          >
            <option value="concept_art">Concept Art</option>
            <option value="sprite">Sprite</option>
            <option value="tile">Tile</option>
          </select>
          <label>Tamanho:</label>
          <select
            className="bg-secondary rounded px-2 py-1 text-xs"
            value={size}
            onChange={(e) => setSize(Number(e.target.value) as PixellabSize)}
          >
            {[64, 96, 128, 192, 256].map((n) => (
              <option key={n} value={n}>
                {n}x{n}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-7"
            variant="glow"
            onClick={doGenerate}
            disabled={busy || !prompt.trim() || !artApproved}
          >
            <Sparkles className="h-3 w-3" />
            {busy ? "Gerando…" : "Gerar"}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {assets.length === 0 && (
            <p className="col-span-full text-center text-xs text-muted-foreground py-12">
              Nenhum asset gerado ainda.
            </p>
          )}
          {assets.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-border/60 bg-card/40 overflow-hidden"
            >
              <div className="bg-black/40 aspect-square flex items-center justify-center overflow-hidden relative">
                <img
                  src={convertFileSrc(a.file_path)}
                  alt={a.file_name}
                  className="w-full h-full object-contain image-rendering-pixel"
                  style={{ imageRendering: "pixelated" }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    const fallback = img.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div
                  className="absolute inset-0 hidden flex-col items-center justify-center gap-1 p-2 text-center"
                  style={{ display: "none" }}
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-3">
                    {truncate(a.prompt, 60)}
                  </p>
                  <p className="text-[9px] text-destructive/80">
                    imagem indisponível
                  </p>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <div className="flex items-center gap-1">
                  <StatusPill status={a.status} />
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(a.created_at)}
                  </span>
                </div>
                <p className="text-[11px] leading-snug" title={a.prompt}>
                  {truncate(a.prompt, 90)}
                </p>
                <div className="flex gap-1 pt-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Aprovar"
                    onClick={() => setStatus(a.id, "approved")}
                  >
                    <Check className="h-3 w-3 text-emerald-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Rejeitar"
                    onClick={() => setStatus(a.id, "rejected")}
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Regenerar variação"
                    onClick={() => {
                      setPrompt(a.prompt);
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function safeParseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function backfillKb(
  projectId: string,
  assets: GeneratedAsset[]
): Promise<void> {
  const approved = assets.filter((a) => a.status === "approved");
  if (approved.length === 0) return;
  try {
    const kbEntries = await kbRepo.listByProject(projectId);
    const alreadyIngested = new Set<string>();
    for (const e of kbEntries) {
      try {
        const meta = e.metadata ? JSON.parse(e.metadata as any) : null;
        if (meta?.asset_id) alreadyIngested.add(String(meta.asset_id));
      } catch {
        // ignora
      }
    }
    for (const asset of approved) {
      if (alreadyIngested.has(asset.id)) continue;
      try {
        await ingestAsset({
          projectId,
          assetId: asset.id,
          assetPath: asset.file_path,
          assetType: asset.asset_type as "concept_art" | "sprite" | "tile",
          prompt: asset.prompt,
          phaseNumber:
            asset.asset_type === "concept_art"
              ? 10
              : asset.asset_type === "sprite"
                ? 12
                : undefined,
          metadata: safeParseMetadata(asset.generation_metadata),
        });
      } catch (e) {
        console.warn("[kb] backfill falhou para asset", asset.id, e);
      }
    }
  } catch (e) {
    console.warn("[kb] backfill abortado", e);
  }
}

function StatusPill({ status }: { status: GeneratedAsset["status"] }) {
  const map: Record<GeneratedAsset["status"], { label: string; variant: any }> =
    {
      pending: { label: "pendente", variant: "outline" },
      generated: { label: "gerado", variant: "secondary" },
      approved: { label: "aprovado", variant: "success" },
      rejected: { label: "rejeitado", variant: "destructive" },
      archived: { label: "arquivado", variant: "outline" },
    };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
