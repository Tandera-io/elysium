// /Users/ngs/Desktop/NGS 2.0/elysium/apps/client/src/components/NPCDialog.js
//
// NPCDialog — branching conversation-tree dialogue component for Elysium NPCs.
//
// Behaviour:
//   • Renders only when useNpcDialogueStore has an active NPC (i.e. a hand-authored
//     tree is open). NPCs without a tree use DialogueBox.tsx exclusively.
//   • The player sees the NPC's current speech plus labelled choice buttons.
//   • Selecting a choice either advances to the next tree node or closes dialogue.
//   • "Falar livremente" closes the tree while leaving dialogueStore.npcId set,
//     so DialogueBox.tsx (with full AI chat + quest panel) takes over seamlessly.
//   • Escape or the close button closes both stores.
//   • Fully offline in tree mode — no server round-trips needed.
//
// Coexists with DialogueBox.tsx:
//   NPCDialog   → tree mode (Nina, Dorinha) — this component
//   DialogueBox → AI chat + quest panel     — apps/client/src/ui/DialogueBox.tsx

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
  useNpcStore,
  useDialogueStore,
  useNpcDialogueStore,
  NPC_DIALOGUES,
} from '../stores/npcStore';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const S: Record<string, CSSProperties> = {
  overlay: {
    position: 'absolute',
    bottom: '6rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 640,
    maxWidth: '92vw',
    background: 'rgba(15,23,42,0.97)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(100,116,139,0.45)',
    borderRadius: 18,
    boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
    color: '#f1f5f9',
    fontFamily: 'system-ui, sans-serif',
    // Sit at z-index 60 — above DialogueBox (which uses z-index 50 equivalent)
    // so the tree view fully covers it when active.
    zIndex: 60,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(100,116,139,0.3)',
    background: 'rgba(30,41,59,0.6)',
  },
  npcName: { fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' },
  npcRole: { fontSize: 11, color: '#94a3b8', textTransform: 'capitalize', marginTop: 1 },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    padding: '2px 6px',
    borderRadius: 6,
  },
  treeBody: { padding: '16px 18px 12px' },
  npcSpeech: {
    fontSize: 14,
    lineHeight: 1.55,
    color: '#e2e8f0',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(100,116,139,0.25)',
    borderRadius: 12,
    padding: '10px 14px',
    marginBottom: 14,
  },
  choiceList: { display: 'flex', flexDirection: 'column', gap: 7 },
  choiceBtn: {
    background: 'rgba(30,41,59,0.9)',
    border: '1px solid rgba(100,116,139,0.35)',
    borderRadius: 10,
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 13,
    padding: '8px 14px',
    textAlign: 'left',
    transition: 'background 0.12s, border-color 0.12s',
  },
  choiceBtnHover: {
    background: 'rgba(59,130,246,0.18)',
    borderColor: 'rgba(59,130,246,0.5)',
  },
  footerRow: {
    padding: '8px 18px 10px',
    borderTop: '1px solid rgba(100,116,139,0.2)',
    display: 'flex',
    gap: 8,
  },
  switchBtn: {
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.35)',
    borderRadius: 8,
    color: '#fbbf24',
    cursor: 'pointer',
    fontSize: 11,
    padding: '4px 10px',
  },
};

// ---------------------------------------------------------------------------
// ChoiceButton — handles hover state without CSS classes
// ---------------------------------------------------------------------------
interface ChoiceButtonProps {
  label: string;
  onClick: () => void;
}

function ChoiceButton({ label, onClick }: ChoiceButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...S.choiceBtn, ...(hovered ? S.choiceBtnHover : {}) }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NPCDialog
// ---------------------------------------------------------------------------

/**
 * NPCDialog — tree-mode dialogue overlay.
 *
 * Renders only when useNpcDialogueStore has an active NPC (i.e. a hand-authored
 * tree is open for Nina or Dorinha). For all other NPCs or when the player
 * switches to free-text, this component hides itself and DialogueBox.tsx handles
 * the full AI chat + quest panel.
 *
 * Mount once in the component tree alongside <DialogueBox /> (e.g. in App.tsx).
 */
export function NPCDialog() {
  // AI dialogue store — source of truth for which NPC is being talked to.
  const npcId = useDialogueStore((s) => s.npcId);
  const aiClose = useDialogueStore((s) => s.close);

  // Tree dialogue store
  const treeNpcId = useNpcDialogueStore((s) => s.activeNpcId);
  const currentNodeId = useNpcDialogueStore((s) => s.currentNodeId);
  const treeOpen = useNpcDialogueStore((s) => s.open);
  const treeClose = useNpcDialogueStore((s) => s.close);
  const treeChoose = useNpcDialogueStore((s) => s.choose);

  // NPC world definitions (for name / role display)
  const npcs = useNpcStore((s) => s.npcs);

  // When dialogueStore opens a tree-capable NPC, start the tree.
  useEffect(() => {
    if (!npcId) return;
    if (NPC_DIALOGUES[npcId] && treeNpcId !== npcId) {
      treeOpen(npcId);
    }
    // intentionally omit treeNpcId/treeOpen from deps — only re-run when npcId changes
  }, [npcId]);

  // Escape closes tree (and ai store if requested).
  useEffect(() => {
    if (!treeNpcId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        treeClose();
        aiClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [treeNpcId, treeClose, aiClose]);

  // Only render when tree is active
  if (!treeNpcId) return null;
  const npc = npcs[treeNpcId];
  if (!npc) return null;

  const tree = NPC_DIALOGUES[treeNpcId]?.tree;
  const currentNode = tree?.[currentNodeId];

  const handleClose = () => {
    treeClose();
    aiClose();
  };

  // "Falar livremente" — keep dialogueStore open so DialogueBox takes over.
  const switchToAi = () => {
    treeClose();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={S.overlay}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.npcName}>{npc.def.name}</div>
          <div style={S.npcRole}>{npc.def.role}</div>
        </div>
        <button onClick={handleClose} title="Fechar (Esc)" style={S.closeBtn}>
          ✕
        </button>
      </div>

      {/* NPC speech + player choices */}
      {currentNode ? (
        <>
          <div style={S.treeBody}>
            <div style={S.npcSpeech}>{currentNode.text}</div>
            <div style={S.choiceList}>
              {currentNode.choices.map((choice) => (
                <ChoiceButton
                  key={choice.id}
                  label={choice.label}
                  onClick={() => treeChoose(choice.id)}
                />
              ))}
            </div>
          </div>

          {/* Switch to AI free-text mode (hands off to DialogueBox) */}
          <div style={S.footerRow}>
            <button onClick={switchToAi} style={S.switchBtn}>
              Falar livremente…
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: '16px 18px', color: '#64748b', fontStyle: 'italic', fontSize: 13 }}>
          {npc.def.name} não tem muito a dizer agora.
        </div>
      )}
    </div>
  );
}

export default NPCDialog;
