//! Comandos Rust para a Fase 14 (Implementação em Godot 4 + C#).
//!
//! Cada projeto do Elysium tem um subdiretório `game/` dentro de
//! `%AppData%/.../projects/<id>/`. Esse subdiretório é um projeto Godot 4
//! + C# completo, pronto para ser operado por Claude Code CLI em modo
//! agente (filesystem + shell).
//!
//! Comandos expostos:
//! - `scaffold_godot_csharp`: cria a estrutura inicial (project.godot,
//!   csproj, pastas, hello-world).
//! - `copy_approved_assets_to_game`: copia (via hardlink quando possível)
//!   os assets aprovados do projeto para `game/assets/`.
//! - `list_game_files`: listagem recursiva para a árvore de arquivos na UI.
//! - `godot_import`: roda `godot --headless --editor --quit` para gerar
//!   os sidecars `.import` de assets novos.
//! - `dotnet_build`: roda `dotnet build` no `game/`.
//! - `godot_run_headless`: roda `godot --headless <args>` (smoke tests).
//! - `game_dir_for`: devolve o path absoluto de `game/` do projeto.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

fn base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))
}

fn project_dir(app: &AppHandle, project_id: &str) -> Result<PathBuf, String> {
    Ok(base_dir(app)?.join("projects").join(project_id))
}

fn game_dir(app: &AppHandle, project_id: &str) -> Result<PathBuf, String> {
    Ok(project_dir(app, project_id)?.join("game"))
}

fn assets_dir(app: &AppHandle, project_id: &str) -> Result<PathBuf, String> {
    Ok(project_dir(app, project_id)?.join("assets"))
}

#[tauri::command]
pub fn game_dir_for(app: AppHandle, project_id: String) -> Result<String, String> {
    let dir = game_dir(&app, &project_id)?;
    Ok(dir.to_string_lossy().to_string())
}

// ------------------------------------------------------------------
// Scaffold de um projeto Godot 4 + C#
// ------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct ScaffoldArgs {
    pub project_id: String,
    pub project_name: String,
    /// Roadmap da Etapa 13 em Markdown (opcional) — vira game/README.md.
    pub roadmap_md: Option<String>,
    /// Se `true`, não sobrescreve arquivos existentes.
    #[serde(default)]
    pub safe: bool,
}

#[derive(Debug, Serialize)]
pub struct ScaffoldResult {
    pub game_dir: String,
    pub files_written: Vec<String>,
    pub already_existed: bool,
}

#[tauri::command]
pub fn scaffold_godot_csharp(
    app: AppHandle,
    args: ScaffoldArgs,
) -> Result<ScaffoldResult, String> {
    let dir = game_dir(&app, &args.project_id)?;
    let already_existed = dir.join("project.godot").exists();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let safe_name = sanitize_assembly_name(&args.project_name);
    let folders = [
        "scenes",
        "scenes/main",
        "scripts",
        "scripts/core",
        "scripts/gameplay",
        "scripts/systems",
        "scripts/ui",
        "assets",
        "assets/concept",
        "assets/sprite",
        "assets/tile",
        "assets/audio",
        "data",
        "data/items",
        "data/quests",
        "data/dialogues",
        "tests",
        "tools",
        "docs",
        ".github/workflows",
    ];
    for sub in folders {
        fs::create_dir_all(dir.join(sub)).map_err(|e| e.to_string())?;
    }

    let mut written: Vec<String> = Vec::new();

    let files: Vec<(String, String)> = vec![
        (
            "project.godot".into(),
            godot_project_file(&args.project_name, &safe_name),
        ),
        (".gitignore".into(), GODOT_GITIGNORE.to_string()),
        (".gitattributes".into(), GODOT_GITATTRIBUTES.to_string()),
        (
            "README.md".into(),
            format!(
                "# {name}\n\nProjeto Godot 4 + C# gerado pela Elysium Build Platform (Fase 14).\n\n\
                Este diretório é um repositório autônomo; rode `dotnet build` e\n\
                `godot --editor .` para começar.\n\n## Roadmap\n\n{roadmap}\n",
                name = args.project_name,
                roadmap = args.roadmap_md.as_deref().unwrap_or(
                    "_Aprovar a Etapa 13 e re-escaffoldar para popular o roadmap automaticamente._"
                )
            ),
        ),
        (format!("{safe_name}.csproj"), csproj_file(&safe_name)),
        (format!("{safe_name}.sln"), sln_file(&safe_name)),
        ("icon.svg".into(), ICON_SVG.to_string()),
        ("icon.svg.import".into(), ICON_SVG_IMPORT.to_string()),
        ("scenes/main/Main.tscn".into(), MAIN_TSCN.to_string()),
        ("scripts/core/Main.cs".into(), MAIN_CS.to_string()),
        ("scripts/core/GameRoot.cs".into(), GAME_ROOT_CS.to_string()),
        ("tools/run_smoke_test.gd".into(), SMOKE_TEST_GD.to_string()),
        (
            ".github/workflows/ci.yml".into(),
            GITHUB_CI_YML.replace("{{ASM}}", &safe_name),
        ),
        (
            "docs/architecture.md".into(),
            "# Arquitetura\n\n_Preenchido pelo Engine Architect._\n".to_string(),
        ),
    ];

    for (rel, content) in files {
        let target = dir.join(&rel);
        if args.safe && target.exists() {
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&target, content).map_err(|e| format!("write {rel}: {e}"))?;
        written.push(rel);
    }

    Ok(ScaffoldResult {
        game_dir: dir.to_string_lossy().to_string(),
        files_written: written,
        already_existed,
    })
}

