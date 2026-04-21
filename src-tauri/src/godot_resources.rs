//! Gerador de recursos Godot 4 em formato texto: `.tres` (SpriteFrames,
//! AtlasTexture, TileSet) e `.tscn` (cenas). O formato é text-based e bem
//! documentado; montamos manualmente em Rust para não depender do Godot
//! headless neste passo.

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

fn game_dir(app: &AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(base.join("projects").join(project_id).join("game"))
}

fn write_file(path: &PathBuf, content: &str) -> Result<String, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir: {e}"))?;
    }
    fs::write(path, content).map_err(|e| format!("write: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// SpriteFrames (.tres) — animações Godot 4 a partir de atlas.json do Aseprite
// ---------------------------------------------------------------------------

#[derive(Deserialize, Debug)]
pub struct SpriteFramesArgs {
    pub project_id: String,
    /// Path relativo DENTRO de game/ ex: "assets/generated/knight_atlas.png"
    pub atlas_png_rel: String,
    /// Path relativo DENTRO de game/ ex: "assets/generated/knight_frames.tres"
    pub out_tres_rel: String,
    pub frame_w: u32,
    pub frame_h: u32,
    /// Cada animação: nome + lista de índices de frames (linear no atlas).
    pub animations: Vec<AnimationSpec>,
    /// Colunas do atlas (para converter index -> x/y).
    pub columns: u32,
}

#[derive(Deserialize, Debug)]
pub struct AnimationSpec {
    pub name: String,
    pub frames: Vec<u32>,
    pub fps: f32,
    pub r#loop: bool,
}

#[tauri::command]
pub fn generate_sprite_frames_tres(
    app: AppHandle,
    args: SpriteFramesArgs,
) -> Result<String, String> {
    let game = game_dir(&app, &args.project_id)?;
    let out = game.join(&args.out_tres_rel);

    // Godot 4 format=3 requer IDs textuais; usamos "tex_0" para ExtResource
    // e "atlas_<i>" para AtlasTexture sub-resources.
    let atlas_path = format!("res://{}", args.atlas_png_rel.replace('\\', "/"));

    let mut s = String::new();
    // Contamos sub_resources: um AtlasTexture por frame único.
    // Indexamos os frames usados.
    let mut used_frames: Vec<u32> = Vec::new();
    for anim in &args.animations {
        for f in &anim.frames {
            if !used_frames.contains(f) {
                used_frames.push(*f);
            }
        }
    }

    let load_steps = used_frames.len() + 1; // +1 ExtResource

    s.push_str(&format!(
        "[gd_resource type=\"SpriteFrames\" load_steps={} format=3]\n\n",
        load_steps
    ));
    s.push_str(&format!(
        "[ext_resource type=\"Texture2D\" path=\"{}\" id=\"1_atlas\"]\n\n",
        atlas_path
    ));

    for (idx, frame_no) in used_frames.iter().enumerate() {
        let col = frame_no % args.columns;
        let row = frame_no / args.columns;
        let x = col * args.frame_w;
        let y = row * args.frame_h;
        s.push_str(&format!(
            "[sub_resource type=\"AtlasTexture\" id=\"atlas_{idx}\"]\n"
        ));
        s.push_str("atlas = ExtResource(\"1_atlas\")\n");
        s.push_str(&format!(
            "region = Rect2({}, {}, {}, {})\n\n",
            x, y, args.frame_w, args.frame_h
        ));
    }

    s.push_str("[resource]\nanimations = [");
    for (ai, anim) in args.animations.iter().enumerate() {
        if ai > 0 {
            s.push_str(", ");
        }
        s.push_str("{\n");
        s.push_str("\"frames\": [");
        for (fi, frame_no) in anim.frames.iter().enumerate() {
            if fi > 0 {
                s.push_str(", ");
            }
            let sub_idx = used_frames
                .iter()
                .position(|x| x == frame_no)
                .unwrap_or(0);
            s.push_str(&format!(
                "{{\n\"duration\": 1.0,\n\"texture\": SubResource(\"atlas_{sub_idx}\")\n}}"
            ));
        }
        s.push_str(&format!(
            "],\n\"loop\": {},\n\"name\": &\"{}\",\n\"speed\": {:.1}\n}}",
            anim.r#loop, anim.name, anim.fps
        ));
    }
    s.push_str("]\n");

    write_file(&out, &s)
}

// ---------------------------------------------------------------------------
// AtlasTexture (.tres) — UI icons, simple region
// ---------------------------------------------------------------------------

#[derive(Deserialize, Debug)]
pub struct AtlasTextureArgs {
    pub project_id: String,
    pub atlas_png_rel: String,
    pub out_tres_rel: String,
    pub region_x: u32,
    pub region_y: u32,
    pub region_w: u32,
    pub region_h: u32,
}

#[tauri::command]
pub fn generate_atlas_texture_tres(
    app: AppHandle,
    args: AtlasTextureArgs,
) -> Result<String, String> {
    let game = game_dir(&app, &args.project_id)?;
    let out = game.join(&args.out_tres_rel);
    let atlas_path = format!("res://{}", args.atlas_png_rel.replace('\\', "/"));

    let content = format!(
        "[gd_resource type=\"AtlasTexture\" load_steps=2 format=3]\n\n\
         [ext_resource type=\"Texture2D\" path=\"{atlas}\" id=\"1_tex\"]\n\n\
         [resource]\n\
         atlas = ExtResource(\"1_tex\")\n\
         region = Rect2({x}, {y}, {w}, {h})\n",
        atlas = atlas_path,
        x = args.region_x,
        y = args.region_y,
        w = args.region_w,
        h = args.region_h,
    );
    write_file(&out, &content)
}

// ---------------------------------------------------------------------------
// TileSet (.tres) — tileset a partir de tileset.png uniformemente fatiado
// ---------------------------------------------------------------------------

#[derive(Deserialize, Debug)]
pub struct TileSetArgs {
    pub project_id: String,
    pub tileset_png_rel: String,
    pub out_tres_rel: String,
    pub tile_w: u32,
    pub tile_h: u32,
    pub columns: u32,
    pub rows: u32,
}

#[tauri::command]
pub fn generate_tileset_resource_tres(
    app: AppHandle,
    args: TileSetArgs,
) -> Result<String, String> {
    let game = game_dir(&app, &args.project_id)?;
    let out = game.join(&args.out_tres_rel);
    let atlas_path = format!("res://{}", args.tileset_png_rel.replace('\\', "/"));

    let mut s = String::new();
    s.push_str("[gd_resource type=\"TileSet\" load_steps=3 format=3]\n\n");
    s.push_str(&format!(
        "[ext_resource type=\"Texture2D\" path=\"{}\" id=\"1_atlas\"]\n\n",
        atlas_path
    ));
    s.push_str("[sub_resource type=\"TileSetAtlasSource\" id=\"atlas_0\"]\n");
    s.push_str("texture = ExtResource(\"1_atlas\")\n");
    s.push_str(&format!(
        "texture_region_size = Vector2i({}, {})\n",
        args.tile_w, args.tile_h
    ));
    // Declara cada célula do grid como tile válido.
    for row in 0..args.rows {
        for col in 0..args.columns {
            s.push_str(&format!("{col}:{row}/0 = 0\n"));
        }
    }
    s.push('\n');
    s.push_str("[resource]\n");
    s.push_str(&format!("tile_size = Vector2i({}, {})\n", args.tile_w, args.tile_h));
    s.push_str("sources/0 = SubResource(\"atlas_0\")\n");

    write_file(&out, &s)
}

// ---------------------------------------------------------------------------
// .tscn Scene writer — grava conteúdo textual montado pelo TS
// ---------------------------------------------------------------------------

#[derive(Deserialize, Debug)]
pub struct TscnSceneArgs {
    pub project_id: String,
    pub out_scene_rel: String,
    pub content: String,
}

#[derive(Serialize)]
pub struct TscnSceneResult {
    pub path: String,
}

#[tauri::command]
pub fn write_tscn_scene(
    app: AppHandle,
    args: TscnSceneArgs,
) -> Result<TscnSceneResult, String> {
    let game = game_dir(&app, &args.project_id)?;
    let out = game.join(&args.out_scene_rel);
    let path = write_file(&out, &args.content)?;
    Ok(TscnSceneResult { path })
}
