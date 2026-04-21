import { AssetPhasePipelineView } from "./AssetPhasePipelineView";
import { vfxItemsPhase, type VfxItem } from "@/lib/phases/vfxItems";
import { Badge } from "@/components/ui/badge";

export function VfxItemsPipelineView() {
  return (
    <AssetPhasePipelineView<VfxItem>
      title="F4 — VFX & Itens"
      subtitle="Armas, consumíveis, itens de inventário e partículas VFX com fundo transparente."
      phase={vfxItemsPhase}
      columns={[
        {
          key: "kind",
          label: "Tipo",
          render: (it) => <Badge variant="outline">{it.kind}</Badge>,
        },
        {
          key: "size",
          label: "Tamanho",
          render: (it) => <span>{it.size}px</span>,
        },
      ]}
    />
  );
}