fn sanitize_assembly_name(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut cap = true;
    for c in name.chars() {
        if c.is_ascii_alphanumeric() {
            if cap {
                for uc in c.to_uppercase() {
                    out.push(uc);
                }
                cap = false;
            } else {
                out.push(c);
            }
        } else {
            cap = true;
        }
    }
    if out.is_empty() {
        "ElysiumGame".to_string()
    } else if out.chars().next().unwrap().is_ascii_digit() {
        format!("Game{out}")
    } else {
        out
    }
}

fn godot_project_file(name: &str, asm: &str) -> String {
    format!(
        r#"; Godot 4 project file gerado pela Elysium Build Platform.
config_version=5

[application]

config/name="{name}"
config/description="Gerado pela Elysium Build Platform (Fase 14)"
run/main_scene="res://scenes/main/Main.tscn"
config/features=PackedStringArray("4.3", "C#", "Forward Plus")
config/icon="res://icon.svg"

[dotnet]

project/assembly_name="{asm}"

[input]

move_up={{
"deadzone": 0.5,
"events": [Object(InputEventKey,"device":0,"keycode":87)]
}}
move_down={{
"deadzone": 0.5,
"events": [Object(InputEventKey,"device":0,"keycode":83)]
}}
move_left={{
"deadzone": 0.5,
"events": [Object(InputEventKey,"device":0,"keycode":65)]
}}
move_right={{
"deadzone": 0.5,
"events": [Object(InputEventKey,"device":0,"keycode":68)]
}}
action_primary={{
"deadzone": 0.5,
"events": [Object(InputEventMouseButton,"device":0,"button_index":1)]
}}

[rendering]

renderer/rendering_method="forward_plus"
"#
    )
}

fn csproj_file(asm: &str) -> String {
    format!(
        r#"<Project Sdk="Godot.NET.Sdk/4.3.0">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <EnableDynamicLoading>true</EnableDynamicLoading>
    <RootNamespace>{asm}</RootNamespace>
    <AssemblyName>{asm}</AssemblyName>
    <Nullable>enable</Nullable>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
</Project>
"#
    )
}

