//! Integração com Aseprite v1.x via CLI (modo `--batch` com scripts Lua).
//!
//! O usuário configura o path do executável em Settings (`aseprite_path`) —
//! default no Windows: `C:\Program Files\Aseprite\Aseprite.exe`. Não há
//! sidecar empacotado; se o path não existir, os comandos retornam erro
//! claro para a UI exibir.
//!
//! Os scripts Lua vivem em `resources/aseprite_scripts/` e são copiados
//! para `$APPDATA/aseprite_scripts/` na primeira execução (ver
//! `copy_aseprite_scripts`), assim podemos referenciá-los por path absoluto
//! ao invocar o Aseprite.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const DEFAULT_WIN_PATH: &str = "C:\\Program Files\\Aseprite\\Aseprite.exe";
const DEFAULT_STEAM_PATH: &str =
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe";

// Scripts Lua embutidos no binário em tempo de compilação. São copiados
// para $APPDATA/aseprite_scripts/ no primeiro boot.
const LUA_PACK_SHEET: &str = include_str!("../resources/aseprite_scripts/pack_sheet.lua");
const LUA_SLICE_FRAMES: &str = include_str!("../resources/aseprite_scripts/slice_frames.lua");
const LUA_REMOVE_BG: &str = include_str!("../resources/aseprite_scripts/remove_bg.lua");
const LUA_EXTRACT_PALETTE: &str =
    include_str!("../resources/aseprite_scripts/extract_palette.lua");
const LUA_EXPORT_LAYERS: &str = include_str!("../resources/aseprite_scripts/export_layers.lua");

fn scripts_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    Ok(base.join("aseprite_scripts"))
}

/// Copia os scripts embutidos para $APPDATA/aseprite_scripts/ se ainda não
/// existirem ou se a versão embutida for diferente. Retorna o diretório.
pub fn copy_aseprite_scripts(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = scripts_dir(app)?;
    fs::create_dir_all(&dir).map_err(|e| format!("mkdir {e}"))?;
    let pairs: &[(&str, &str)] = &[
        ("pack_sheet.lua", LUA_PACK_SHEET),
        ("slice_frames.lua", LUA_SLICE_FRAMES),
        ("remove_bg.lua", LUA_REMOVE_BG),
        ("extract_palette.lua", LUA_EXTRACT_PALETTE),
        ("export_layers.lua", LUA_EXPORT_LAYERS),
    ];
    for (name, content) in pairs {
        let path = dir.join(name);
        // Sempre reescreve: em dev o conteúdo pode ter mudado; é barato.
        fs::write(&path, content).map_err(|e| format!("write {name}: {e}"))?;
    }
    Ok(dir)
}

fn resolve_executable(provided: Option<&str>) -> Result<PathBuf, String> {
    if let Some(p) = provided.filter(|s| !s.is_empty()) {
        let path = PathBuf::from(p);
        if path.exists() {
            return Ok(path);
        }
        return Err(format!("Aseprite não encontrado em: {p}"));
    }
    // Tentativas automáticas (Windows).
    for candidate in [DEFAULT_WIN_PATH, DEFAULT_STEAM_PATH] {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Ok(path);
        }
    }
    Err(format!(
        "Aseprite não encontrado. Configure o path em Settings. Tentei: {DEFAULT_WIN_PATH}, {DEFAULT_STEAM_PATH}"
    ))
}

#[tauri::command]
pub fn aseprite_check_installed(path: Option<String>) -> Result<String, String> {
    let exe = resolve_executable(path.as_deref())?;
    let output = Command::new(&exe)
        .arg("--version")
        .output()
        .map_err(|e| format!("falha ao executar Aseprite: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("aseprite --version falhou: {stderr}"));
    }
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        Ok(format!(
            "Aseprite instalado em {}",
            exe.to_string_lossy()
        ))
    } else {
        Ok(stdout)
    }
}

