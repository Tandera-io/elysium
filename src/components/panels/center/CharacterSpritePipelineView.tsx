import { AssetPhasePipelineView } from "./AssetPhasePipelineView";
import {
  characterSpritePhase,
  type CharacterSpriteItem,
} from "@/lib/phases/characterSprites";
import { packCharacterSheets } from "@/lib/asepritePacker";
import { generateCharacterGodotResources } from "@/lib/godotResources";
import { Badge } from "@/components/ui/badge";

export function CharacterSpritePipelineView() {
  return (
    <AssetPhasePipelineView<CharacterSpriteItem>
      title="F1 — Character Sprites"
      subtitle="Pipeline híbrido Pixellab: portrait + animate-with-skeleton (idle/walk) + frames individuais para ações customizadas."
      phase={characterSpritePhase}
      columns={[
        {
          key: "role",
          label: "Papel",
          render: (it) => <Badge variant="outline">{it.role}</Badge>,
        },
        {
          key: "size",
          label: "Tamanho",
          render: (it) => <span>{it.size}px</span>,
        },
        {
          key: "animations",
          label: "Animações",
          render: (it) => (
            <span className="text-[10px] text-muted-foreground">
              {it.animations.map((a) => `${a.action}/${a.frames}f`).join(", ")}
            </span>
          ),
        },
      ]}
      onPackAll={packCharacterSheets}
      onGenerateGodot={generateCharacterGodotResources}
    />
  );
}
