//! Backup automático: copia a árvore de dados do app (elysium.db +
//! projects/<id>/ + exports/) para `<workspace_root>/backup/`. O commit +
//! push pro GitHub é feito do lado TS via shell (git), para herdar as
//! credenciais já configuradas do usuário (credential manager / ssh agent).
//!
//! Exclui arquivos voláteis do SQLite (`*.db-shm`, `*.db-wal`) porque eles
//! só fazem sentido junto ao `.db` ativo e o WAL já é consolidado via
//! `PRAGMA wal_checkpoint(FULL)` antes da cópia (rodado do TS).

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct BackupReport {
    pub files_copied: u64,
    pub bytes_copied: u64,
    pub skipped_volatile: u64,
    pub backup_root: String,
}

fn app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))
}

fn is_volatile_sqlite_sidecar(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".db-shm")
        || lower.ends_with(".db-wal")
        || lower.ends_with(".sqlite-shm")
        || lower.ends_with(".sqlite-wal")
        || lower.ends_with(".tmp")
}

/// Copia `src` -> `dst` recursivamente, ignorando os arquivos voláteis.
/// Retorna (files_copied, bytes_copied, skipped_volatile).
fn copy_tree(src: &Path, dst: &Path) -> Result<(u64, u64, u64), String> {
    if !src.exists() {
        return Ok((0, 0, 0));
    }
    if !src.is_dir() {
        return Err(format!("copy_tree: origem não é diretório: {src:?}"));
    }
    fs::create_dir_all(dst).map_err(|e| format!("create_dir_all {dst:?}: {e}"))?;

    let mut files = 0u64;
    let mut bytes = 0u64;
    let mut skipped = 0u64;

    for entry in fs::read_dir(src).map_err(|e| format!("read_dir {src:?}: {e}"))? {
        let entry = entry.map_err(|e| format!("read_dir entry: {e}"))?;
        let name = entry.file_name();
        let name_s = name.to_string_lossy();
        let from = entry.path();
        let to = dst.join(&name);
        let meta = entry.metadata().map_err(|e| format!("metadata {from:?}: {e}"))?;
        if meta.is_dir() {
            let (f, b, s) = copy_tree(&from, &to)?;
            files += f;
            bytes += b;
            skipped += s;
        } else if meta.is_file() {
            if is_volatile_sqlite_sidecar(&name_s) {
                skipped += 1;
                continue;
            }
            fs::copy(&from, &to).map_err(|e| format!("copy {from:?} -> {to:?}: {e}"))?;
            files += 1;
            bytes += meta.len();
        }
        // symlinks e outros: ignorados
    }
    Ok((files, bytes, skipped))
}

fn path_has_ancestor(path: &Path, ancestor: &Path) -> bool {
    let p = match path.canonicalize() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let a = match ancestor.canonicalize() {
        Ok(v) => v,
        Err(_) => return false,
    };
    p.starts_with(a)
}

/// Espelha a árvore de AppData do app para `<workspace_root>/backup/`.
///
/// - workspace_root: diretório RAIZ do repo git de backup (precisa existir).
/// - project_id: opcional; se None, copia `projects/` inteiro (caro);
///   normalmente passamos o id do projeto corrente.
///
/// Arquivos copiados (quando existirem na origem):
///   - elysium.db (single-file SQLite)
///   - projects/<project_id>/** (assets, kb.json, docs, exports específicos)
///   - exports/** (exports globais do app)
#[tauri::command]
pub fn sync_backup_tree(
    app: AppHandle,
    workspace_root: String,
    project_id: Option<String>,
) -> Result<BackupReport, String> {
    let src_root = app_data_root(&app)?;
    let workspace = PathBuf::from(&workspace_root);
    if !workspace.is_absolute() {
        return Err(format!(
            "workspace_root precisa ser caminho absoluto, recebido: {workspace_root}"
        ));
    }
    if !workspace.exists() {
        return Err(format!("workspace_root não existe: {workspace:?}"));
    }

    // Sanidade: workspace NÃO pode estar dentro do app_data_dir (evita
    // loop de backup copiando dentro de si mesmo).
    if path_has_ancestor(&workspace, &src_root) {
        return Err(format!(
            "workspace_root {workspace:?} está dentro do app_data_dir {src_root:?} — aborto"
        ));
    }

    let backup_root = workspace.join("backup");
    fs::create_dir_all(&backup_root)
        .map_err(|e| format!("create_dir_all backup/: {e}"))?;

    let mut total_files = 0u64;
    let mut total_bytes = 0u64;
    let mut total_skipped = 0u64;

    // elysium.db (arquivo único) — copia se existir
    let db_src = src_root.join("elysium.db");
    if db_src.exists() && db_src.is_file() {
        let db_dst = backup_root.join("elysium.db");
        let meta = fs::metadata(&db_src).map_err(|e| format!("stat db: {e}"))?;
        fs::copy(&db_src, &db_dst)
            .map_err(|e| format!("copy elysium.db -> {db_dst:?}: {e}"))?;
        total_files += 1;
        total_bytes += meta.len();
    }

    // projects/<id>/ ou projects/ inteiro
    match project_id.as_ref() {
        Some(pid) => {
            let proj_src = src_root.join("projects").join(pid);
            let proj_dst = backup_root.join("projects").join(pid);
            let (f, b, s) = copy_tree(&proj_src, &proj_dst)?;
            total_files += f;
            total_bytes += b;
            total_skipped += s;
        }
        None => {
            let proj_src = src_root.join("projects");
            let proj_dst = backup_root.join("projects");
            let (f, b, s) = copy_tree(&proj_src, &proj_dst)?;
            total_files += f;
            total_bytes += b;
            total_skipped += s;
        }
    }

    // exports/
    let exp_src = src_root.join("exports");
    let exp_dst = backup_root.join("exports");
    let (f, b, s) = copy_tree(&exp_src, &exp_dst)?;
    total_files += f;
    total_bytes += b;
    total_skipped += s;

    Ok(BackupReport {
        files_copied: total_files,
        bytes_copied: total_bytes,
        skipped_volatile: total_skipped,
        backup_root: backup_root.to_string_lossy().to_string(),
    })
}
