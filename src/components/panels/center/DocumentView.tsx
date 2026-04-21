import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, RefreshCw, Pencil, FileDown, AlertTriangle, LifeBuoy } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useAgentStore } from "@/stores/agentStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { getPhase, PHASES, phaseLabel } from "@/types/pipeline";
import { AGENTS } from "@/agents/agents";
import { conversationsRepo, documentsRepo, projectsRepo } from "@/lib/db";
import { ingest } from "@/lib/kb";
import { commitPhaseApproval, snapshotBeforeCommit } from "@/lib/git";
import { extractDocument } from "@/agents/runner";
import type { PhaseDocument } from "@/types/domain";
import { formatDate } from "@/lib/utils";
import { exportProjectMarkdown } from "@/lib/export";
import { extractManifestFromDocument } from "@/lib/assetManifest";

interface Props {
  phase: number;
}

export function DocumentView({ phase }: Props) {
  const { currentProject, documents, refreshDocuments, updateCurrentPhaseInDb } =
    useProjectStore();
  // Stream ao vivo: quando o AgentPanel está gerando o <document> pra esta
  // fase, renderizamos o conteúdo parcial em tempo real aqui (em vez de só
  // mostrar placeholder no chat e esperar o stream fechar).
  const { streamingText, isStreaming, streamingPhase } = useAgentStore();
  const phaseDef = useMemo(() => {
    try {
      return getPhase(phase);
    } catch {
      return getPhase(1);
    }
  }, [phase]);
  const agent = AGENTS[phaseDef.agent];
  const doc = documents.find((d) => d.phase_number === phase);

  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(doc?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(doc?.title ?? phaseDef.title);
  const [partialError, setPartialError] = useState<string | null>(null);
  const [recoverable, setRecoverable] = useState<{
    messageId: string;
    title: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    setContent(doc?.content ?? "");
    setTitle(doc?.title ?? phaseDef.title);
    setEditing(false);
  }, [doc?.id, phase]);

  // Quando NÃO há doc persistido, varremos as mensagens da conversa desta
  // fase buscando algum agent message cujo `metadata.raw_text` contenha um
  // bloco <document> extraível. Isso habilita o botão "Recuperar documento
  // da conversa" quando a persistência falhou em turnos anteriores (p.ex.
  // CHECK constraint bloqueou o INSERT na tabela phase_documents).
  useEffect(() => {
    if (doc || !currentProject) {
      setRecoverable(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const conv = await conversationsRepo.getOrCreate(
          currentProject.id,
          phaseDef.agent,
          phase
        );
        const msgs = await conversationsRepo.listMessages(conv.id);
        // Varre do mais recente pro mais antigo — preferimos o último doc gerado.
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i];
          if (m.role !== "agent") continue;
          let meta: any = {};
          try {
            meta = JSON.parse(m.metadata || "{}");
          } catch {
            continue;
          }
          const raw = meta.raw_text;
          if (typeof raw !== "string" || !raw.includes("<document")) continue;
          const extracted = extractDocument(raw);
          if (!extracted) continue;
          if (cancelled) return;
          setRecoverable({
            messageId: m.id,
            title: extracted.title,
            content: extracted.content,
          });
          return;
        }
        if (!cancelled) setRecoverable(null);
      } catch {
        if (!cancelled) setRecoverable(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc?.id, phase, currentProject?.id, phaseDef.agent]);

  async function recoverFromConversation() {
    if (!currentProject || !recoverable) return;
    setBusy(true);
    setPartialError(null);
    try {
      await documentsRepo.upsert({
        projectId: currentProject.id,
        phase,
        documentType: phaseDef.documentType,
        title: recoverable.title,
        content: recoverable.content,
        agentType: phaseDef.agent,
      });
      await refreshDocuments();
      setRecoverable(null);
    } catch (e: any) {
      setPartialError(
        `Recuperação falhou: ${e?.message ?? e}.\n` +
          `Verifique se a migration 002 foi aplicada (o CHECK antigo em phase_documents bloqueia phase_number > 13).`
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveManual() {
    if (!currentProject) return;
    setBusy(true);
    try {
      await documentsRepo.upsert({
        projectId: currentProject.id,
        phase,
        documentType: phaseDef.documentType,
        title,
        content,
        agentType: phaseDef.agent,
      });
      await refreshDocuments();
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function approveDocument() {
    if (!doc || !currentProject) return;
    setBusy(true);
    setPartialError(null);
    const warnings: string[] = [];

    // ---- CAMINHO CRÍTICO ----
    // Todas as operações aqui são obrigatórias. Se uma falha, erro vai para
    // a UI e paramos — não adianta seguir se o status não mudou.
    try {
      try {
        await documentsRepo.setStatus(doc.id, "approved");
      } catch (e: any) {
        console.error("[approve] setStatus falhou:", e);
        setPartialError(
          `Falha ao marcar como aprovado no banco: ${e?.message ?? e}`
        );
        return;
      }

      // Atualiza UI imediatamente. Qualquer falha subsequente é secundária.
      await refreshDocuments().catch((e) => {
        warnings.push(`recarregar documentos falhou: ${e?.message ?? e}`);
      });

      // Avança o current_phase e activePhase (leva o usuário para a próxima
      // etapa). Também é parte do caminho crítico do ponto de vista de UX.
      if (phase >= currentProject.current_phase && phase < 13) {
        try {
          await updateCurrentPhaseInDb(phase + 1);
        } catch (e: any) {
          console.error("[approve] updateCurrentPhaseInDb falhou:", e);
          warnings.push(
            `avançar para a Etapa ${phase + 1} falhou: ${e?.message ?? e}`
          );
        }
      }

      // ---- EFEITOS COLATERAIS (não bloqueantes para a UX) ----

      // Ingest no KB — isola porque a 1ª execução baixa o modelo de
      // embeddings; sem rede, quebra e não pode matar o fluxo todo.
      try {
        await ingest({
          projectId: currentProject.id,
          content: doc.content,
          documentType: doc.document_type,
          phaseNumber: doc.phase_number,
          agentType: doc.agent_type,
          sourceDocumentId: doc.id,
        });
      } catch (e: any) {
        console.error("[approve] KB ingest falhou:", e);
        warnings.push(
          `ingestão no Knowledge Base falhou: ${e?.message ?? e}. ` +
            `O doc foi aprovado, mas agentes futuros não vão recuperá-lo via busca semântica até a próxima aprovação bem-sucedida.`
        );
      }

      // Ingest canon (YAML frontmatter em documentos dos specialist writers).
      // Idempotente: reaplica upsert por slug, sem duplicar.
      try {
        const { ingestCanonFromDoc } = await import("@/lib/canon");
        const added = await ingestCanonFromDoc(currentProject.id, {
          id: doc.id,
          phase: doc.phase_number,
          content: doc.content,
        });
        if (added > 0) {
          console.info(
            `[approve] canon: ${added} entry(ies) upserted from phase ${doc.phase_number}`
          );
        }
      } catch (e: any) {
        console.warn("[approve] canon ingest falhou (não crítico):", e);
        warnings.push(
          `ingestão no Canon Registry falhou (não crítico): ${e?.message ?? e}`
        );
      }

      // Cascade para marcar dependentes como needs_revision
      try {
        await markDependentsForRevision(currentProject.id, phase);
        await refreshDocuments().catch(() => {});
      } catch (e: any) {
        console.error("[approve] markDependentsForRevision falhou:", e);
        warnings.push(
          `cascade de revisão em etapas dependentes falhou: ${e?.message ?? e}`
        );
      }

      // Git — cada chamada já tem catch interno, mas redundamos por segurança.
      try {
        await snapshotBeforeCommit(currentProject.id);
        await commitPhaseApproval(currentProject.id, phase, phaseDef.title);
      } catch (e: any) {
        console.warn("[approve] commit git falhou (não crítico):", e);
        warnings.push(
          `commit git falhou (não crítico): ${e?.message ?? e}`
        );
      }

      // Backup automático (espelha AppData pro workspace do GitHub).
      // runBackupSafely NUNCA lança — retorna string descritiva. Só
      // adicionamos como warning se o backup retornou erro ou foi pulado
      // por configuração ausente, pra deixar o usuário ciente sem travar
      // o fluxo de aprovação.
      try {
        const { runBackupSafely } = await import("@/lib/backup");
        const report = await runBackupSafely(
          currentProject.id,
          `approve phase ${phase} — ${phaseDef.title}`
        );
        if (report.startsWith("error:") || report.startsWith("skipped")) {
          warnings.push(`backup GitHub: ${report}`);
        }
      } catch (e: any) {
        console.warn("[approve] backup hook falhou:", e);
        warnings.push(`backup GitHub falhou (não crítico): ${e?.message ?? e}`);
      }

      // Ao aprovar a Etapa 12, extrai o manifest <manifest>...</manifest>
      // emitido pelo Asset Producer e persiste no metadata para o Batch
      // Producer usar depois.
      if (phase === 12) {
        try {
          const manifest = extractManifestFromDocument(doc.content);
          if (manifest) {
            await documentsRepo.setManifest(doc.id, manifest);
            console.info(
              `[approve] manifest extraido: ${manifest.assets.length} assets`
            );
          } else {
            warnings.push(
              "Etapa 12 aprovada, mas nenhum bloco <manifest> valido foi encontrado. Use o botao 'Extrair manifest via IA' no Batch Producer para gerar a partir do texto existente."
            );
          }
        } catch (e: any) {
          console.warn("[approve] extract manifest falhou:", e);
          warnings.push(
            `extracao de manifest da Etapa 12 falhou: ${e?.message ?? e}`
          );
        }
      }

      // Ao aprovar a Etapa 13, gera automaticamente o GDD consolidado
      // em exports/gdd-<data>.md e exports/gdd-latest.md (briefing estável).
      if (phase === 13) {
        try {
          const path = await exportProjectMarkdown(
            currentProject.id,
            currentProject.name,
            { alsoLatest: true }
          );
          console.info("[approve] GDD exportado automaticamente:", path);
        } catch (e: any) {
          console.warn("[approve] auto-export GDD falhou:", e);
          warnings.push(
            `auto-export do GDD Markdown falhou: ${e?.message ?? e}`
          );
        }
      }

      if (warnings.length) {
        setPartialError(
          `Aprovado, mas com avisos:\n- ${warnings.join("\n- ")}`
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function markRevision() {
    if (!doc) return;
    setBusy(true);
    try {
      await documentsRepo.setStatus(doc.id, "needs_revision");
      await refreshDocuments();
    } finally {
      setBusy(false);
    }
  }

  async function exportMarkdown() {
    if (!currentProject) return;
    setBusy(true);
    try {
      const path = await exportProjectMarkdown(currentProject.id, currentProject.name);
      alert(`Exportado em:\n${path}`);
    } catch (e: any) {
      alert(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-card/40">
        <div className="flex items-center gap-2">
          <span
            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ background: `${agent.color}22`, color: agent.color }}
            title={`Etapa ${phaseLabel(phaseDef)}`}
          >
            {phaseLabel(phaseDef)}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{phaseDef.title}</span>
            <span className="text-[11px] text-muted-foreground">
              {agent.displayName} · {phaseDef.subtitle}
            </span>
          </div>
        </div>
        <div className="flex-1" />
        {doc && <DocStatusBadge status={doc.status} />}
        {doc && (
          <span className="text-[11px] text-muted-foreground">
            v{doc.version} · {formatDate(doc.updated_at)}
          </span>
        )}
        <div className="flex items-center gap-1">
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" /> Editar
            </Button>
          )}
          {editing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  setContent(doc?.content ?? "");
                  setEditing(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7"
                onClick={saveManual}
                disabled={busy}
              >
                Salvar
              </Button>
            </>
          )}
          {doc && doc.status !== "approved" && (
            <Button
              variant="glow"
              size="sm"
              className="h-7"
              onClick={approveDocument}
              disabled={busy}
            >
              <CheckCircle2 className="h-3 w-3" /> Aprovar
            </Button>
          )}
          {doc && doc.status === "approved" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={markRevision}
              disabled={busy}
            >
              <RefreshCw className="h-3 w-3" /> Revisar
            </Button>
          )}
          {phase === 13 && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7"
              onClick={exportMarkdown}
              disabled={busy}
            >
              <FileDown className="h-3 w-3" /> Exportar MD
            </Button>
          )}
        </div>
      </div>

      {partialError && (
        <div className="flex items-start gap-2 px-4 py-2 border-b border-destructive/40 bg-destructive/10 text-[12px] text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap flex-1 font-sans">{partialError}</pre>
          <button
            type="button"
            onClick={() => setPartialError(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            fechar
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <LiveOrStatic
          phase={phase}
          doc={doc ?? null}
          editing={editing}
          title={title}
          content={content}
          setTitle={setTitle}
          setContent={setContent}
          agentName={agent.displayName}
          recoverable={recoverable}
          onRecover={recoverFromConversation}
          busy={busy}
          isStreaming={isStreaming && streamingPhase === phase}
          streamingText={isStreaming && streamingPhase === phase ? streamingText : ""}
        />
      </div>
    </div>
  );
}

interface LiveOrStaticProps {
  phase: number;
  doc: PhaseDocument | null;
  editing: boolean;
  title: string;
  content: string;
  setTitle: (v: string) => void;
  setContent: (v: string) => void;
  agentName: string;
  recoverable: { messageId: string; title: string; content: string } | null;
  onRecover: () => void;
  busy: boolean;
  isStreaming: boolean;
  streamingText: string;
}

function LiveOrStatic(props: LiveOrStaticProps) {
  // Extrai preview ao vivo do <document> parcial enquanto o stream roda.
  // Suporta documento ainda sem </document> — mostra o que tem até o cursor.
  const live = props.isStreaming ? extractLivePreview(props.streamingText) : null;

  if (props.editing) {
    return (
      <div className="h-full flex flex-col p-4 gap-2">
        <input
          className="bg-transparent text-lg font-semibold outline-none border-b border-border/60 pb-1"
          value={props.title}
          onChange={(e) => props.setTitle(e.target.value)}
        />
        <Textarea
          className="flex-1 font-mono text-sm"
          value={props.content}
          onChange={(e) => props.setContent(e.target.value)}
        />
      </div>
    );
  }

  // Preview ao vivo tem prioridade visual quando está streamando nesta fase,
  // mas preserva o doc antigo abaixo se houver (assim não fica tela branca).
  if (live && live.body.length > 0) {
    return (
      <ScrollArea className="h-full">
        <article className="prose prose-invert prose-sm max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2 mb-2 text-[11px] text-primary/90">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>ao vivo · {props.agentName} está escrevendo…</span>
          </div>
          <h1>{live.title ?? "Rascunho ao vivo"}</h1>
          <div className="relative after:content-['▌'] after:text-primary after:animate-pulse after:inline-block after:ml-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{live.body}</ReactMarkdown>
          </div>
        </article>
      </ScrollArea>
    );
  }

  // Streaming mas ainda não apareceu o <document> — mostra "escrevendo…".
  if (props.isStreaming) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
          {props.agentName} está pensando…
        </div>
      </div>
    );
  }

  if (props.doc) {
    return (
      <ScrollArea className="h-full">
        <article className="prose prose-invert prose-sm max-w-3xl mx-auto px-6 py-6">
          <h1>{props.doc.title}</h1>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {props.doc.content}
          </ReactMarkdown>
        </article>
      </ScrollArea>
    );
  }

  // Empty state com botão de recuperação quando há <document> cru preservado.
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
      <div className="max-w-md space-y-3">
        <p>
          Nenhum documento nesta etapa ainda. Converse com{" "}
          <strong className="text-foreground">{props.agentName}</strong> no
          painel à direita até ele produzir um{" "}
          <code className="text-xs bg-accent/40 px-1 rounded">
            &lt;document&gt;
          </code>
          .
        </p>
        {props.recoverable && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-left space-y-2">
            <p className="text-xs text-amber-200">
              Encontrei um{" "}
              <code className="text-[10px] bg-background/40 px-1 rounded">
                &lt;document&gt;
              </code>{" "}
              preservado em uma mensagem anterior desta conversa (<strong>{props.recoverable.title}</strong>) que nunca foi persistido.
              Provavelmente a fase foi bloqueada por um CHECK antigo do SQLite.
            </p>
            <Button
              variant="glow"
              size="sm"
              className="h-7 w-full"
              onClick={props.onRecover}
              disabled={props.busy}
            >
              <LifeBuoy className="h-3 w-3" /> Recuperar documento da conversa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Regex usada só pra preview. extractDocument já faz o trabalho completo
// para persistência; aqui só queremos título e body parcial pro render em
// streaming, aceitando texto sem </document>.
const LIVE_DOC_OPEN = /<document\s+title=["']([^"']+)["']\s*>/i;

function extractLivePreview(
  raw: string
): { title: string | null; body: string } | null {
  if (!raw) return null;
  const m = LIVE_DOC_OPEN.exec(raw);
  if (!m) return null;
  const start = m.index + m[0].length;
  const after = raw.slice(start);
  const closeIdx = after.search(/<\/document>/i);
  const body = closeIdx >= 0 ? after.slice(0, closeIdx) : after;
  return { title: m[1].trim(), body: body.trim() };
}

function DocStatusBadge({ status }: { status: PhaseDocument["status"] }) {
  const map: Record<PhaseDocument["status"], { label: string; variant: any }> =
    {
      draft: { label: "rascunho", variant: "outline" },
      completed: { label: "concluído", variant: "secondary" },
      approved: { label: "aprovado", variant: "success" },
      needs_revision: { label: "revisar", variant: "warning" },
    };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

async function markDependentsForRevision(projectId: string, changedPhase: number) {
  const all = await documentsRepo.listByProject(projectId);
  for (const phase of PHASES) {
    if (phase.number <= changedPhase) continue;
    if (!phase.dependsOn.includes(changedPhase)) continue;
    const d = all.find((x) => x.phase_number === phase.number);
    if (d && d.status === "approved") {
      await documentsRepo.setStatus(d.id, "needs_revision");
    }
  }
  // Atualiza o projeto current phase caso necessário
  await projectsRepo.update(projectId, {});
}
