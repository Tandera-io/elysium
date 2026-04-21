import { AssetPhasePipelineView } from "./AssetPhasePipelineView";
import { tilesetPhase, type TilesetItem } from "@/lib/phases/tilesets";
import { packTilesets } from "@/lib/asepritePacker";
import { generateTilesetGodotResources } from "@/lib/godotResources";
import { Badge } from "@/components/ui/badge";

export function TilesetPipelineView() {
  return (
    <AssetPhasePipelineView<TilesetItem>
      title="F2 — Tilesets por bioma"
      subtitle="Tiles seamless (floor, wall, decoration) agrupados por bioma; saída pode ser empacotada em atlas Godot TileSet."
      phase={tilesetPhase}
      columns={[
        {
          key: "biome",
          label: "Bioma",
          render: (it) => <Badge variant="outline">{it.biome}</Badge>,
        },
        {
          key: "tileKind",
          label: "Tipo",
          render: (it) => <span>{it.tileKind}</span>,
        },
        {
          key: "size",
          label: "Tamanho",
          render: (it) => <span>{it.size}px</span>,
        },
      ]}
      onPackAll={packTilesets}
      onGenerateGodot={generateTilesetGodotResources}
    />
  );
}
