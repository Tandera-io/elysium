// Serializador de .tscn (formato texto Godot 4). A Scene Builder (F9) produz
// uma estrutura JSON; este módulo converte em texto válido para ser gravado
// via write_tscn_scene.
//
// Tipos de cena suportados inicialmente (templates mínimos):
//   - "player"  → CharacterBody2D + AnimatedSprite2D + CollisionShape2D
//   - "enemy"   → CharacterBody2D + AnimatedSprite2D + CollisionShape2D
//   - "npc"     → StaticBody2D + AnimatedSprite2D
//   - "level"   → Node2D + TileMap
//   - "hud"     → CanvasLayer + Control + child panels
//   - "world"   → Node2D com instâncias das outras cenas
//
// Cada campo sprite_ref/tileset_ref/atlas_ref aponta para um .tres gerado
// por F8 (path relativo a res://). A idéia é que Claude Code refine os
// scripts C# depois — este gerador só monta o esqueleto.

export interface SceneNodeSpec {
  type: string;
  sprite_ref?: string;
  tileset_ref?: string;
  atlas_ref?: string;
  script?: string;
  position?: { x: number; y: number };
  children?: SceneNodeSpec[];
  properties?: Record<string, string | number | boolean>;
  name?: string;
}

export interface SceneSpec {
  type:
    | "player"
    | "enemy"
    | "npc"
    | "boss"
    | "level"
    | "hud"
    | "world"
    | "menu"
    | "cutscene";
  name: string;
  path: string;
  sprite_ref?: string;
  tileset_ref?: string;
  atlas_ref?: string;
  script?: string;
  spawn_points?: { name: string; x: number; y: number }[];
  children?: string[]; // referências a nomes de outras scenes (world)
  nodes?: SceneNodeSpec[];
}

interface ExtResource {
  id: string;
  type: string;
  path: string;
}

function collectExtResources(scene: SceneSpec): ExtResource[] {
  const out: ExtResource[] = [];
  const add = (
    type: string,
    path: string | undefined,
    id: string
  ): void => {
    if (!path) return;
    if (out.find((r) => r.path === path)) return;
    out.push({ id, type, path: path.startsWith("res://") ? path : `res://${path}` });
  };
  if (scene.sprite_ref) add("SpriteFrames", scene.sprite_ref, "1_sprite");
  if (scene.tileset_ref) add("TileSet", scene.tileset_ref, "1_tileset");
  if (scene.atlas_ref) add("Texture2D", scene.atlas_ref, "1_atlas");
  if (scene.script) add("Script", scene.script, "1_script");
  return out;
}

function formatExtResources(ext: ExtResource[]): string {
  return ext
    .map(
      (r) =>
        `[ext_resource type="${r.type}" path="${r.path}" id="${r.id}"]`
    )
    .join("\n");
}

function renderPlayer(scene: SceneSpec): string {
  const ext = collectExtResources(scene);
  const loadSteps = ext.length + 2; // + CapsuleShape subresource
  let s = `[gd_scene load_steps=${loadSteps} format=3]\n\n`;
  if (ext.length) s += formatExtResources(ext) + "\n\n";
  s += `[sub_resource type="CapsuleShape2D" id="shape_0"]\nradius = 8.0\nheight = 24.0\n\n`;
  s += `[node name="${scene.name}" type="CharacterBody2D"]\n`;
  if (scene.script)
    s += `script = ExtResource("1_script")\n`;
  s += `\n`;
  s += `[node name="AnimatedSprite2D" type="AnimatedSprite2D" parent="."]\n`;
  if (scene.sprite_ref)
    s += `sprite_frames = ExtResource("1_sprite")\nautoplay = "idle"\n`;
  s += `\n`;
  s += `[node name="CollisionShape2D" type="CollisionShape2D" parent="."]\nshape = SubResource("shape_0")\n`;
  return s;
}

function renderEnemy(scene: SceneSpec): string {
  // Estrutura idêntica ao player; diferença é apenas no script/nome.
  return renderPlayer(scene);
}

