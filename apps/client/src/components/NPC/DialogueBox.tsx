import type { CSSProperties } from 'react';
import type { DialogueLine } from '../../hooks/useNPCDialogues';

export interface DialogueBoxProps {
  /** The active dialogue line to display, or null/undefined when hidden. */
  dialogue: DialogueLine | null | undefined;
  /** Whether the box should be visible. */
  isVisible: boolean;
  /** Called when the player dismisses the dialogue. */
  onClose: () => void;
  /** Called when the player advances to the next line (if provided). */
  onNext?: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  bottom: '6rem',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '640px',
  maxWidth: '92vw',
  background: 'rgba(15, 23, 42, 0.97)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(71, 85, 105, 0.8)',
  borderRadius: '1rem',
  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  color: '#f1f5f9',
  fontFamily: 'inherit',
  zIndex: 50,
  pointerEvents: 'auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.5rem 1rem',
  borderBottom: '1px solid rgba(71, 85, 105, 0.6)',
};

const nameStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  color: '#f1f5f9',
  margin: 0,
};

const closeButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '1rem',
  lineHeight: 1,
  padding: '0.25rem',
  transition: 'color 0.15s',
};

const bodyStyle: CSSProperties = {
  padding: '1rem 1.25rem',
  fontSize: '0.9375rem',
  lineHeight: 1.6,
  color: '#e2e8f0',
  minHeight: '3.5rem',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  padding: '0.5rem 1rem 0.75rem',
  borderTop: '1px solid rgba(71, 85, 105, 0.4)',
};

const hintStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  marginRight: 'auto',
};

const kbdStyle: CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '0.25rem',
  padding: '0 0.3rem',
  fontSize: '0.7rem',
};

const nextButtonStyle: CSSProperties = {
  background: '#f59e0b',
  color: '#0f172a',
  border: 'none',
  borderRadius: '0.5rem',
  padding: '0.375rem 0.875rem',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
};

/**
 * DialogueBox — displays a single NPC dialogue line in a game-style box
 * anchored at the bottom of the screen. The player can dismiss it or advance
 * to the next line via the onNext callback (if supplied).
 *
 * Controlled entirely by props; pair with useNPCDialogues for state management.
 */
export function DialogueBox({ dialogue, isVisible, onClose, onNext }: DialogueBoxProps) {
  if (!isVisible || !dialogue) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="false" aria-label="NPC dialogue">
      <header style={headerStyle}>
        <h2 style={nameStyle}>{dialogue.npcName}</h2>
        <button
          style={closeButtonStyle}
          onClick={onClose}
          title="Fechar (Esc)"
          aria-label="Fechar diálogo"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
          }}
        >
          ✕
        </button>
      </header>

      <div style={bodyStyle}>
        <p style={{ margin: 0 }}>{dialogue.text}</p>
      </div>

      <footer style={footerStyle}>
        <span style={hintStyle}>
          <kbd style={kbdStyle}>Esc</kbd> fechar
          {onNext && (
            <>
              {' '}
              &nbsp;·&nbsp; <kbd style={kbdStyle}>Enter</kbd> continuar
            </>
          )}
        </span>
        {onNext && (
          <button style={nextButtonStyle} onClick={onNext}>
            Continuar
          </button>
        )}
        <button
          style={{ ...nextButtonStyle, background: '#1e293b', color: '#94a3b8' }}
          onClick={onClose}
        >
          Fechar
        </button>
      </footer>
    </div>
  );
}
