// Runner dos agentes de código (Fase 14).
//
// Diferente de `runner.ts` (agentes de discovery), este invoca o Claude
// Code CLI **em modo agente**: passa `cwd=game/` e `permissionMode`, dando
// ao Claude acesso ao filesystem via suas próprias ferramentas
// (Read/Edit/Write/Bash). Não concatenamos histórico em Markdown — só a
// nova instrução do usuário, porque o Claude Code mantém seu próprio
// contexto do repositorio ao ler/editar arquivos.

import { invoke } from "@tauri-apps/api/core";
import { streamClaude, type ClaudeMessage, type StreamResult } from "@/lib/claude";
import { documentsRepo } from "@/lib/db";
import { PHASES } from "@/types/pipeline";
import type { CodeAgentDefinition } from "./code_agents";
import { GLOBAL_AGENT_RULES } from "./base";

export interface CodeRunOptions {
  agent: CodeAgentDefinition;
  projectId: string;
  history: ClaudeMessage[];
  userMessage: string;
  onText?: (delta: string) => void;
  onEvent?: (e: any) => void;
  signal?: AbortSignal;
  /** Autocommit ao fim do turno (default: true se sucesso). */
  autoCommit?: boolean;
}

export interface CodeRunResult extends StreamResult {
  committed?: boolean;
  commitMessage?: string;
}

/**
 * Monta o bloco de CANON resumido para injetar no system prompt do agente
 * de código. É uma versão mais enxuta do `buildPriorCanonBlock` do runner
 * de discovery: aqui o Claude Code tem acesso ao filesystem (onde o GDD
 * também está disponível em `game/docs/` ou `game/README.md`), então
 * precisamos apenas de um pointer mais alto.
 */
async function buildCanonPointer(projectId: string): Promise<string> {
  const all = await documentsRepo.listByProject(projectId).catch(() => []);
  const approved = all
    .filter((d) => d.status === "approved")
    .sort((a, b) => a.phase_number - b.phase_number);
  if (approved.length === 0) {
    return "Nenhuma etapa aprovada. O GDD ainda nao esta consolidado — avise o usuario antes de qualquer decisao arquitetural.";
  }
  const lines: string[] = [];
  for (const d of approved) {
    const phaseDef = PHASES.find((p) => p.number === d.phase_number);
    lines.push(
      `- Etapa ${d.phase_number} (${phaseDef?.title ?? d.document_type}): **${d.title}** — aprovada (v${d.version})`
    );
  }
  lines.push("");
  lines.push(
    "Para ler o conteudo completo, use Read em 'docs/gdd-latest.md' (se foi copiado para game/) ou peca ao usuario que cole. Nao adivinhe conteudo."
  );
  return lines.join("\n");
}

export async function runCodeAgentTurn(
  opts: CodeRunOptions
): Promise<CodeRunResult> {
  const canon = await buildCanonPointer(opts.projectId);
  const cwd = await invoke<string>("game_dir_for", {
    projectId: opts.projectId,
  });

  const appendSystem = [
    `CANON DO PROJETO (indice das etapas aprovadas — leia os docs para detalhes):\n${canon}`,
    `DIRETORIO DE TRABALHO: ${cwd}`,
    `REGRAS GLOBAIS DE AGENTE:\n${GLOBAL_AGENT_RULES.trim()}`,
  ].join("\n\n");

  const { done } = streamClaude({
    systemPrompt: opts.agent.systemPrompt,
    appendSystem,
    model: opts.agent.model,
    history: opts.history,
    userMessage: opts.userMessage,
    cwd,
    permissionMode: opts.agent.permissionMode,
    onText: opts.onText,
    onEvent: opts.onEvent,
    signal: opts.signal,
  });

  const result = await done;

  let committed = false;
  let commitMessage: string | undefined;
  const shouldCommit = opts.autoCommit ?? result.success;
  if (shouldCommit) {
    try {
      const summary = extractSummary(result.fullText);
      commitMessage = `[fase-14][${opts.agent.id}] ${summary}`;
      await invoke("game_git_commit", {
        args: {
          project_id: opts.projectId,
          message: commitMessage,
        },
      });
      committed = true;
    } catch (e) {
      console.warn("[code_runner] commit falhou:", e);
    }
  }

  return {
    ...result,
    committed,
    commitMessage,
  };
}

/**
 * Produz um resumo em 1 linha (~80 chars) a partir da resposta do agente
 * para virar commit message. Prioriza a primeira linha não vazia; cai
 * para um fallback genérico se o texto for vazio.
 */
function extractSummary(text: string): string {
  const clean = text
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const first = clean[0] ?? "turno sem texto";
  return first.length > 80 ? first.slice(0, 77) + "..." : first;
}
