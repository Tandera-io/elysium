// Hook that wraps the dialogue store and adds NPC-initiated greeting.
//
// When a dialogue is opened, the NPC speaks first:
//   1. POST /api/dialogue with playerInput='[iniciou conversa]' to get an
//      AI-generated greeting.
//   2. On network/server failure, inject a hand-written fallback greeting so
//      the dialogue box is never blank.
//
// Usage:
//   const { npcId, npc, history, pending, error, open, close, send } = useNPCDialogue();

import { useEffect, useCallback, useRef } from 'react';
import { useDialogueStore } from '../systems/dialogue/dialogueStore';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';
import { useNpcStore } from '../systems/npc/npcStore';
import { getNpcGreeting } from '../stores/npcStore';

export function useNPCDialogue() {
  const npcId = useDialogueStore((s) => s.npcId);
  const history = useDialogueStore((s) => s.history);
  const pending = useDialogueStore((s) => s.pending);
  const error = useDialogueStore((s) => s.error);
  const _open = useDialogueStore((s) => s.open);
  const close = useDialogueStore((s) => s.close);
  const _send = useDialogueStore((s) => s.send);
  const npcs = useNpcStore((s) => s.npcs);

  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  // Tracks which npcId we've already initiated so we don't double-fire on
  // re-renders that occur while the fetch is in flight.
  const initiatedRef = useRef<string | null>(null);

  const getWorldContext = useCallback(
    () => ({
      hour,
      dayInSeason,
      season: currentSeason({
        hour,
        dayInSeason,
        seasonIndex,
        year,
        realSecondsPerDay: 0,
        paused: false,
      }),
      year,
    }),
    [hour, dayInSeason, seasonIndex, year],
  );

  // NPC-initiated greeting: fire once per opened dialogue.
  useEffect(() => {
    if (!npcId || history.length > 0 || pending || initiatedRef.current === npcId) return;
    initiatedRef.current = npcId;

    useDialogueStore.setState({ pending: true });

    fetch('/api/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId,
        playerInput: '[iniciou conversa]',
        worldContext: getWorldContext(),
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        useDialogueStore.setState((s) => ({
          history: [
            ...s.history,
            { who: 'npc', text: data.npcReply, emotion: data.emotion, timestamp: Date.now() },
          ],
          pending: false,
        }));
      })
      .catch(() => {
        const greeting = getNpcGreeting(npcId);
        useDialogueStore.setState((s) => ({
          history: [
            ...s.history,
            { who: 'npc', text: greeting, emotion: 'neutral', timestamp: Date.now() },
          ],
          pending: false,
        }));
      });
  }, [npcId, history.length, pending, getWorldContext]);

  // Reset initiation tracking so the next open() triggers a new greeting.
  useEffect(() => {
    if (!npcId) initiatedRef.current = null;
  }, [npcId]);

  const open = useCallback(
    (id: string) => {
      initiatedRef.current = null;
      _open(id);
    },
    [_open],
  );

  const send = useCallback(
    (input: string) => _send(input, getWorldContext()),
    [_send, getWorldContext],
  );

  return {
    npcId,
    history,
    pending,
    error,
    open,
    close,
    send,
    npc: npcId ? (npcs[npcId] ?? null) : null,
  };
}