function renderNpc(scene: SceneSpec): string {
  const ext = collectExtResources(scene);
  let s = `[gd_scene load_steps=${ext.length + 1} format=3]\n\n`;
  if (ext.length) s += formatExtResources(ext) + "\n\n";
  s += `[node name="${scene.name}" type="StaticBody2D"]\n`;
  if (scene.script) s += `script = ExtResource("1_script")\n`;
  s += `\n[node name="AnimatedSprite2D" type="AnimatedSprite2D" parent="."]\n`;
  if (scene.sprite_ref)
    s += `sprite_frames = ExtResource("1_sprite")\nautoplay = "idle"\n`;
  return s;
}

function renderLevel(scene: SceneSpec): string {
  const ext = collectExtResources(scene);
  let s = `[gd_scene load_steps=${ext.length + 1} format=3]\n\n`;
  if (ext.length) s += formatExtResources(ext) + "\n\n";
  s += `[node name="${scene.name}" type="Node2D"]\n`;
  if (scene.script) s += `script = ExtResource("1_script")\n`;
  s += `\n[node name="TileMap" type="TileMap" parent="."]\n`;
  if (scene.tileset_ref) s += `tile_set = ExtResource("1_tileset")\n`;
  s += `format = 2\n`;
  if (scene.spawn_points?.length) {
    s += `\n[node name="SpawnPoints" type="Node2D" parent="."]\n`;
    for (const sp of scene.spawn_points) {
      s += `\n[node name="${sp.name}" type="Marker2D" parent="SpawnPoints"]\nposition = Vector2(${sp.x}, ${sp.y})\n`;
    }
  }
  return s;
}

function renderHud(scene: SceneSpec): string {
  const ext = collectExtResources(scene);
  let s = `[gd_scene load_steps=${ext.length + 1} format=3]\n\n`;
  if (ext.length) s += formatExtResources(ext) + "\n\n";
  s += `[node name="${scene.name}" type="CanvasLayer"]\n`;
  if (scene.script) s += `script = ExtResource("1_script")\n`;
  s += `\n[node name="Root" type="Control" parent="."]\nanchors_preset = 15\n`;
  s += `\n[node name="HPBar" type="ProgressBar" parent="Root"]\noffset_left = 16\noffset_top = 16\noffset_right = 180\noffset_bottom = 32\nmax_value = 100\nvalue = 100\n`;
  s += `\n[node name="ManaBar" type="ProgressBar" parent="Root"]\noffset_left = 16\noffset_top = 40\noffset_right = 180\noffset_bottom = 56\nmax_value = 100\nvalue = 100\n`;
  return s;
}

function renderWorld(scene: SceneSpec, allScenes: SceneSpec[]): string {
  const children = (scene.children ?? [])
    .map((n) => allScenes.find((s) => s.name === n))
    .filter((s): s is SceneSpec => !!s);
  const ext: ExtResource[] = children.map((c, i) => ({
    id: `scene_${i + 1}`,
    type: "PackedScene",
    path: c.path.startsWith("res://") ? c.path : `res://${c.path}`,
  }));
  let s = `[gd_scene load_steps=${ext.length + 1} format=3]\n\n`;
  s += ext
    .map(
      (r) =>
        `[ext_resource type="${r.type}" path="${r.path}" id="${r.id}"]`
    )
    .join("\n");
  if (ext.length) s += "\n\n";
  s += `[node name="${scene.name}" type="Node2D"]\n`;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    s += `\n[node name="${c.name}" parent="." instance=ExtResource("scene_${i + 1}")]\n`;
  }
  return s;
}

export function renderScene(
  scene: SceneSpec,
  allScenes: SceneSpec[]
): string {
  switch (scene.type) {
    case "player":
      return renderPlayer(scene);
    case "enemy":
    case "boss":
      return renderEnemy(scene);
    case "npc":
      return renderNpc(scene);
    case "level":
      return renderLevel(scene);
    case "hud":
    case "menu":
      return renderHud(scene);
    case "world":
    case "cutscene":
      return renderWorld(scene, allScenes);
    default:
      return renderPlayer(scene);
  }
}
