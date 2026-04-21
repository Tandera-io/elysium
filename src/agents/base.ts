import type { AgentType } from "@/types/domain";

/**
 * Alias de modelo aceito pelo Claude Code CLI via `--model`.
 *
 * Usamos aliases curtos (não slugs datados) para sobreviver a bumps de versão
 * dos modelos. O CLI resolve `opus` → opus mais recente, `sonnet` → sonnet
 * mais recente, etc.
 *
 * Política de distribuição (ver README > Modelos por Agente):
 * - `opus`: agentes de criação crua / julgamento crítico fundante
 *   (Discovery, Mechanics Designer, Lore Writer).
 * - `sonnet`: agentes estruturais / integração de KB / prompts para APIs
 *   (Benchmark, Level Designer, Art Director, Audio Director, Asset Producer).
 * - `haiku`: reservado para usos futuros (ex: resumos, títulos, classificação).
 */
export type AgentModel = "opus" | "sonnet" | "haiku";

export interface AgentDefinition {
  type: AgentType;
  displayName: string;
  role: string;
  color: string;
  phases: number[];
  frameworks: string[];
  systemPrompt: string;
  /**
   * Texto do gatilho que o agente deve usar quando gerar o documento final
   * da etapa (extraído pelo parser de documentos).
   */
  documentTag: string;
  firstMessage: string;
  /**
   * Modelo Claude usado por este agente. Se ausente, o CLI aplica o default
   * da conta. Ver AgentModel para a política de atribuição.
   */
  model: AgentModel;
}

/**
 * Regras universais que todos os agentes recebem (injetadas como
 * append-system-prompt do Claude CLI).
 */
export const GLOBAL_AGENT_RULES = `Regras universais da Elysium Build Platform:

1) Fale em português brasileiro natural e direto. Evite jargão desnecessário.
2) Você é um especialista senior de game design. Desafie respostas vagas: peça especificidade, exemplos de jogos concretos, referências.
3) Consulte sempre o Knowledge Base fornecido no bloco "CONTEXTO DO PROJETO". Se uma decisão nova conflita com algo já definido, aponte o conflito e proponha reconciliação antes de seguir.
4) Quando tiver informação suficiente para fechar a etapa, responda com uma PRÉVIA do documento final envolto em tags XML:
   <document title="...">
   Conteúdo Markdown do documento final, bem estruturado, com seções H2/H3.
   </document>
   Nunca gere o bloco <document> sem antes ter feito pelo menos 2 rodadas de perguntas e refinamento com o usuário.
5) Após gerar o <document>, pergunte explicitamente: "Quer APROVAR, ITERAR (com feedback) ou REVISAR?". Não presuma aprovação.
6) Mantenha respostas curtas quando estiver coletando informação (máx 3-4 perguntas por turno). Explique o framework em 1 linha quando introduzir um novo conceito.
7) Nunca invente dados de mercado, números de vendas, preços ou estatísticas. Se não souber, diga "preciso pesquisar" ou peça ao usuário.
8) Formatos de gêneros, tags e plataformas: use vocabulário padrão de mercado (Steam/IGDB).
`;

export function renderSystemPrompt(agent: AgentDefinition): string {
  return [
    agent.systemPrompt.trim(),
    "",
    "---",
    GLOBAL_AGENT_RULES.trim(),
  ].join("\n");
}