fn sln_file(asm: &str) -> String {
    format!(
        r#"Microsoft Visual Studio Solution File, Format Version 12.00
# Gerado pela Elysium Build Platform
Project("{{9A19103F-16F7-4668-BE54-9A1E7A4F7556}}") = "{asm}", "{asm}.csproj", "{{11111111-1111-1111-1111-111111111111}}"
EndProject
Global
    GlobalSection(SolutionConfigurationPlatforms) = preSolution
        Debug|Any CPU = Debug|Any CPU
        ExportDebug|Any CPU = ExportDebug|Any CPU
        ExportRelease|Any CPU = ExportRelease|Any CPU
    EndGlobalSection
    GlobalSection(ProjectConfigurationPlatforms) = postSolution
        {{11111111-1111-1111-1111-111111111111}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
        {{11111111-1111-1111-1111-111111111111}}.Debug|Any CPU.Build.0 = Debug|Any CPU
        {{11111111-1111-1111-1111-111111111111}}.ExportDebug|Any CPU.ActiveCfg = ExportDebug|Any CPU
        {{11111111-1111-1111-1111-111111111111}}.ExportDebug|Any CPU.Build.0 = ExportDebug|Any CPU
        {{11111111-1111-1111-1111-111111111111}}.ExportRelease|Any CPU.ActiveCfg = ExportRelease|Any CPU
        {{11111111-1111-1111-1111-111111111111}}.ExportRelease|Any CPU.Build.0 = ExportRelease|Any CPU
    EndGlobalSection
EndGlobal
"#
    )
}

const GODOT_GITIGNORE: &str = r#".godot/
.import/
.vs/
.vscode/
bin/
obj/
*.user
*.tmp
*.swp
export_presets.cfg
.mono/

# Elysium — não commitar os sidecars de import (são gerados pelo editor)
*.import

# Mantem os originais
!assets/**/*.png
!assets/**/*.svg
!assets/**/*.wav
!assets/**/*.mp3
!assets/**/*.ogg
"#;

const GODOT_GITATTRIBUTES: &str = r#"*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
"#;

const ICON_SVG: &str = r##"<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="16" fill="#7c5cff"/>
  <text x="64" y="78" font-family="Arial" font-size="48" fill="white" text-anchor="middle" font-weight="bold">E</text>
</svg>
"##;

const ICON_SVG_IMPORT: &str = r#"[remap]
importer="texture"
type="CompressedTexture2D"
"#;

const MAIN_TSCN: &str = r#"[gd_scene load_steps=2 format=3 uid="uid://bmaincenter"]

[ext_resource type="Script" path="res://scripts/core/Main.cs" id="1"]

[node name="Main" type="Node2D"]
script = ExtResource("1")

[node name="Label" type="Label" parent="."]
offset_left = 320.0
offset_top = 240.0
offset_right = 640.0
offset_bottom = 320.0
text = "Hello from Elysium Fase 14"
"#;

const MAIN_CS: &str = r#"using Godot;

public partial class Main : Node2D
{
    public override void _Ready()
    {
        GD.Print("[Elysium Fase 14] Main scene ready. Vertical slice stub.");
    }
}
"#;

const GAME_ROOT_CS: &str = r#"using Godot;

// Autoload sugerido (adicione em project.godot/[autoload] quando houver
// GameRoot singleton real). Mantido como stub para o Gameplay Engineer
// evoluir.
public partial class GameRoot : Node
{
    public static GameRoot? Instance { get; private set; }

    public override void _Ready()
    {
        Instance = this;
    }
}
"#;

const SMOKE_TEST_GD: &str = r#"# Smoke test headless. Rode com:
#   godot --headless --script tools/run_smoke_test.gd
extends SceneTree

func _init():
    print("[smoke] boot OK")
    var scene := load("res://scenes/main/Main.tscn")
    if scene == null:
        printerr("[smoke] Main.tscn NAO carregou")
        quit(1)
        return
    print("[smoke] Main.tscn carregou")
    quit(0)
"#;

const GITHUB_CI_YML: &str = r#"name: ci

on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.0.x"
      - name: Restore
        run: dotnet restore {{ASM}}.csproj
      - name: Build
        run: dotnet build {{ASM}}.csproj --no-restore -c Debug
      # Para importar assets/rodar smoke test, adicione um step com o
      # Godot 4 headless (ex: https://github.com/barichello/godot-ci).
"#;

// ------------------------------------------------------------------
// Copia de assets aprovados para game/assets
// ------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct CopyAssetsArgs {
    pub project_id: String,
    /// Opcional: filtra por status ("approved" default).
    pub status_filter: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CopyAssetsResult {
    pub copied: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

/// Copia todos os arquivos dentro de `projects/<id>/assets/` para
/// `projects/<id>/game/assets/` preservando subpastas. Usa hard-link quando
/// possível (Windows precisa de permissão), fallback para copy.
#[tauri::command]
pub fn copy_approved_assets_to_game(
    app: AppHandle,
    args: CopyAssetsArgs,
) -> Result<CopyAssetsResult, String> {
    let _ = args.status_filter; // filter semântico fica no SQLite; aqui copiamos físicos

    let src = assets_dir(&app, &args.project_id)?;
    let dst = game_dir(&app, &args.project_id)?.join("assets");
    if !src.exists() {
        return Ok(CopyAssetsResult {
            copied: 0,
            skipped: 0,
            errors: vec!["pasta de assets nao existe".into()],
        });
    }
    fs::create_dir_all(&dst).map_err(|e| e.to_string())?;
    let mut result = CopyAssetsResult {
        copied: 0,
        skipped: 0,
        errors: vec![],
    };
    walk_and_copy(&src, &dst, &mut result);
    Ok(result)
}

fn walk_and_copy(src: &Path, dst: &Path, out: &mut CopyAssetsResult) {
    let Ok(read) = fs::read_dir(src) else {
        out.errors.push(format!("read_dir {src:?} falhou"));
        return;
    };
    for entry in read.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let target = dst.join(&name);
        if path.is_dir() {
            if let Err(e) = fs::create_dir_all(&target) {
                out.errors.push(format!("mkdir {target:?}: {e}"));
                continue;
            }
            walk_and_copy(&path, &target, out);
        } else if path.is_file() {
            if target.exists() {
                out.skipped += 1;
                continue;
            }
            // Hard-link primeiro; se falhar (filesystem diferente, Windows
            // sem permissão, etc.), copia.
            if fs::hard_link(&path, &target).is_ok() {
                out.copied += 1;
            } else if let Err(e) = fs::copy(&path, &target) {
                out.errors.push(format!("copy {path:?}: {e}"));
            } else {
                out.copied += 1;
            }
        }
    }
}

// ------------------------------------------------------------------
// Listagem recursiva de arquivos em game/
// ------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct GameFile {
    pub relative: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
pub fn list_game_files(app: AppHandle, project_id: String) -> Result<Vec<GameFile>, String> {
    let root = game_dir(&app, &project_id)?;
    if !root.exists() {
        return Ok(vec![]);
    }
    let mut out: Vec<GameFile> = Vec::new();
    collect_files(&root, &root, &mut out);
    out.sort_by(|a, b| a.relative.cmp(&b.relative));
    Ok(out)
}

fn collect_files(root: &Path, cur: &Path, out: &mut Vec<GameFile>) {
    let Ok(read) = fs::read_dir(cur) else {
        return;
    };
    for entry in read.flatten() {
        let path = entry.path();
        // Pula dirs grandes que poluem a UI.
        let name = entry.file_name().to_string_lossy().to_string();
        if matches!(
            name.as_str(),
            ".godot" | ".import" | "bin" | "obj" | ".mono" | ".vs"
        ) {
            continue;
        }
        let Ok(rel) = path.strip_prefix(root) else {
            continue;
        };
        let is_dir = path.is_dir();
        let size = if is_dir {
            0
        } else {
            entry.metadata().map(|m| m.len()).unwrap_or(0)
        };
        out.push(GameFile {
            relative: rel.to_string_lossy().replace('\\', "/"),
            is_dir,
            size,
        });
        if is_dir {
            collect_files(root, &path, out);
        }
    }
}

// ------------------------------------------------------------------
// godot_import / dotnet_build / godot_run_headless (streaming)
// ------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct ShellArgs {
    pub project_id: String,
    pub stream_id: String,
    /// Args extras (além do prefixo fixo por comando).
    #[serde(default)]
    pub extra_args: Vec<String>,
}

