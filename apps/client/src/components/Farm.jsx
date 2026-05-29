/**
 * Farm.jsx — Stardew-gap farming HUD overlay.
 *
 * Renders a 2D grid overlay of the farm area (5×5 tiles around the player)
 * so the player can:
 *   1. See all tiles with growth-stage colour indicators.
 *   2. Click a tile to apply the active tool (hoe / water / seed / harvest).
 *   3. Read feedback messages after each action.
 *
 * This component lives in the React DOM (not inside <Canvas />) so it can
 * safely use regular CSS, onClick handlers, and Zustand hooks without R3F
 * constraints.
 *
 * The component is intentionally opt-in: it only renders when the player
 * selects one of the farming tools (hoe, water, seed_*, harvest).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFarmStore } from '../systems/farming/farmStore';
import { useToolStore } from '../store/toolStore';
import { usePlayerStore } from '../store/playerStore';
import { worldToTile } from '../engine/world/WorldGrid';
import { CROPS, stageForDayCount, isMature } from '../data/crops';
import { dispatchToolAction } from '../features/farming/sagas';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tools that should open the farm HUD. */
const FARMING_TOOLS = new Set([
  'hoe',
  'water',
  'seed_wheat',
  'seed_tomato',
  'seed_corn',
  'harvest',
]);

/** Half-width of the grid view in tiles around the player. */
const VIEW_RADIUS = 2; // shows a 5×5 patch

/** Size of each tile cell in the HUD (px). */
const CELL_PX = 48;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a CSS background colour for a tile state.
 *
 * @param {import('../systems/farming/farmStore').TileState} tile
 * @returns {string}
 */
function tileColor(tile) {
  if (tile.kind === 'empty') return '#2d4a1d';
  if (tile.kind === 'tilled') return tile.watered ? '#3a5f3d' : '#6b4e2a';
  // planted
  const cropDef = CROPS[tile.crop];
  if (!cropDef) return '#5a4a2a';
  const stage = stageForDayCount(cropDef, tile.daysGrown);
  return stage.color;
}

/**
 * Returns the emoji label shown inside a tile cell.
 *
 * @param {import('../systems/farming/farmStore').TileState} tile
 * @returns {string}
 */
