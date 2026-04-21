// Cliente do Claude Code CLI (renderer side).
//
// Invoca `claude_prompt_stream` no Rust, que spawna o binário `claude` com
// `--output-format stream-json --include-partial-messages --verbose` e emite
// eventos num canal dedicado por stream.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { nanoid } from "nanoid";
import { isTauri } from "./utils";

export interface ClaudeMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamOptions {
  systemPrompt?: string;
  appendSystem?: string;
  model?: string;
  /** Histórico anterior para concatenar como contexto. */
  history?: ClaudeMessage[];
  /** Mensagem nova do usuário. */
  userMessage: string;
  onText?: (delta: string) => void;
  onEvent?: (event: ClaudeEvent) => void;
  onDone?: (result: StreamResult) => void;
  signal?: AbortSignal;
  /**
   * Diretório de trabalho do processo. Quando fornecido, o Claude Code
   * opera como agente (Read/Edit/Write/Bash) dentro desse cwd. Usado pela
   * Fase 14 — cada agente de código aponta para `projects/<id>/game/`.
   */
  cwd?: string;
  /** `bypassPermissions` (default), `acceptEdits`, ou `plan`. */
  permissionMode?: "bypassPermissions" | "acceptEdits" | "plan";
}

export interface ClaudeEvent {
  stream_id: string;
  kind: string;
  data: any;
}

export interface StreamResult {
  success: boolean;
  fullText: string;
  cost_usd?: number;
  duration_ms?: number;
  code?: number;
  error?: string;
}

export async function isClaudeInstalled(): Promise<{
  ok: boolean;
  version?: string;
  error?: string;
}> {
  if (!isTauri()) return { ok: false, error: "ambiente não-Tauri" };
  try {
    const version = await invoke<string>("claude_check_installed");
    return { ok: true, version };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/**
 * Executa um prompt no Claude CLI com streaming. Retorna `{ cancel, done }`.
 */
export function streamClaude(options: StreamOptions): {
  streamId: string;
  cancel: () => Promise<void>;
  done: Promise<StreamResult>;
} {
  const streamId = nanoid();
  const fullPrompt = buildPrompt(options);

  let fullText = "";
  let unlisten: UnlistenFn | null = null;
  let resolved = false;

  const done = new Promise<StreamResult>((resolve) => {
    (async () => {
      try {
        const channel = await invoke<string>("claude_prompt_stream", {
          args: {
            stream_id: streamId,
            prompt: fullPrompt,
            system_prompt: options.systemPrompt,
            append_system: options.appendSystem,
            model: options.model,
            cwd: options.cwd,
            permission_mode: options.permissionMode,
          },
        });

        unlisten = await listen<ClaudeEvent>(channel, (evt) => {
          const e = evt.payload;
          try {
            options.onEvent?.(e);
          } catch {
            // ignore
          }
          if (e.kind === "stream_event") {
            const type = e.data?.event?.type;
            if (type === "content_block_delta") {
              const delta = e.data?.event?.delta;
              if (delta?.type === "text_delta" && typeof delta.text === "string") {
                fullText += delta.text;
                options.onText?.(delta.text);
              }
            }
          } else if (e.kind === "assistant") {
            // mensagem final de assistant
            const msg = e.data?.message;
            const content = msg?.content;
            if (Array.isArray(content)) {
              const txt = content
                .filter((c: any) => c?.type === "text")
                .map((c: any) => c.text ?? "")
                .join("");
              if (txt.length > fullText.length) {
                const delta = txt.slice(fullText.length);
                fullText = txt;
                if (delta) options.onText?.(delta);
              }
            }
          } else if (e.kind === "result") {
            // evento final com custos
            if (!resolved) {
              resolved = true;
              const result: StreamResult = {
                success: e.data?.is_error === false || e.data?.subtype === "success",
                fullText,
                cost_usd: e.data?.total_cost_usd,
                duration_ms: e.data?.duration_ms,
              };
              options.onDone?.(result);
              if (unlisten) unlisten();
              resolve(result);
            }
          } else if (e.kind === "done") {
            if (!resolved) {
              resolved = true;
              const result: StreamResult = {
                success: e.data?.success ?? false,
                fullText,
                code: e.data?.code,
                error: e.data?.error,
              };
              options.onDone?.(result);
              if (unlisten) unlisten();
              resolve(result);
            }
          } else if (e.kind === "stderr") {
            // acumula para diagnóstico
            console.warn("[claude stderr]", e.data?.line);
          }
        });

        if (options.signal) {
          options.signal.addEventListener("abort", () => {
            invoke("claude_cancel", { streamId }).catch(() => {});
          });
        }
      } catch (e: any) {
        if (!resolved) {
          resolved = true;
          const result: StreamResult = {
            success: false,
            fullText,
            error: String(e?.message ?? e),
          };
          options.onDone?.(result);
          resolve(result);
        }
      }
    })();
  });

  return {
    streamId,
    cancel: async () => {
      await invoke("claude_cancel", { streamId }).catch(() => {});
    },
    done,
  };
}

function buildPrompt(options: StreamOptions): string {
  const parts: string[] = [];
  if (options.history && options.history.length > 0) {
    parts.push("## Histórico da conversa\n");
    for (const m of options.history) {
      const label =
        m.role === "user" ? "Usuário" : m.role === "assistant" ? "Agente" : "Sistema";
      parts.push(`**${label}:**\n${m.content}\n`);
    }
    parts.push("\n---\n");
  }
  parts.push("## Nova mensagem do usuário\n");
  parts.push(options.userMessage);
  return parts.join("\n");
}
