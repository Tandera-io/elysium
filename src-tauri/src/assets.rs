//! Helpers para geração e persistência de assets (imagens e áudio).

use sha2::{Digest, Sha256};
use std::fs;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn compute_prompt_hash(prompt: String, generator: String, kind: String) -> String {
    let mut hasher = Sha256::new();
    hasher.update(generator.as_bytes());
    hasher.update(b"|");
    hasher.update(kind.as_bytes());
    hasher.update(b"|");
    hasher.update(prompt.as_bytes());
    hex::encode(hasher.finalize())
}

#[tauri::command]
pub fn save_binary_asset(
    app: AppHandle,
    project_id: String,
    subfolder: String,
    filename: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("projects")
        .join(&project_id)
        .join("assets")
        .join(&subfolder);
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    let path = base.join(&filename);
    fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn download_asset_to_project(
    app: AppHandle,
    project_id: String,
    url: String,
    subfolder: String,
    filename: String,
) -> Result<String, String> {
    // Delegamos o download para o renderer via fetch do plugin-http, que já
    // tem allowlist. Esta função existe apenas para manter a API simétrica.
    let _ = (app, project_id, url, subfolder, filename);
    Err("download via backend desativado; use fetch no renderer".into())
}

/// Remove um arquivo dentro do sandbox do projeto (projects/<id>/assets/**).
/// Rejeita path com `..` ou absoluto. Seguro contra escape do sandbox.
/// Se o arquivo não existir, retorna Ok (idempotente).
#[tauri::command]
pub fn delete_project_file(
    app: AppHandle,
    project_id: String,
    relative: String,
) -> Result<(), String> {
    if relative.contains("..") || relative.starts_with('/') || relative.starts_with('\\') {
        return Err(format!("relative path inseguro: {}", relative));
    }
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("projects")
        .join(&project_id);
    let target = base.join(&relative);
    // Canonical check: garante que target está dentro de base.
    let base_abs = base.canonicalize().unwrap_or(base.clone());
    let target_abs = match target.canonicalize() {
        Ok(t) => t,
        Err(_) => {
            // Arquivo pode não existir — tratamos como idempotente (ok).
            return Ok(());
        }
    };
    if !target_abs.starts_with(&base_abs) {
        return Err(format!(
            "path fora do sandbox: {}",
            target_abs.to_string_lossy()
        ));
    }
    if target_abs.is_dir() {
        fs::remove_dir_all(&target_abs).map_err(|e| e.to_string())?;
    } else if target_abs.exists() {
        fs::remove_file(&target_abs).map_err(|e| e.to_string())?;
    }
    Ok(())
}
