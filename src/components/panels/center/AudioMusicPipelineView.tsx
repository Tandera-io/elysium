import { AssetPhasePipelineView } from "./AssetPhasePipelineView";
import { audioMusicPhase, type AudioMusicItem } from "@/lib/phases/audioMusic";
import { Badge } from "@/components/ui/badge";

export function AudioMusicPipelineView() {
  return (
    <AssetPhasePipelineView<AudioMusicItem>
      title="F6 — Audio Music"
      subtitle="Trilhas (main theme, biome loops, boss fights) em 15–60s via ElevenLabs /music."
      phase={audioMusicPhase}
      previewKind="audio"
      columns={[
        {
          key: "context",
          label: "Contexto",
          render: (it) => <Badge variant="outline">{it.context}</Badge>,
        },
        {
          key: "biome",
          label: "Bioma",
          render: (it) => <span>{it.biome ?? "—"}</span>,
        },
        {
          key: "durationSeconds",
          label: "Duração",
          render: (it) => <span>{it.durationSeconds}s</span>,
        },
      ]}
    />
  );
}