function tileEmoji(tile) {
  if (tile.kind === 'empty') return '';
  if (tile.kind === 'tilled') return tile.watered ? '💧' : '🟫';
  const cropDef = CROPS[tile.crop];
  if (!cropDef) return '🌱';
  if (isMature(cropDef, tile.daysGrown)) return cropDef.emoji;
  const stage = stageForDayCount(cropDef, tile.daysGrown);
  // stage 0 = seed, 1+ = growing
  if (stage.index === 0) return '🌱';
  return '🌿';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Single tile cell in the HUD grid.
 *
 * @param {{ tile: import('../systems/farming/farmStore').TileState, coord: {x:number,z:number}, isPlayer: boolean, onClick: () => void }} props
 */
function TileCell({ tile, coord, isPlayer, onClick }) {
  const bg = tileColor(tile);
  const emoji = tileEmoji(tile);
  const mature =
    tile.kind === 'planted' && CROPS[tile.crop] && isMature(CROPS[tile.crop], tile.daysGrown);

  return (
    <button
      onClick={onClick}
      title={`[${coord.x}, ${coord.z}] ${tile.kind}${tile.kind === 'planted' ? ` · ${tile.crop} · jour ${tile.daysGrown}` : ''}`}
      style={{
        width: CELL_PX,
        height: CELL_PX,
        background: bg,
        border: isPlayer
          ? '2px solid #fbbf24'
          : mature
            ? '2px solid #86efac'
            : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        cursor: 'pointer',
        transition: 'filter 0.1s',
        position: 'relative',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'none';
      }}
    >
      {emoji}
      {/* Day progress pip for planted tiles */}
      {tile.kind === 'planted' && CROPS[tile.crop] && (
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            right: 3,
            fontSize: 8,
            color: mature ? '#86efac' : '#e2e8f0',
            fontFamily: 'monospace',
          }}
        >
          {tile.daysGrown}/{CROPS[tile.crop].daysToMature}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Feedback toast
// ---------------------------------------------------------------------------

/**
 * @param {{ message: string | null, isError: boolean }} props
 */
function FeedbackToast({ message, isError }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 8,
        background: isError ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)',
        color: '#fff',
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 12,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        fontFamily: 'monospace',
      }}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Farm HUD overlay.
 *
 * Mount this as a sibling to <Scene /> in App.tsx so it sits on top of the
 * Three.js canvas without interfering with R3F's render loop.
 *
 * Example:
 *   import { Farm } from './components/Farm';
 *   // inside App return:
 *   <Farm />
 */
export function Farm() {
  const currentTool = useToolStore((s) => s.current);
  const tiles = useFarmStore((s) => s.tiles);
  const day = useFarmStore((s) => s.day);
  const playerPos = usePlayerStore((s) => s.position);

  const [feedback, setFeedback] = useState(null);
  const feedbackTimerRef = useRef(null);

  // Only show HUD when a farming tool is selected
  const isVisible = FARMING_TOOLS.has(currentTool);

  const playerTile = worldToTile({ x: playerPos.x, z: playerPos.z });

  // Build the view grid: VIEW_RADIUS tiles around player
  const minX = playerTile.x - VIEW_RADIUS;
  const maxX = playerTile.x + VIEW_RADIUS;
  const minZ = playerTile.z - VIEW_RADIUS;
  const maxZ = playerTile.z + VIEW_RADIUS;

  const showFeedback = useCallback((result) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(
      result.ok ? { text: result.message, error: false } : { text: result.reason, error: true },
    );
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const handleTileClick = useCallback(
    (coord) => {
      const result = dispatchToolAction(currentTool, coord);
      showFeedback(result);
    },
    [currentTool, showFeedback],
  );

  if (!isVisible) return null;

  // Rows: iterate Z from high to low (far → near = top-to-bottom in isometric view)
  const rows = [];
  for (let z = maxZ; z >= minZ; z--) {
    const cells = [];
    for (let x = minX; x <= maxX; x++) {
      const coord = { x, z };
      const tileKeyStr = `${x},${z}`;
      const tile = tiles[tileKeyStr] ?? { kind: 'empty' };
      const isPlayer = x === playerTile.x && z === playerTile.z;
      cells.push(
        <TileCell
          key={tileKeyStr}
          tile={tile}
          coord={coord}
          isPlayer={isPlayer}
          onClick={() => handleTileClick(coord)}
        />,
      );
    }
    rows.push(
      <div key={z} style={{ display: 'flex', gap: 3 }}>
        {cells}
      </div>,
    );
  }

  // Tool label
  const toolLabels = {
    hoe: '⛏️ Enxada',
    water: '💧 Regador',
    seed_wheat: '🌾 Plantar Trigo',
    seed_tomato: '🍅 Plantar Tomate',
    seed_corn: '🌽 Plantar Milho',
    harvest: '✂️ Colher',
  };

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(6px)',
        borderRadius: 10,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: '#fbbf24', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>
          {toolLabels[currentTool] ?? currentTool}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
          dia {day} · tile ({playerTile.x},{playerTile.z})
        </span>
      </div>

      {/* Tile grid — relative for feedback toast positioning */}
      <div style={{ position: 'relative' }}>
        <FeedbackToast message={feedback?.text ?? null} isError={feedback?.error ?? false} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{rows}</div>
      </div>

      {/* Legend */}
      <div
        style={{ display: 'flex', gap: 8, fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}
      >
        <span>🟫 arado</span>
        <span>💧 regado</span>
        <span>🌱 crescendo</span>
        <span style={{ color: '#86efac' }}>✦ pronto</span>
        <span style={{ color: '#fbbf24' }}>⬛ você</span>
      </div>
    </div>
  );
}

export default Farm;