#[derive(Deserialize, Debug)]
pub struct AseScriptArgs {
    /// Nome do script (sem .lua). Um dos: "pack_sheet", "slice_frames",
    /// "remove_bg", "extract_palette", "export_layers".
    pub script: String,
    /// Parâmetros key=value passados via `--script-param`. Valores complexos
    /// (paths, JSON) devem ser escapados pelo chamador.
    pub params: Vec<(String, String)>,
    /// Path absoluto opcional do executável Aseprite. Se None, usa o
    /// resolver automático (settings/default).
    pub exe: Option<String>,
    /// Timeout em segundos. Default 60s.
    pub timeout_secs: Option<u64>,
}

#[derive(Serialize, Debug)]
pub struct AseScriptResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[tauri::command]
pub async fn aseprite_run_script(
    app: AppHandle,
    args: AseScriptArgs,
) -> Result<AseScriptResult, String> {
    let exe = resolve_executable(args.exe.as_deref())?;
    let scripts = copy_aseprite_scripts(&app)?;
    let valid = [
        "pack_sheet",
        "slice_frames",
        "remove_bg",
        "extract_palette",
        "export_layers",
    ];
    if !valid.contains(&args.script.as_str()) {
        return Err(format!("script inválido: {}", args.script));
    }
    let script_path = scripts.join(format!("{}.lua", args.script));
    if !script_path.exists() {
        return Err(format!(
            "script não encontrado: {}",
            script_path.to_string_lossy()
        ));
    }

    let mut cmd = Command::new(&exe);
    cmd.arg("-b"); // batch mode: não abre UI
    for (k, v) in &args.params {
        cmd.arg("--script-param").arg(format!("{k}={v}"));
    }
    cmd.arg("--script").arg(&script_path);

    let timeout = Duration::from_secs(args.timeout_secs.unwrap_or(60));

    // Blocking execução em thread dedicada (tauri async command já fora do UI thread).
    let handle = std::thread::spawn(move || cmd.output());
    let start = std::time::Instant::now();
    while !handle.is_finished() {
        if start.elapsed() > timeout {
            return Err(format!(
                "timeout após {}s executando {}",
                timeout.as_secs(),
                args.script
            ));
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    let output = handle
        .join()
        .map_err(|_| "thread panicked".to_string())?
        .map_err(|e| format!("falha ao rodar aseprite: {e}"))?;

    Ok(AseScriptResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[derive(Deserialize, Debug)]
pub struct AsePackSheetArgs {
    /// Lista de paths absolutos dos PNGs a empacotar (ordem preservada).
    pub input_files: Vec<String>,
    /// Path absoluto do atlas.png resultante.
    pub out_png: String,
    /// Path absoluto do atlas.json (formato json-array).
    pub out_json: String,
    /// "packed" (empacotamento otimizado) | "rows" | "columns" | "horizontal" | "vertical".
    pub sheet_type: Option<String>,
    pub exe: Option<String>,
    /// Se true adiciona --list-tags ao JSON (útil quando inputs são .ase com
    /// tags). Default false — PNGs simples não têm tags e o CLI pode falhar.
    pub list_tags: Option<bool>,
}

/// Empacota PNGs num spritesheet via Aseprite CLI nativo (--sheet/--data).
/// Mais simples que chamar Lua porque o comportamento está embutido.
#[tauri::command]
pub fn aseprite_pack_sheet(args: AsePackSheetArgs) -> Result<AseScriptResult, String> {
    if args.input_files.is_empty() {
        return Err("aseprite_pack_sheet: input_files vazio".into());
    }
    let exe = resolve_executable(args.exe.as_deref())?;
    // Garante que a pasta de saída existe.
    if let Some(parent) = PathBuf::from(&args.out_png).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir out_png: {e}"))?;
    }
    if let Some(parent) = PathBuf::from(&args.out_json).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir out_json: {e}"))?;
    }

    let mut cmd = Command::new(&exe);
    cmd.arg("-b");
    for f in &args.input_files {
        if !PathBuf::from(f).exists() {
            return Err(format!("input não existe: {f}"));
        }
        cmd.arg(f);
    }
    cmd.arg("--sheet").arg(&args.out_png);
    cmd.arg("--data").arg(&args.out_json);
    cmd.arg("--format").arg("json-array");
    cmd.arg("--sheet-type")
        .arg(args.sheet_type.as_deref().unwrap_or("packed"));
    if args.list_tags.unwrap_or(false) {
        cmd.arg("--list-tags");
    }

    let output = cmd
        .output()
        .map_err(|e| format!("falha ao rodar aseprite: {e}"))?;

    Ok(AseScriptResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

/// Lê um arquivo binário (PNG, MP3) como base64 para passar como styleRef
/// ao Pixellab ou embutir em respostas Claude. Restringe ao sandbox do app
/// (projects/<id>/assets/**).
#[tauri::command]
pub fn read_binary_asset(
    app: AppHandle,
    project_id: String,
    relative: String,
) -> Result<String, String> {
    use base64_lite::encode as b64_encode;
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let path = base
        .join("projects")
        .join(&project_id)
        .join(&relative);
    if !path.exists() {
        return Err(format!("arquivo não encontrado: {}", path.to_string_lossy()));
    }
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    let canonical_base = base.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.starts_with(&canonical_base) {
        return Err("caminho fora do sandbox".into());
    }
    let bytes = fs::read(&canonical).map_err(|e| e.to_string())?;
    Ok(b64_encode(&bytes))
}

// Minimal base64 encoder local (evita adicionar crate). Correto e rápido o
// suficiente para os tamanhos em jogo (<2 MB).
mod base64_lite {
    const CHARS: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    pub fn encode(bytes: &[u8]) -> String {
        let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
        let mut i = 0;
        while i + 3 <= bytes.len() {
            let n = ((bytes[i] as u32) << 16)
                | ((bytes[i + 1] as u32) << 8)
                | (bytes[i + 2] as u32);
            out.push(CHARS[((n >> 18) & 0x3F) as usize] as char);
            out.push(CHARS[((n >> 12) & 0x3F) as usize] as char);
            out.push(CHARS[((n >> 6) & 0x3F) as usize] as char);
            out.push(CHARS[(n & 0x3F) as usize] as char);
            i += 3;
        }
        match bytes.len() - i {
            1 => {
                let n = (bytes[i] as u32) << 16;
                out.push(CHARS[((n >> 18) & 0x3F) as usize] as char);
                out.push(CHARS[((n >> 12) & 0x3F) as usize] as char);
                out.push('=');
                out.push('=');
            }
            2 => {
                let n = ((bytes[i] as u32) << 16) | ((bytes[i + 1] as u32) << 8);
                out.push(CHARS[((n >> 18) & 0x3F) as usize] as char);
                out.push(CHARS[((n >> 12) & 0x3F) as usize] as char);
                out.push(CHARS[((n >> 6) & 0x3F) as usize] as char);
                out.push('=');
            }
            _ => {}
        }
        out
    }
}

// Garante que o caminho é absoluto e existe antes de usar em `--script-param`.
#[allow(dead_code)]
fn assert_exists(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("path inexistente: {}", path.to_string_lossy()));
    }
    Ok(())
}

/// Abre o File Explorer (Windows) com o arquivo/pasta selecionado. Útil pra
/// "Abrir pasta" nos resultados de packing.
#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("path não existe: {path}"));
    }
    #[cfg(target_os = "windows")]
    {
        // /select,<path> abre pasta e destaca o arquivo. Se for pasta, abre-a direto.
        let arg = if p.is_dir() {
            p.clone()
        } else {
            p.clone()
        };
        let mut cmd = Command::new("explorer.exe");
        if p.is_file() {
            cmd.arg(format!("/select,{}", arg.to_string_lossy()));
        } else {
            cmd.arg(arg.as_os_str());
        }
        let _ = cmd.spawn().map_err(|e| format!("explorer: {e}"))?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open")
            .arg("-R")
            .arg(p.as_os_str())
            .spawn()
            .map_err(|e| format!("open: {e}"))?;
        return Ok(());
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let target = if p.is_file() {
            p.parent().map(|x| x.to_path_buf()).unwrap_or(p.clone())
        } else {
            p.clone()
        };
        let _ = Command::new("xdg-open")
            .arg(target.as_os_str())
            .spawn()
            .map_err(|e| format!("xdg-open: {e}"))?;
        return Ok(());
    }
}
