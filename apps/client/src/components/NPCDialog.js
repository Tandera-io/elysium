// /Users/ngs/Desktop/NGS 2.0/elysium/apps/client/src/components/NPCDialog.js
//
// NPCDialog — self-contained NPC conversation component using pre-defined
// quick-reply buttons. Pairs with the full-text DialogueBox (DialogueBox.tsx)
// and can be mounted anywhere in the React tree.
//
// Behaviour:
//   • Reads active NPC from dialogueStore (npcId).
//   • Starts with greeting options; each reply opens a topic group or sends the
//     input text to the server via dialogueStore.send().
//   • Escape or the ✕ button closes dialogue.
//   • Falls back gracefully to a plain text input when no quick-reply config
//     exists for the active NPC.

import { useEffect, useRef, useState } from 'react';
import { useNpcStore, useDialogueStore, getNpcDialogue } from '../stores/npcStore';
import { useTimeStore, currentSeason } from '../systems/time/timeStore';

/**
 * NPCDialog
 *
 * Renders the quick-reply dialogue UI when an NPC is active (dialogueStore.npcId
 * is set). Renders nothing otherwise.
 */
export function NPCDialog() {
  const npcId = useDialogueStore((s) => s.npcId);
  const history = useDialogueStore((s) => s.history);
  const pending = useDialogueStore((s) => s.pending);
  const error = useDialogueStore((s) => s.error);
  const close = useDialogueStore((s) => s.close);
  const send = useDialogueStore((s) => s.send);

  const npcs = useNpcStore((s) => s.npcs);
  const hour = useTimeStore((s) => s.hour);
  const dayInSeason = useTimeStore((s) => s.dayInSeason);
  const seasonIndex = useTimeStore((s) => s.seasonIndex);
  const year = useTimeStore((s) => s.year);

  const [activeTopic, setActiveTopic] = useState(null);
  const scrollRef = useRef(null);

  // Reset topic when a new NPC conversation opens.
  useEffect(() => {
    if (npcId) setActiveTopic(null);
  }, [npcId]);

  // Auto-scroll to bottom when history updates.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, pending]);

  // Close on Escape.
  useEffect(() => {
    if (!npcId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [npcId, close]);

  if (!npcId) return null;
  const npc = npcs[npcId];
  if (!npc) return null;

  const dialogue = getNpcDialogue(npcId);
  const season = currentSeason({ seasonIndex });
  const worldCtx = { hour, dayInSeason, season, year };

  /** Send a pre-defined quick reply and optionally switch to a topic group. */
  const handleQuickReply = (input, nextTopic) => {
    void send(input, worldCtx);
    if (nextTopic !== undefined) setActiveTopic(nextTopic);
  };

  // Determine which quick-reply buttons to show.
  let quickReplies = [];
  if (dialogue) {
    if (activeTopic && dialogue.topics[activeTopic]) {
      quickReplies = dialogue.topics[activeTopic];
    } else {
      quickReplies = dialogue.greetings;
    }
  }

  // Topic group buttons (shown when looking at greetings).
  const topicKeys = dialogue ? Object.keys(dialogue.topics) : [];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '6rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 640,
        maxWidth: '92vw',
        background: 'rgba(15,23,42,0.96)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(100,116,139,0.4)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        color: '#f1f5f9',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(100,116,139,0.3)',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{npc.def.name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
            {npc.def.role}
          </div>
        </div>
        <button
          onClick={close}
          title="Fechar (Esc)"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 16,
            padding: '4px 8px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Conversation history */}
      <div
        ref={scrollRef}
        style={{
          maxHeight: 240,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: 13,
        }}
      >
        {history.length === 0 && !pending && (
          <span style={{ color: '#64748b', fontStyle: 'italic' }}>
            Diga olá para {npc.def.name}…
          </span>
        )}
        {history.map((turn, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: turn.who === 'player' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '6px 12px',
                borderRadius: 12,
                background: turn.who === 'player' ? '#f59e0b' : '#1e293b',
                color: turn.who === 'player' ? '#0f172a' : '#f1f5f9',
              }}
            >
              {turn.text}
              {turn.who === 'npc' && turn.emotion && (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>— {turn.emotion}</div>
              )}
            </div>
          </div>
        ))}
        {pending && <span style={{ color: '#64748b', fontStyle: 'italic' }}>…pensando</span>}
        {error && <span style={{ color: '#f87171', fontSize: 11 }}>erro: {error}</span>}
      </div>

      {/* Quick-reply buttons */}
      {dialogue && quickReplies.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid rgba(100,116,139,0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {quickReplies.map((r) => (
            <button
              key={r.label}
              disabled={pending}
              onClick={() => handleQuickReply(r.input, null)}
              style={{
                background: '#1e293b',
                border: '1px solid rgba(100,116,139,0.4)',
                borderRadius: 8,
                color: '#e2e8f0',
                cursor: pending ? 'not-allowed' : 'pointer',
                fontSize: 12,
                opacity: pending ? 0.5 : 1,
                padding: '4px 10px',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Topic switcher (shown at greeting level) */}
      {dialogue && topicKeys.length > 0 && !activeTopic && (
        <div
          style={{
            padding: '6px 12px',
            borderTop: '1px solid rgba(100,116,139,0.2)',
            display: 'flex',
            gap: 6,
          }}
        >
          {topicKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTopic(key)}
              style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 8,
                color: '#fbbf24',
                cursor: 'pointer',
                fontSize: 11,
                padding: '3px 8px',
                textTransform: 'capitalize',
              }}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* Back button when in a topic */}
      {activeTopic && (
        <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(100,116,139,0.2)' }}>
          <button
            onClick={() => setActiveTopic(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 0',
            }}
          >
            ← voltar
          </button>
        </div>
      )}
    </div>
  );
}

export default NPCDialog;
