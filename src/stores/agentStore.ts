import { create } from "zustand";
import { conversationsRepo } from "@/lib/db";
import type { AgentConversation, ConversationMessage } from "@/types/domain";
import { agentForPhase, AGENTS } from "@/agents/agents";
import type { AgentDefinition } from "@/agents/base";

interface AgentState {
  conversation: AgentConversation | null;
  messages: ConversationMessage[];
  streamingText: string;
  isStreaming: boolean;
  // Número da fase (phase.number, p.ex. 14..21 pra expansão narrativa) cujo
  // stream está em andamento. Permite que o DocumentView saiba se o texto
  // parcial em `streamingText` pertence à fase que ele está renderizando.
  streamingPhase: number | null;
  activeAgent: AgentDefinition | null;
  error: string | null;

  loadForPhase: (projectId: string, phase: number) => Promise<void>;
  appendLocal: (message: ConversationMessage) => void;
  setStreaming: (v: boolean) => void;
  setStreamingText: (txt: string) => void;
  setStreamingPhase: (phase: number | null) => void;
  resetError: () => void;
  setError: (e: string | null) => void;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
  conversation: null,
  messages: [],
  streamingText: "",
  isStreaming: false,
  streamingPhase: null,
  activeAgent: null,
  error: null,

  loadForPhase: async (projectId, phase) => {
    const agent = agentForPhase(phase);
    set({ activeAgent: agent, error: null });
    const conv = await conversationsRepo.getOrCreate(projectId, agent.type, phase);
    const msgs = await conversationsRepo.listMessages(conv.id);
    // Se a conversa está vazia, injeta a mensagem de boas-vindas do agente.
    if (msgs.length === 0) {
      const welcome = await conversationsRepo.appendMessage(
        conv.id,
        "agent",
        agent.firstMessage,
        { kind: "welcome" }
      );
      set({ conversation: conv, messages: [welcome], streamingText: "" });
    } else {
      set({ conversation: conv, messages: msgs, streamingText: "" });
    }
  },

  appendLocal: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  setStreaming: (v) => set({ isStreaming: v }),
  setStreamingText: (txt) => set({ streamingText: txt }),
  setStreamingPhase: (phase) => set({ streamingPhase: phase }),
  resetError: () => set({ error: null }),
  setError: (e) => set({ error: e }),
}));

export function agentDefinitions() {
  return Object.values(AGENTS);
}
