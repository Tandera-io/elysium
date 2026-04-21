// Backup automático do workspace Elysium.
//
// Estratégia:
//   1. `syncAppDataToBackup(projectId)` chama o comando Rust
//      `sync_backup_tree`, que copia `elysium.db` + `projects/<id>/` +
//      `exports/` de dentro do `%AppData%/com.elysium.buildplatform/` para
//      `<workspace>/backup/`.
//   2. `commitAndPushBackup(msg)` roda `git add backup/` + `git commit` +
//      `git push origin HEAD` dentro do workspace root (herda credenciais
//      do `git` instalado — Credential Manager, SSH agent, etc.).
//
// Nenhuma dessas funções é crítica: erros devem ser capturados pelo caller
// e exibidos como warning (o core do app continua funcionando mesmo sem
// backup configurado).

import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";
import { settingsRepo } from "./db";
import { isTauri } from "./utils";

export interface BackupReport {
  files_copied: number;
  bytes_copied: number;
  skipped_volatile: number;
  backup_root: string;
}

const SETTINGS_KEY_WORKSPACE = "backup.workspace_root";
const SETTINGS_KEY_ENABLED = "backup.enabled";

export async function getBackupWorkspaceRoot(): Promise<string | null> {
  const v = await settingsRepo.get(SETTINGS_KEY_WORKSPACE);
  return v && v.trim().length > 0 ? v.trim() : null;
}

export async function setBackupWorkspaceRoot(path: string): Promise<void> {
  await settingsRepo.set(SETTINGS_KEY_WORKSPACE, path.trim());
}

export async function isBackupEnabled(): Promise<boolean> {
  const v = await settingsRepo.get(SETTINGS_KEY_ENABLED);
  // Default: desligado até o usuário rodar o init-backup-repo.ps1 e setar
  // o workspace. Evita quebrar usuários que não configuraram nada.
  if (v == null) return false;
  return v === "1" || v.toLowerCase() === "true";
}

export async function setBackupEnabled(enabled: boolean): Promise<void> {
  await settingsRepo.set(SETTINGS_KEY_ENABLED, enabled ? "1" : "0");
}

/**
 * Copia a árvore de dados do app (AppData) para `<workspace>/backup/`.
 * NÃO faz commit nem push — use `commitAndPushBackup()` em seguida.
 */
export async function syncAppDataToBackup(
  projectId: string | null
): Promise<BackupReport> {
  if (!isTauri()) throw new Error("syncAppDataToBackup só roda dentro do Tauri.");
  const workspace = await getBackupWorkspaceRoot();
  if (!workspace) {
    throw new Error(
      "backup.workspace_root não configurado. Rode scripts/init-backup-repo.ps1 e configure o workspace em Settings → Backup."
    );
  }
  return await invoke<BackupReport>("sync_backup_tree", {
    workspaceRoot: workspace,
    projectId,
  });
}

interface ShellResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

async function git(cwd: string, args: string[]): Promise<ShellResult> {
  const cmd = Command.create("git", args, { cwd });
  const out = await cmd.execute();
  return { code: out.code, stdout: out.stdout, stderr: out.stderr };
}

/**
 * Faz `git add backup/` + commit + push no workspace de backup. Requer
 * que o workspace já seja um repo git (rodou `scripts/init-backup-repo.ps1`).
 *
 * - Se não há mudanças, retorna sem push.
 * - Se o remote `origin` não estiver configurado, pula o push (commit local
 *   ainda garante histórico no disco).
 */
export async function commitAndPushBackup(message: string): Promise<{
  committed: boolean;
  pushed: boolean;
  message: string;
}> {
  if (!isTauri()) throw new Error("commitAndPushBackup só roda dentro do Tauri.");
  const workspace = await getBackupWorkspaceRoot();
  if (!workspace) throw new Error("backup.workspace_root não configurado.");

  const isRepo = await git(workspace, ["rev-parse", "--is-inside-work-tree"]);
  if (isRepo.code !== 0) {
    throw new Error(
      `Workspace ${workspace} não é um repositório git. Rode scripts/init-backup-repo.ps1 primeiro.`
    );
  }

  const add = await git(workspace, ["add", "backup/"]);
  if (add.code !== 0) {
    throw new Error(`git add backup/ falhou: ${add.stderr || add.stdout}`);
  }

  const status = await git(workspace, ["status", "--porcelain"]);
  const hasChanges = (status.stdout || "").trim().length > 0;
  if (!hasChanges) {
    return { committed: false, pushed: false, message: "nenhuma mudança no backup/" };
  }

  const commit = await git(workspace, [
    "-c",
    "user.email=elysium-backup@local",
    "-c",
    "user.name=Elysium Backup Bot",
    "commit",
    "-m",
    `backup: ${message}`,
  ]);
  if (commit.code !== 0) {
    throw new Error(`git commit falhou: ${commit.stderr || commit.stdout}`);
  }

  const remote = await git(workspace, ["remote"]);
  const hasOrigin = (remote.stdout || "").split(/\s+/).includes("origin");
  if (!hasOrigin) {
    return {
      committed: true,
      pushed: false,
      message: "commit local feito (sem remote 'origin' — push pulado)",
    };
  }

  const push = await git(workspace, ["push", "origin", "HEAD"]);
  if (push.code !== 0) {
    throw new Error(
      `git push falhou (commit local preservado): ${push.stderr || push.stdout}`
    );
  }

  return {
    committed: true,
    pushed: true,
    message: `commit + push ok: ${message}`,
  };
}

/**
 * Atalho pra hooks: faz sync + commit/push e retorna uma string curta
 * ("ok", "skipped", ou "error: …") que o caller pode anexar num warning
 * não crítico. NÃO lança — erro vira string.
 */
export async function runBackupSafely(
  projectId: string | null,
  message: string
): Promise<string> {
  try {
    if (!(await isBackupEnabled())) return "skipped (backup desabilitado)";
    const report = await syncAppDataToBackup(projectId);
    const push = await commitAndPushBackup(
      `${message} · ${report.files_copied} arquivos (${Math.round(
        report.bytes_copied / 1024
      )} KB)`
    );
    return push.message;
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.warn("[backup] falha:", msg);
    return `error: ${msg}`;
  }
}
