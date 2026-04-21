import { AssetPhasePipelineView } from "./AssetPhasePipelineView";
import { uiHudPhase, type UiHudItem } from "@/lib/phases/uiHud";
import { packUiAtlas } from "@/lib/asepritePacker";
import { generateUiGodotResources } from "@/lib/godotResources";
import { Badge } from "@/components/ui/badge";

export function UiHudPipelineView() {
  return (
    <AssetPhasePipelineView<UiHudItem>
      title="F3 — UI / HUD / Ícones"
      subtitle="Ícones, botões, bars, skill icons em 16/32/64/128px com fundo transparente; empacotados em ui_atlas para Godot."
      phase={uiHudPhase}
      columns={[
        {
          key: "group",
          label: "Grupo",
          render: (it) => <Badge variant="outline">{it.group}</Badge>,
        },
        {
          key: "size",
          label: "Tamanho",
          render: (it) => <span>{it.size}px</span>,
        },
      ]}
      onPackAll={packUiAtlas}
      onGenerateGodot={generateUiGodotResources}
    />
  );
}
