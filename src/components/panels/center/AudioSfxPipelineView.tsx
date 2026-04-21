import { AssetPhasePipelineView } from "./AssetPhasePipelineView";
import { audioSfxPhase, type AudioSfxItem } from "@/lib/phases/audioSfx";
import { Badge } from "@/components/ui/badge";

export function AudioSfxPipelineView() {
  return (
    <AssetPhasePipelineView<AudioSfxItem>
      title="F5 — Audio SFX"
      subtitle="Sons curtos (combat, UI, footsteps, magic) gerados via ElevenLabs /sound-generation, 0.3–3s."
      phase={audioSfxPhase}
      previewKind="audio"
      columns={[
        {
          key: "category",
          label: "Categoria",
          render: (it) => <Badge variant="outline">{it.category}</Badge>,
        },
        {
          key: "durationSeconds",
          label: "Duração",
          render: (it) => <span>{it.durationSeconds.toFixed(1)}s</span>,
        },
      ]}
    />
  );
}
