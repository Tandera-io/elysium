//! Gerenciamento de diretórios/arquivos de projetos em %AppData%/Elysium-Platform/projects/<id>

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct ProjectFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

fn base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    Ok(dir)
}

pub fn ensure_app_dirs(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let base = base_dir(app).map_err(|e| e.to_string())?;
    fs::create_dir_all(base.join("projects"))?;
    fs::create_dir_all(base.join("cache"))?;
    fs::create_dir_all(base.join("exports"))?;
    Ok(())
}

#[tauri::command]
pub fn get_projects_dir(app: AppHandle) -> Result<String, String> {
    let dir = base_dir(&app)?.join("projects");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_project_dir(app: AppHandle, project_id: String) -> Result<String, String> {
    let dir = base_dir(&app)?.join("projects").join(&project_id);
    for sub in ["assets", "assets/concept", "assets/sprite", "assets/audio", "exports", "docs"] {
        fs::create_dir_all(dir.join(sub)).map_err(|e| e.to_string())?;
    }
    // IMPORTANTE: só escreve o kb.json se ele ainda não existe. Antes essa
    // escrita era incondicional e como `create_project_dir` é chamada em
    // vários pontos do frontend (inclusive no `loadIndex` do KB a cada
    // sessão), o index em disco era zerado toda vez — deixando 340+ chunks
    // em `kb_entries` no SQLite mas busca semântica retornando 0 resultados.
    let kb_path = dir.join("kb.json");
    if !kb_path.exists() {
        fs::write(&kb_path, b"{\"version\":1,\"entries\":[]}")
            .map_err(|e| e.to_string())?;
    }
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_project_dir(app: AppHandle, project_id: String) -> Result<bool, String> {
    let dir = base_dir(&app)?.join("projects").join(&project_id);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
pub fn list_project_files(
    app: AppHandle,
    project_id: String,
    relative: Option<String>,
) -> Result<Vec<ProjectFile>, String> {
    let root = base_dir(&app)?.join("projects").join(&project_id);
    let target = match relative {
        Some(r) => root.join(r),
        None => root.clone(),
    };
    if !target.exists() {
        return Ok(vec![]);
    }
    let mut files = vec![];
    for entry in fs::read_dir(&target).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        files.push(ProjectFile {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }
    Ok(files)
}

#[tauri::command]
pub fn read_project_file(
    app: AppHandle,
    project_id: String,
    relative: String,
) -> Result<String, String> {
    let path = base_dir(&app)?.join("projects").join(&project_id).join(&relative);
    guard_inside(&path, &base_dir(&app)?)?;
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[derive(Deserialize)]
pub struct WriteArgs {
    pub project_id: String,
    pub relative: String,
    pub content: String,
}

#[tauri::command]
pub fn write_project_file(app: AppHandle, args: WriteArgs) -> Result<String, String> {
    let path = base_dir(&app)?
        .join("projects")
        .join(&args.project_id)
        .join(&args.relative);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    guard_inside(&path, &base_dir(&app)?)?;
    fs::write(&path, args.content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn guard_inside(path: &Path, base: &Path) -> Result<(), String> {
    let canonical_base = base
        .canonicalize()
        .or_else(|_| {
            fs::create_dir_all(base).and_then(|_| base.canonicalize())
        })
        .map_err(|e| e.to_string())?;
    let to_check = if path.exists() {
        path.canonicalize().map_err(|e| e.to_string())?
    } else {
        let parent = path.parent().ok_or("sem parent")?;
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let p = parent.canonicalize().map_err(|e| e.to_string())?;
        p.join(path.file_name().ok_or("sem filename")?)
    };
    if !to_check.starts_with(&canonical_base) {
        return Err("caminho fora do diretório do app".into());
    }
    Ok(())
}
