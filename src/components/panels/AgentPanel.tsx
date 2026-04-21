import { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizonal, StopCircle, Sparkles, Paperclip, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PhaseDefinition } from "@/types/pipeline";
import { PHASES, phaseLabel } from "@/types/pipeline";
import { AGENTS } from "@/agents/agents";
import { useAgentStore } from "@/stores/agentStore";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { conversationsRepo, documentsRepo } from "@/lib/db";
import { runAgentTurn, stripDocument } from "@/agents/runner";
import { cn } from "@/lib/utils";
import type { ClaudeMessage } from "@/lib/claude";
import { ingest as ingestKb } from "@/lib/kb";

interface Attachment {
  id: string;
  name: string;
  size: number;
  content: string;
}

const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt"];
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB por arquivo

function isAcceptedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function buildAttachmentBlock(a: Attachment): string {
  return `<attachment filename="${a.name}">\n${a.content}\n</attachment>`;
}

export function AgentPanel({ phase }: { phase: PhaseDefinition }) {
  const { currentProject, refreshDocuments } = useProjectStore();
  const agent = AGENTS[phase.agent];
  const {
    conversation,
    messages,
    streamingText,
    isStreaming,
    loadForPhase,
    appendLocal,
    setStreaming,
    setStreamingText,
    setStreamingPhase,
    setError,
  } = useAgentStore();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachError(null);
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!isAcceptedFile(file.name)) {
        setAttachError(
          `"${file.name}" ignorado — só aceito .md, .markdown e .txt.`
        );
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setAttachError(
          `"${file.name}" ignorado — acima de 2 MB (tem ${(file.size / 1024).toFixed(0)} KB).`
        );
        continue;
      }
      const content = await file.text();
      next.push({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        size: file.size,
        content,
      });
    }
    if (next.length > 0) {
      setAttachments((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...next.filter((a) => !seen.has(a.id))];
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  useEffect(() => {
    if (!currentProject) return;
    loadForPhase(currentProject.id, phase.number).catch((e) =>
      setError(String(e?.message ?? e))
    );
  }, [currentProject?.id, phase.number]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, streamingText]);

  const history: ClaudeMessage[] = useMemo(() => {
    return messages.map((m) => ({
      role:
        m.role === "user" ? "user" : m.role === "agent" ? "assistant" : "system",
      content: m.content,
    }));
  }, [messages]);

  async function send() {
    if (!currentProject || !conversation) return;
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming) return;

    const pendingAttachments = attachments;
    setInput("");
    setAttachments([]);
    setAttachError(null);

    // Mensagem que a UI exibe (humana): texto + listagem de anexos.
    const displayMessage = pendingAttachments.length
      ? `${trimmed}${trimmed ? "\n\n" : ""}**Anexos enviados ao agente:**\n${pendingAttachments
          .map((a) => `- \`${a.name}\` (${(a.size / 1024).toFixed(1)} KB)`)
          .join("\n")}`
      : trimmed;

    // Mensagem que o Claude realmente recebe: texto + blocos dos anexos.
    const attachmentsBlock = pendingAttachments
      .map(buildAttachmentBlock)
      .join("\n\n");
    const userMessageForClaude = pendingAttachments.length
      ? `${trimmed}\n\nO usuário anexou ${pendingAttachments.length} arquivo(s) de referência. Use o conteúdo deles como contexto canônico para este turno:\n\n${attachmentsBlock}`
      : trimmed;

    const userMsg = await conversationsRepo.appendMessage(
      conversation.id,
      "user",
      displayMessage
    );
    appendLocal(userMsg);
    setStreaming(true);
    setStreamingText("");
    // Sinaliza ao DocumentView que o stream em andamento pertence a esta
    // fase. O DocumentView só mostra o preview ao vivo quando bate com a
    // fase que está sendo renderizada (evita vazamento entre abas).
    setStreamingPhase(phase.number);

    // Ingere cada anexo no KB em paralelo (não bloqueia o turno).
    // Assim todos os agentes futuros também enxergam esse material.
    for (const a of pendingAttachments) {
      ingestKb({
        projectId: currentProject.id,
        content: `# ${a.name}\n\n${a.content}`,
        documentType: "user_reference",
        phaseNumber: phase.number,
        agentType: phase.agent,
        tags: ["user_upload", a.name],
      }).catch((e) => {
        console.warn(`KB ingest falhou para ${a.name}:`, e);
      });
    }

    let acc = "";
    let turn;
    try {
      turn = await runAgentTurn({
        agent,
        projectId: currentProject.id,
        phase: phase.number,
        history,
        userMessage: userMessageForClaude,
        onText: (delta) => {
          acc += delta;
          setStreamingText(acc);
        },
      });
    } finally {
      // Limpa o flag de fase do stream SEMPRE, mesmo se runAgentTurn jogar.
      setStreamingPhase(null);
    }

    setStreaming(false);
    if (!turn.success) {
      const errMsg = await conversationsRepo.appendMessage(
        conversation.id,
        "system",
        `_Erro ao conversar com Claude CLI: ${turn.error ?? "desconhecido"}_`,
        { error: true }
      );
      appendLocal(errMsg);
      setStreamingText("");
      return;
    }

    const rawText = turn.fullText || acc;
    const display = stripDocument(rawText);
    // Guarda o texto cru em metadata pra permitir re-extração/recuperação
    // futura mesmo se o upsert em phase_documents falhar por qualquer motivo
    // (ex.: CHECK constraint, disk full, IO). Sem isso, a versão mostrada no
    // chat já passou por stripDocument e o <document> original viraria fumaça.
    const saved = await conversationsRepo.appendMessage(
      conversation.id,
      "agent",
      display || rawText,
      {
        cost: undefined,
        raw_text: rawText,
        doc_extracted: !!turn.extractedDocument,
      }
    );
    appendLocal(saved);
    setStreamingText("");

    if (turn.extractedDocument) {
      try {
        await documentsRepo.upsert({
          projectId: currentProject.id,
          phase: phase.number,
          documentType: phase.documentType,
          title: turn.extractedDocument.title,
          content: turn.extractedDocument.content,
          agentType: phase.agent,
        });
        await refreshDocuments();
      } catch (e: any) {
        // Falha visível: injeta mensagem de sistema no chat avisando que o
        // <document> foi extraído mas a persistência quebrou. O raw_text já
        // está em metadata, então o usuário pode recuperar via botão no
        // DocumentView ou reportar com a mensagem de erro concreta.
        console.error("[AgentPanel] documentsRepo.upsert falhou:", e);
        const errMsg = await conversationsRepo.appendMessage(
          conversation.id,
          "system",
          `_⚠️ Documento extraído mas **não foi possível persistir** na fase ${phase.number}: ${e?.message ?? e}. O texto bruto foi preservado em metadata — use o botão "Recuperar documento da conversa" no painel central pra tentar novamente._`,
          { error: true, upsert_failed: true }
        );
        appendLocal(errMsg);
      }
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="h-full panel-shell flex flex-col">
      <div className="panel-header">
        <span
          className="h-4 w-4 rounded-full inline-flex items-center justify-center"
          style={{ background: `${agent.color}33`, color: agent.color }}
        >
          <Sparkles className="h-2.5 w-2.5" />
        </span>
        <span className="text-foreground/80">{agent.displayName}</span>
        <span className="text-muted-foreground">· {agent.role}</span>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        <div className="p-3 space-y-3">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role as any}
              content={m.content}
              accent={agent.color}
            />
          ))}
          {isStreaming && (
            <MessageBubble
              role="agent"
              content={previewStreamingText(streamingText) || "…"}
              accent={agent.color}
              streaming
            />
          )}
        </div>
      </div>
      <div className="border-t border-border/60 p-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 text-[11px] rounded-md border border-border/60 bg-secondary/40 pl-2 pr-1 py-0.5"
                title={`${a.name} — ${(a.size / 1024).toFixed(1)} KB`}
              >
                <Paperclip className="h-3 w-3 opacity-70" />
                <span className="max-w-[160px] truncate">{a.name}</span>
                <span className="text-muted-foreground">
                  {(a.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-destructive/30"
                  aria-label={`Remover ${a.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {attachError && (
          <p className="text-[11px] text-destructive mb-1 px-1">{attachError}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={(e) => onPickFiles(e.target.files)}
          className="hidden"
        />
        <div className="relative">
          <Textarea
            rows={3}
            placeholder={`Converse com ${agent.displayName}... (Ctrl+Enter envia)`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            className="pl-10 pr-16"
            disabled={isStreaming}
          />
          <div className="absolute bottom-2 left-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              title="Anexar arquivos .md / .txt (vão para o agente e para o Knowledge Base)"
            >
              <Paperclip className="h-3 w-3" />
            </Button>
          </div>
          <div className="absolute bottom-2 right-2 flex gap-1">
            {isStreaming ? (
              <Button size="icon" variant="destructive" className="h-7 w-7">
                <StopCircle className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="glow"
                className="h-7 w-7"
                onClick={send}
                disabled={!input.trim() && attachments.length === 0}
              >
                <SendHorizonal className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          Ctrl+Enter envia · Clipe anexa `.md`/`.txt` (vão para o turno + KB) ·
          Etapa {phaseLabel(phase)}/{PHASES.length}
        </p>
      </div>
    </div>
  );
}

/**
 * Esconde o XML do <document> durante o stream. O preview completo agora é
 * renderizado ao vivo no painel central (DocumentView) — aqui deixamos só um
 * indicador mínimo pra o chat não ficar poluído com o XML nem com o texto
 * longo duplicado.
 */
function previewStreamingText(raw: string): string {
  if (!raw) return "";
  const openIdx = raw.search(/<document\s+title=/i);
  if (openIdx < 0) return raw;
  const before = raw.slice(0, openIdx).trim();
  const hint = "✏️ _escrevendo no painel central…_";
  return before ? `${before}\n\n${hint}` : hint;
}

function MessageBubble({
  role,
  content,
  accent,
  streaming,
}: {
  role: "user" | "agent" | "system";
  content: string;
  accent: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  const isSystem = role === "system";
  return (
    <div
      className={cn(
        "flex gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold mt-1",
          isUser && "bg-secondary",
          isSystem && "bg-destructive/30 text-destructive"
        )}
        style={
          !isUser && !isSystem
            ? { background: `${accent}33`, color: accent }
            : undefined
        }
      >
        {isUser ? "U" : isSystem ? "!" : "A"}
      </div>
      <div
        className={cn(
          "prose prose-invert prose-sm max-w-[85%] px-3 py-2 rounded-lg border border-border/50",
          isUser
            ? "bg-primary/10 border-primary/40"
            : isSystem
              ? "bg-destructive/10 border-destructive/40"
              : "bg-card/60",
          streaming && "relative after:content-['▌'] after:text-primary after:animate-pulse"
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
