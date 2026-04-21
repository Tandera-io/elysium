//! Integração com o Claude Code CLI.
//!
//! O CLI é invocado via `claude -p --output-format stream-json
//! --include-partial-messages --verbose --input-format text`, com o prompt
//! enviado pelo STDIN. Cada linha de stdout é um evento JSON; repassamos ao
//! renderer via `emit` no canal `claude://stream/<id>`.
//!
//! Importante (Windows): invocamos `claude.exe` diretamente sempre que
//! possível, evitando `claude.cmd`. Arquivos .cmd passam pelo parser de
//! batch do cmd.exe, que barra strings multilinha e UTF-8 como argv
//! ("batch file arguments are invalid"). Passar o prompt via stdin também
//! contorna o limite de 32 KB de argv e o problema de encoding da code-page
//! ativa.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

#[derive(Default)]
pub struct ClaudeProcesses(pub Mutex<HashMap<String, u32>>);

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaudePromptArgs {
    pub stream_id: String,
    pub prompt: String,
    #[serde(default)]
    pub system_prompt: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub append_system: Option<String>,
    /// Diretório de trabalho do processo. Quando presente, o Claude Code
    /// opera suas ferramentas (Read/Edit/Write/Bash) dentro desse cwd — é
    /// o modo "agent" usado pela Fase 14.
    #[serde(default)]
    pub cwd: Option<String>,
    /// `bypassPermissions` (default), `acceptEdits` (revisa antes de
    /// aplicar edits) ou `plan` (não executa, só planeja).
    #[serde(default)]
    pub permission_mode: Option<String>,
    /// Se `true`, não passa `--permission-mode` no CLI — usa o default do
    /// próprio CLI (que normalmente pede confirmação interativa, não
    /// queremos).
    #[serde(default)]
    pub no_permission_mode: Option<bool>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ClaudeStreamEvent {
    pub stream_id: String,
    pub kind: String,
    pub data: serde_json::Value,
}

#[tauri::command]
pub async fn claude_check_installed() -> Result<String, String> {
    let output = Command::new(resolve_claude_executable())
        .arg("--version")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("claude não encontrado: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "claude retornou código {:?}",
            output.status.code()
        ));
    }
    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(version)
}

/// Grava um prompt em arquivo temporário (%TEMP%/elysium-<kind>-<sid>.txt)
/// e devolve o caminho. Sobrescreve se já existir. UTF-8 sempre.
fn write_temp_prompt(kind: &str, stream_id: &str, content: &str) -> std::io::Result<PathBuf> {
    let mut path = std::env::temp_dir();
    // Sanitiza stream_id para evitar chars inválidos em nome de arquivo.
    let safe_sid: String = stream_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    path.push(format!("elysium-{kind}-{safe_sid}.txt"));
    std::fs::write(&path, content.as_bytes())?;
    Ok(path)
}

/// Resolve o caminho do binário Claude Code. No Windows preferimos
/// `claude.exe` para evitar a camada de cmd.exe / parsing de batch que
/// corrompe prompts multilinha e UTF-8 quando passados como argv.
fn resolve_claude_executable() -> PathBuf {
    #[cfg(windows)]
    {
        // 1) Caminho canônico da instalação npm global.
        if let Some(appdata) = std::env::var_os("APPDATA") {
            let mut p = PathBuf::from(appdata);
            p.push("npm");
            p.push("node_modules");
            p.push("@anthropic-ai");
            p.push("claude-code");
            p.push("bin");
            p.push("claude.exe");
            if p.exists() {
                return p;
            }
        }
        // 2) %PROGRAMFILES%\nodejs\...
        if let Some(pf) = std::env::var_os("ProgramFiles") {
            let mut p = PathBuf::from(pf);
            p.push("nodejs");
            p.push("node_modules");
            p.push("@anthropic-ai");
            p.push("claude-code");
            p.push("bin");
            p.push("claude.exe");
            if p.exists() {
                return p;
            }
        }
        // 3) Fallback: confiar no PATH (pode ser claude.cmd, que ainda é
        //    usável para --version). O handler principal vai detectar e
        //    logar se houver problema.
        PathBuf::from("claude.cmd")
    }
    #[cfg(not(windows))]
    {
        PathBuf::from("claude")
    }
}

