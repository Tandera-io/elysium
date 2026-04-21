// Versionamento Git do diretório do projeto.
//
// Usa o `tauri-plugin-shell` para invocar `git` no filesystem do projeto.
// Um `.gitignore` padrão é criado automaticamente para evitar commitar
// arquivos volumosos sem LFS configurado.

import { Command } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./utils";

const GITIGNORE = `# Assets binários grandes são commitados via Git LFS (se configurado)
# ou via caminho explícito.

*.log
.DS_Store
`;

const GITATTRIBUTES = `*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
`;

async function projectDir(projectId: string): Promise<string> {
  return await invoke<string>("create_project_dir", { projectId });
}

async function run(cwd: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const cmd = Command.create("git", args, { cwd });
  const result = await cmd.execute();
  return {
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export async function ensureGitInit(projectId: string): Promise<boolean> {
  if (!isTauri()) return false;
  const cwd = await projectDir(projectId);
  try {
    const rev = await run(cwd, ["rev-parse", "--is-inside-work-tree"]);
    if (rev.code === 0) return true;
  } catch {
    // git não inicializado; segue
  }
  const init = await run(cwd, ["init", "-q"]);
  if (init.code !== 0) return false;

  // Primeiro commit com gitignore/gitattributes. Usa `write_project_file`
  // (comando Rust) em vez de `writeTextFile` do plugin fs pra evitar
  // confusão de `baseDir` e escopos de permissão.
  await invoke("write_project_file", {
    args: {
      project_id: projectId,
      relative: ".gitignore",
      content: GITIGNORE,
    },
  }).catch(() => {});
  await invoke("write_project_file", {
    args: {
      project_id: projectId,
      relative: ".gitattributes",
      content: GITATTRIBUTES,
    },
  }).catch(() => {});

  // Tenta habilitar LFS (se presente)
  await run(cwd, ["lfs", "install", "--local"]).catch(() => {});

  await run(cwd, ["add", "."]);
  await run(cwd, [
    "-c",
    "user.email=elysium@local",
    "-c",
    "user.name=Elysium Platform",
    "commit",
    "-q",
    "-m",
    "chore: init elysium project",
  ]);
  return true;
}

export async function commitPhaseApproval(
  projectId: string,
  phaseNumber: number,
  phaseTitle: string
): Promise<boolean> {
  if (!isTauri()) return false;
  const ok = await ensureGitInit(projectId);
  if (!ok) return false;
  const cwd = await projectDir(projectId);
  await run(cwd, ["add", "."]);
  const msg = `feat(phase ${phaseNumber}): approve "${phaseTitle}"`;
  const res = await run(cwd, [
    "-c",
    "user.email=elysium@local",
    "-c",
    "user.name=Elysium Platform",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    msg,
  ]);
  return res.code === 0;
}

export async function gitStatus(projectId: string): Promise<string> {
  if (!isTauri()) return "";
  const cwd = await projectDir(projectId);
  const res = await run(cwd, ["status", "--short", "-b"]);
  return res.stdout;
}

// Stub para hooks futuros antes de commitar (ex: flush de kb.json). O
// plugin fs não é usado aqui por causa de inconsistências de scope/baseDir
// no Windows — toda a IO de projeto passa por comandos Rust (`projects.rs`).
export async function snapshotBeforeCommit(_projectId: string): Promise<void> {
  if (!isTauri()) return;
}

// -------------------------------------------------------------------
// Subrepo da Fase 14 (game/): commits por turno de agente, reset last,
// diff da HEAD. A implementação Rust vive em `src-tauri/src/game_project.rs`
// e já garante init idempotente.
// -------------------------------------------------------------------

export interface GameGitResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

export async function gameCommit(
  projectId: string,
  message: string
): Promise<GameGitResult> {
  return await invoke<GameGitResult>("game_git_commit", {
    args: { project_id: projectId, message },
  });
}

export async function gameResetLast(projectId: string): Promise<GameGitResult> {
  return await invoke<GameGitResult>("game_git_reset_last", { projectId });
}

export async function gameDiffLast(projectId: string): Promise<GameGitResult> {
  return await invoke<GameGitResult>("game_git_diff", { projectId });
}
