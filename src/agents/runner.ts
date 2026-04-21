// Runner do agente: busca KB -> monta prompt -> chama Claude CLI com streaming.

import { streamClaude, type ClaudeMessage } from "@/lib/claude";
import { buildContextBlock } from "@/lib/kb";
import { documentsRepo } from "@/lib/db";
import { PHASES } from "@/types/pipeline";
import type { AgentDefinition } from "./base";
import { renderSystemPrompt } from "./base";

// Limite por doc anterior injetado. A ideia é caber tudo no contexto mesmo
// quando há 12 etapas aprovadas anteriores; ~8 KB × 12 = ~96 KB — seguro.
const MAX_CHARS_PER_PRIOR_DOC = 8000;

/**
 * Retorna, em ordem de etapa, o conteúdo completo (truncado se muito longo)
 * de cada documento aprovado de etapas anteriores à fase atual. Esse bloco
 * vai no system prompt para que o agente tenha o "canon" completo do
 * projeto, não só os top-K chunks semânticos.
 */
async function buildPriorCanonBlock(
  projectId: string,
  currentPhase: number
): Promise<string> {
  const all = await documentsRepo.listByProject(projectId).catch(() => []);
  const approvedPrior = all
    .filter((d) => d.status === "approved" && d.phase_number < currentPhase)
    .sort((a, b) => a.phase_number - b.phase_number);
  if (approvedPrior.length === 0) {
    return "Nenhuma etapa anterior aprovada ainda.";
  }
  const parts: string[] = [];
  for (const d of approvedPrior) {
    const phaseDef = PHASES.find((p) => p.number === d.phase_number);
    const header = `### Etapa ${d.phase_number} — ${phaseDef?.title ?? d.document_type} (aprovado)\nAutor: ${d.agent_type} · v${d.version}\nTítulo: ${d.title}`;
    const body =
      d.content.length > MAX_CHARS_PER_PRIOR_DOC
        ? d.content.slice(0, MAX_CHARS_PER_PRIOR_DOC) +
          `\n\n[…truncado para caber no contexto; ${d.content.length - MAX_CHARS_PER_PRIOR_DOC} chars omitidos — consulte o KB via busca semântica se precisar de detalhe específico]`
        : d.content;
    parts.push(`${header}\n\n${body}`);
  }
  return parts.join("\n\n---\n\n");
}

export interface RunTurnOptions {
  agent: AgentDefinition;
  projectId: string;
  phase: number;
  history: ClaudeMessage[];
  userMessage: string;
  onText: (delta: string) => void;
  onEvent?: (e: any) => void;
}

export interface RunTurnResult {
  success: boolean;
  fullText: string;
  extractedDocument: { title: string; content: string } | null;
  error?: string;
}

export async function runAgentTurn(
  opts: RunTurnOptions
): Promise<RunTurnResult> {
  const [kbContext, priorCanon] = await Promise.all([
    buildContextBlock(opts.projectId, opts.userMessage, 6).catch(
      () => "Nenhum contexto prévio encontrado no Knowledge Base."
    ),
    buildPriorCanonBlock(opts.projectId, opts.phase),
  ]);
  const phaseHeader = `## Etapa atual\nEtapa ${opts.phase} — ${opts.agent.displayName} (${opts.agent.role}).\nFrameworks a usar: ${opts.agent.frameworks.join(", ")}.`;

  const appendSystem = [
    `CÂNONE DO PROJETO (documentos aprovados das etapas anteriores — fonte da verdade, não contradiga):\n${priorCanon}`,
    `CONTEXTO ADICIONAL (Knowledge Base — top resultados semânticos para a mensagem do usuário):\n${kbContext}`,
    phaseHeader,
  ].join("\n\n");

  const stream = streamClaude({
    systemPrompt: renderSystemPrompt(opts.agent),
    appendSystem,
    model: opts.agent.model,
    history: opts.history,
    userMessage: opts.userMessage,
    onText: opts.onText,
    onEvent: opts.onEvent,
  });

  const result = await stream.done;
  const extracted = extractDocument(result.fullText);
  return {
    success: result.success,
    fullText: result.fullText,
    extractedDocument: extracted,
    error: result.error,
  };
}

const DOC_RE = /<document\s+title=["']([^"']+)["']\s*>([\s\S]*?)<\/document>/i;
const DOC_OPEN_RE = /<document\s+title=["']([^"']+)["']\s*>/i;

export function extractDocument(
  text: string
): { title: string; content: string; truncated?: boolean } | null {
  const m = DOC_RE.exec(text);
  if (m) {
    return { title: m[1].trim(), content: m[2].trim() };
  }
  // Fallback: stream cortado antes de </document>. Salvamos o que temos
  // marcando como truncado para o usuário poder continuar depois.
  const openMatch = DOC_OPEN_RE.exec(text);
  if (!openMatch) return null;
  const start = openMatch.index + openMatch[0].length;
  const content = text.slice(start).trim();
  if (content.length < 40) return null;
  return {
    title: openMatch[1].trim(),
    content: `${content}\n\n<!-- ⚠️ Geração interrompida antes de </document>. Peça ao agente para "continuar do ponto em que parou" ou edite manualmente. -->`,
    truncated: true,
  };
}

/**
 * Remove o bloco <document> do texto para exibição mais limpa na conversa
 * (o documento fica num painel separado). Também cobre caso de truncamento
 * (sem </document>) substituindo tudo a partir do <document> pelo placeholder.
 */
export function stripDocument(text: string): string {
  const replaced = text.replace(
    DOC_RE,
    "_(documento gerado — veja no painel central)_"
  );
  if (replaced !== text) return replaced.trim();
  const openMatch = DOC_OPEN_RE.exec(text);
  if (!openMatch) return text.trim();
  const before = text.slice(0, openMatch.index).trim();
  const placeholder =
    "_(documento parcial salvo no painel central — geração interrompida; peça para continuar)_";
  return before ? `${before}\n\n${placeholder}` : placeholder;
}