#[tauri::command]
pub async fn claude_prompt_stream(
    app: AppHandle,
    args: ClaudePromptArgs,
) -> Result<String, String> {
    let stream_id = args.stream_id.clone();
    let event_channel = format!("claude://stream/{stream_id}");

    let claude_path = resolve_claude_executable();
    let mut cmd = Command::new(&claude_path);
    cmd.arg("-p")
        .arg("--output-format")
        .arg("stream-json")
        .arg("--include-partial-messages")
        .arg("--verbose")
        .arg("--input-format")
        .arg("text");

    // Modo de permissão: por padrão `bypassPermissions` (modo chat seguro,
    // sem filesystem). Na Fase 14 o renderer manda `acceptEdits` ou
    // `bypassPermissions` junto com `cwd`, transformando a chamada em um
    // agent run de fato (Claude Code com Read/Edit/Write/Bash).
    if args.no_permission_mode != Some(true) {
        let mode = args
            .permission_mode
            .as_deref()
            .unwrap_or("bypassPermissions");
        cmd.arg("--permission-mode").arg(mode);
    }

    if let Some(model) = args.model.as_ref() {
        cmd.arg("--model").arg(model);
    }

    // Diretório de trabalho do processo. Essencial no modo agente da Fase
    // 14: o Claude Code usa o cwd como raiz do seu filesystem scope.
    if let Some(cwd) = args.cwd.as_ref() {
        if !cwd.is_empty() {
            cmd.current_dir(cwd);
        }
    }

    // Escreve system prompts em arquivos temporários e passa só o path
    // como argumento. O Windows tem limite de 32 KB na linha de comando
    // total (CreateProcess / error 206 ERROR_FILENAME_EXCED_RANGE); com
    // cânone de múltiplas etapas aprovadas + system prompt do agente,
    // estouramos esse limite. Os flags `--system-prompt-file` e
    // `--append-system-prompt-file` são suportados pelo Claude Code CLI
    // (documentados na descrição do `--bare`).
    let mut tmp_files: Vec<PathBuf> = Vec::new();
    if let Some(system) = args.system_prompt.as_ref() {
        let path = write_temp_prompt("system", &stream_id, system)
            .map_err(|e| format!("falha ao gravar system prompt temp: {e}"))?;
        cmd.arg("--system-prompt-file").arg(&path);
        tmp_files.push(path);
    }
    if let Some(extra) = args.append_system.as_ref() {
        let path = write_temp_prompt("append", &stream_id, extra)
            .map_err(|e| format!("falha ao gravar append prompt temp: {e}"))?;
        cmd.arg("--append-system-prompt-file").arg(&path);
        tmp_files.push(path);
    }

    // NÃO passamos o prompt do usuário como argv. Enviamos via stdin
    // para evitar:
    //  - erro "batch file arguments are invalid" em claude.cmd no Windows;
    //  - limite de 32 KB de argv;
    //  - corrupção de UTF-8 pela code-page ativa do shell.
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child: Child = cmd.spawn().map_err(|e| {
        format!(
            "falha ao executar claude CLI ({}): {e}",
            claude_path.display()
        )
    })?;

    // Escreve o prompt no stdin e fecha o pipe para sinalizar EOF.
    if let Some(mut stdin) = child.stdin.take() {
        let prompt_bytes = args.prompt.clone().into_bytes();
        tokio::spawn(async move {
            if let Err(e) = stdin.write_all(&prompt_bytes).await {
                eprintln!("[claude] erro escrevendo stdin: {e}");
            }
            let _ = stdin.shutdown().await;
        });
    }

    if let Some(pid) = child.id() {
        if let Some(state) = app.try_state::<ClaudeProcesses>() {
            state.0.lock().unwrap().insert(stream_id.clone(), pid);
        } else {
            let state = ClaudeProcesses::default();
            state.0.lock().unwrap().insert(stream_id.clone(), pid);
            app.manage(state);
        }
    }

    let stdout = child.stdout.take().ok_or("sem stdout do claude")?;
    let stderr = child.stderr.take().ok_or("sem stderr do claude")?;

    let app_out = app.clone();
    let sid_out = stream_id.clone();
    let ch_out = event_channel.clone();
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let data = match serde_json::from_str::<serde_json::Value>(trimmed) {
                Ok(v) => v,
                Err(_) => serde_json::json!({ "raw": trimmed }),
            };
            let kind = data
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("chunk")
                .to_string();
            let _ = app_out.emit(
                &ch_out,
                ClaudeStreamEvent {
                    stream_id: sid_out.clone(),
                    kind,
                    data,
                },
            );
        }
    });

    let app_err = app.clone();
    let sid_err = stream_id.clone();
    let ch_err = event_channel.clone();
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_err.emit(
                &ch_err,
                ClaudeStreamEvent {
                    stream_id: sid_err.clone(),
                    kind: "stderr".into(),
                    data: serde_json::json!({ "line": line }),
                },
            );
        }
    });

    let app_done = app.clone();
    let sid_done = stream_id.clone();
    let ch_done = event_channel.clone();
    tauri::async_runtime::spawn(async move {
        let status = child.wait().await;
        // Best-effort cleanup dos system/append prompt files temporários.
        for p in &tmp_files {
            let _ = std::fs::remove_file(p);
        }
        let payload = match status {
            Ok(s) => serde_json::json!({
                "success": s.success(),
                "code": s.code(),
            }),
            Err(e) => serde_json::json!({
                "success": false,
                "error": e.to_string(),
            }),
        };
        let _ = app_done.emit(
            &ch_done,
            ClaudeStreamEvent {
                stream_id: sid_done.clone(),
                kind: "done".into(),
                data: payload,
            },
        );
        if let Some(state) = app_done.try_state::<ClaudeProcesses>() {
            state.0.lock().unwrap().remove(&sid_done);
        }
    });

    Ok(event_channel)
}

#[tauri::command]
pub fn claude_cancel(app: AppHandle, stream_id: String) -> Result<bool, String> {
    let Some(state) = app.try_state::<ClaudeProcesses>() else {
        return Ok(false);
    };
    let pid = {
        let mut map = state.0.lock().unwrap();
        map.remove(&stream_id)
    };
    let Some(pid) = pid else { return Ok(false) };

    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F", "/T"])
            .output();
    }
    #[cfg(not(windows))]
    {
        unsafe {
            libc::kill(pid as i32, libc::SIGTERM);
        }
    }
    Ok(true)
}