#[tauri::command]
pub async fn godot_import(app: AppHandle, args: ShellArgs) -> Result<String, String> {
    let godot = resolve_godot_binary();
    let base_args: Vec<String> = vec![
        "--headless".into(),
        "--editor".into(),
        "--quit".into(),
        "--path".into(),
        game_dir(&app, &args.project_id)?.to_string_lossy().to_string(),
    ];
    spawn_streaming(app, "godot://import", godot, base_args, args).await
}

#[tauri::command]
pub async fn dotnet_build(app: AppHandle, args: ShellArgs) -> Result<String, String> {
    let exe = PathBuf::from(if cfg!(windows) { "dotnet.exe" } else { "dotnet" });
    let cwd = game_dir(&app, &args.project_id)?;
    let base_args: Vec<String> = vec![
        "build".into(),
        "-nologo".into(),
        "--verbosity".into(),
        "minimal".into(),
    ];
    spawn_streaming_in(app, "dotnet://build", exe, base_args, args, Some(cwd)).await
}

#[tauri::command]
pub async fn godot_run_headless(
    app: AppHandle,
    args: ShellArgs,
) -> Result<String, String> {
    let godot = resolve_godot_binary();
    let dir = game_dir(&app, &args.project_id)?.to_string_lossy().to_string();
    let mut base_args: Vec<String> = vec![
        "--headless".into(),
        "--path".into(),
        dir,
    ];
    // Default: roda o smoke test se o chamador não passar nada.
    if args.extra_args.is_empty() {
        base_args.push("--script".into());
        base_args.push("tools/run_smoke_test.gd".into());
    }
    spawn_streaming(app, "godot://run", godot, base_args, args).await
}

fn resolve_godot_binary() -> PathBuf {
    // Ordem de resolução:
    //  1) var de ambiente ELYSIUM_GODOT_BIN (path completo)
    //  2) nome simples no PATH: godot / godot4
    if let Some(v) = std::env::var_os("ELYSIUM_GODOT_BIN") {
        return PathBuf::from(v);
    }
    #[cfg(windows)]
    {
        // Tenta Godot_v4.*.exe instalado via scoop/choco ou manualmente em
        // Program Files. Se não achar, cai no PATH.
        if let Some(pf) = std::env::var_os("ProgramFiles") {
            let p = PathBuf::from(pf).join("Godot").join("godot.exe");
            if p.exists() {
                return p;
            }
        }
        return PathBuf::from("godot.exe");
    }
    #[cfg(not(windows))]
    {
        PathBuf::from("godot")
    }
}

