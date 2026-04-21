// Registry de templates de prompt versionados usados pelos planners das
// sub-fases de produção de assets. Manter TODOS os prompts aqui garante
// consistência estilística entre gerações e facilita iteração — basta
// mudar o texto num lugar para afetar todos os assets regerados.
//
// Versão: v1 (2026-04)

export { CHARACTER_SPRITE_PROMPT } from "./character_sprite";
export { TILESET_TILE_PROMPT } from "./tileset_tile";
export { UI_ICON_PROMPT } from "./ui_icon";
export { VFX_ITEM_PROMPT } from "./vfx_item";
export { AUDIO_SFX_PROMPT } from "./audio_sfx";
export { AUDIO_MUSIC_PROMPT } from "./audio_music";

/**
 * Substituição de placeholders simples tipo {name}, {action}, {biome}.
 */
export function applyTemplate(
  template: string,
  replacements: Record<string, string | number>
): string {
  let out = template;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}
