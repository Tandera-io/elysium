import { create } from 'zustand';
import type { DialogueResponse, NpcEmotion } from '@elysium/shared';
import { getActionResponse, PLAYER_ACTIONS } from '../../dialogue/pipeline/index.js';

export interface DialogueTurn {
  who: 'player' | 'npc';
  text: string;
  emotion?: NpcEmotion;
  timestamp: number;
}

export interface DialogueState {
  /** If set, dialogue is open with this NPC. */
  npcId: string | null;
  history: DialogueTurn[];
  /** True while waiting for a reply. */
  pending: boolean;
  /** Error from last send, if any. */
  error: string | null;
  /** Interaction counts per NPC for pipeline context classification. */
  interactionCounts: Record<string, number>;
}

export interface DialogueActions {
  open: (npcId: string) => void;
  close: () => void;
  send: (
    input: string,
    world: { hour: number; dayInSeason: number; season: string; year: number },
  ) => Promise<void>;
}

/**
 * Classify a player's free-text input as a PLAYER_ACTIONS key for the
 * offline pipeline fallback. We do a simple keyword scan in Portuguese.
 */
function classifyPlayerInput(input: string): string {
  const lower = input.toLowerCase();
  if (/tchau|até logo|adeus|até mais/.test(lower)) return PLAYER_ACTIONS.GOODBYE;
  if (/comprar|compro|quanto custa|tem .* vend/.test(lower)) return PLAYER_ACTIONS.BUY;
  if (/vender|vendo|quanto você paga|comprando/.test(lower)) return PLAYER_ACTIONS.SELL;
  if (/presente|trouxe pra você|gift/.test(lower)) return PLAYER_ACTIONS.GIVE_GIFT;
  if (/missão|pedido|precisa de|posso (te |)ajudar|buscar|conseguir/.test(lower))
    return PLAYER_ACTIONS.QUEST_ACCEPT;
  if (/entregar|trouxe|aqui está|cumpri/.test(lower)) return PLAYER_ACTIONS.QUEST_COMPLETE;
  if (/plantar|plantar|colher|semear/.test(lower)) return PLAYER_ACTIONS.PLANT;
  if (/regar|irrigar/.test(lower)) return PLAYER_ACTIONS.WATER;
  if (/colher|colhei/.test(lower)) return PLAYER_ACTIONS.HARVEST;
  return PLAYER_ACTIONS.TALK;
}

export const useDialogueStore = create<DialogueState & DialogueActions>((set, get) => ({
  npcId: null,
  history: [],
  pending: false,
  error: null,
  interactionCounts: {},
  open: (npcId) => set({ npcId, history: [], error: null }),
  close: () => set({ npcId: null, history: [], pending: false, error: null }),
  send: async (input, world) => {
    const npcId = get().npcId;
    if (!npcId) return;
    const trimmed = input.trim();
    if (trimmed.length === 0) return;

    set((s) => ({
      history: [...s.history, { who: 'player', text: trimmed, timestamp: Date.now() }],
      pending: true,
      error: null,
    }));

    try {
      const res = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, playerInput: trimmed, worldContext: world }),
      });

      // If server is unavailable (no API key), fall back to offline pipeline
      if (res.status === 503) {
        const interactionCount = get().interactionCounts[npcId] ?? 0;
        const action = classifyPlayerInput(trimmed);
        const reply = getActionResponse(npcId, action, { interactionCount, heartLevel: 0 });
        const emotion: NpcEmotion =
          action === PLAYER_ACTIONS.GIVE_GIFT || action === PLAYER_ACTIONS.QUEST_COMPLETE
            ? 'happy'
            : 'neutral';
        set((s) => ({
          history: [...s.history, { who: 'npc', text: reply, emotion, timestamp: Date.now() }],
          pending: false,
          interactionCounts: {
            ...s.interactionCounts,
            [npcId]: interactionCount + 1,
          },
        }));
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as DialogueResponse;
      set((s) => ({
        history: [
          ...s.history,
          {
            who: 'npc',
            text: data.npcReply,
            emotion: data.emotion,
            timestamp: Date.now(),
          },
        ],
        pending: false,
        interactionCounts: {
          ...s.interactionCounts,
          [npcId]: (s.interactionCounts[npcId] ?? 0) + 1,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ pending: false, error: message });
    }
  },
}));