async fn spawn_streaming(
    app: AppHandle,
    channel_prefix: &str,
    exe: PathBuf,
    base_args: Vec<String>,
    args: ShellArgs,
) -> Result<String, String> {
    spawn_streaming_in(app, channel_prefix, exe, base_args, args, None).await
}

async fn spawn_streaming_in(
    app: AppHandle,
    channel_prefix: &str,
    exe: PathBuf,
    mut base_args: Vec<String>,
    args: ShellArgs,
    cwd: Option<PathBuf>,
) -> Result<String, String> {
    let channel = format!("{channel_prefix}/{}", args.stream_id);
    base_args.extend(args.extra_args.clone());

    let mut cmd = Command::new(&exe);
    cmd.args(&base_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(c) = cwd {
        cmd.current_dir(c);
    }
    #[cfg(windows)]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("falha ao executar {exe:?}: {e}"))?;

    let sid = args.stream_id.clone();
    let stdout = child.stdout.take().ok_or("sem stdout")?;
    let stderr = child.stderr.take().ok_or("sem stderr")?;

    let app_out = app.clone();
    let ch_out = channel.clone();
    let sid_out = sid.clone();
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_out.emit(
                &ch_out,
                serde_json::json!({
                    "stream_id": sid_out,
                    "kind": "stdout",
                    "line": line,
                }),
            );
        }
    });

    let app_err = app.clone();
    let ch_err = channel.clone();
    let sid_err = sid.clone();
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_err.emit(
                &ch_err,
                serde_json::json!({
                    "stream_id": sid_err,
                    "kind": "stderr",
                    "line": line,
                }),
            );
        }
    });

    let app_done = app.clone();
    let ch_done = channel.clone();
    let sid_done = sid.clone();
    tauri::async_runtime::spawn(async move {
        let status = child.wait().await;
        let payload = match status {
            Ok(s) => serde_json::json!({
                "stream_id": sid_done,
                "kind": "done",
                "code": s.code(),
                "success": s.success(),
            }),
            Err(e) => serde_json::json!({
                "stream_id": sid_done,
                "kind": "done",
                "success": false,
                "error": e.to_string(),
            }),
        };
        let _ = app_done.emit(&ch_done, payload);
    });

    Ok(channel)
}

// ------------------------------------------------------------------
// Git dentro do game/ (subrepo independente)
// ------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct GameGitArgs {
    pub project_id: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct GameGitResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub code: Option<i32>,
}

#[tauri::command]
pub async fn game_git_commit(
    app: AppHandle,
    args: GameGitArgs,
) -> Result<GameGitResult, String> {
    let dir = game_dir(&app, &args.project_id)?;
    if !dir.exists() {
        return Err("game/ ainda nao foi criado".into());
    }
    // init idempotente
    let _ = run_git(&dir, &["init", "-q"]).await;
    run_git(&dir, &["add", "."]).await?;
    let out = run_git(
        &dir,
        &[
            "-c",
            "user.email=elysium@local",
            "-c",
            "user.name=Elysium Fase 14",
            "commit",
            "-q",
            "--allow-empty",
            "-m",
            &args.message,
        ],
    )
    .await?;
    Ok(out)
}

#[tauri::command]
pub async fn game_git_reset_last(
    app: AppHandle,
    project_id: String,
) -> Result<GameGitResult, String> {
    let dir = game_dir(&app, &project_id)?;
    if !dir.exists() {
        return Err("game/ nao existe".into());
    }
    run_git(&dir, &["reset", "--hard", "HEAD~1"]).await
}

#[tauri::command]
pub async fn game_git_diff(
    app: AppHandle,
    project_id: String,
) -> Result<GameGitResult, String> {
    let dir = game_dir(&app, &project_id)?;
    if !dir.exists() {
        return Err("game/ nao existe".into());
    }
    run_git(&dir, &["diff", "--stat", "HEAD~1", "HEAD"]).await
}

async fn run_git(cwd: &Path, args: &[&str]) -> Result<GameGitResult, String> {
    let mut cmd = Command::new("git");
    cmd.args(args)
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    let output = cmd
        .output()
        .await
        .map_err(|e| format!("git falhou: {e}"))?;
    Ok(GameGitResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code(),
    })
}
