/**
 * Inventory.jsx — Compact HUD inventory panel.
 *
 * Displays player gold and item slots in a fixed bottom-center panel.
 * Toggle visibility with the [I] key.
 *
 * Reads from useInventoryHudStore (stores/inventory.js).
 * Styled via styles/Inventory.css using inv-* class names.
 */

import { useEffect, useState } from 'react';
import { useInventoryHudStore } from '../stores/inventory.js';
import '../styles/Inventory.css';

/** Max number of visible slots in the HUD row. */
const MAX_VISIBLE_SLOTS = 12;

export function Inventory() {
  const items = useInventoryHudStore((s) => s.items);
  const gold = useInventoryHudStore((s) => s.gold);
  const [open, setOpen] = useState(true);

  // Toggle with [I] key.
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.code === 'KeyI' &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA'
      ) {
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  // Pad items to MAX_VISIBLE_SLOTS with null entries so empty slots render.
  const visibleItems = items.slice(0, MAX_VISIBLE_SLOTS);
  const padded = [
    ...visibleItems,
    ...Array(Math.max(0, MAX_VISIBLE_SLOTS - visibleItems.length)).fill(null),
  ];

  return (
    <div className="inv-panel" role="complementary" aria-label="Inventário">
      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div className="inv-header">
        <span className="inv-title">Inventário</span>
        <span className="inv-gold">
          <span aria-hidden="true">🪙</span> {gold}g
        </span>
        <span className="inv-hint">[I] fechar</span>
      </div>

      {/* ── Item slots ────────────────────────────────────────────────────── */}
      <div className="inv-slots" role="list" aria-label="Itens do inventário">
        {padded.map((item, i) =>
          item ? (
            <ItemSlot key={item.id + '-' + i} item={item} />
          ) : (
            <div
              key={'empty-' + i}
              className="inv-slot inv-slot--empty"
              role="listitem"
              aria-label="Slot vazio"
            />
          ),
        )}
      </div>
    </div>
  );
}

// ─── ItemSlot ─────────────────────────────────────────────────────────────────

function ItemSlot({ item }) {
  return (
    <div
      className="inv-slot"
      role="listitem"
      aria-label={`${item.name}, quantidade ${item.quantity}`}
      data-type={item.type}
    >
      <span aria-hidden="true">{item.icon}</span>

      {item.quantity > 1 && (
        <span className="inv-qty" aria-hidden="true">
          {item.quantity}
        </span>
      )}

      {/* CSS-driven tooltip — visible on :hover via Inventory.css */}
      <div className="inv-slot-tooltip" role="tooltip">
        <div className="inv-slot-tooltip-name">{item.name}</div>
        <div className="inv-slot-tooltip-sub">qtd {item.quantity}</div>
      </div>
    </div>
  );
}

export default Inventory;
