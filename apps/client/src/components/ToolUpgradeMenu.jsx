/**
 * ToolUpgradeMenu — overlay panel for upgrading farming tools.
 *
 * Reads tool tiers from playerStateStore and gold from inventoryStore.
 * Upgrade button deducts gold and advances the tool's tier.
 *
 * Props:
 *   open    — boolean, whether the panel is visible
 *   onClose — () => void
 */

import { usePlayerStateStore } from '../stores/playerState.js';
import { useInventoryStore } from '../systems/inventory/inventoryStore';
import {
  TOOLS,
  UPGRADE_TIERS,
  getToolUpgrade,
  getNextUpgrade,
  canUpgrade,
} from '../features/farming/toolUpgrades.js';

// ─── Palette ──────────────────────────────────────────────────────────────────

const TIER_COLOR = {
  basic: '#8a7a50',
  copper: '#c87030',
  iron: '#7090b0',
  gold: '#e8b820',
  iridium: '#9060d0',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        color: TIER_COLOR[tier] ?? '#8a7a50',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {tier}
    </span>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        fontFamily: 'monospace',
        color: highlight ? '#aacc22' : '#8a7a50',
        marginBottom: 2,
      }}
    >
      <span>{label}</span>
      <span style={{ color: highlight ? '#aacc22' : '#b0a060' }}>{value}</span>
    </div>
  );
}

function ToolCard({ toolId, toolTiers, gold }) {
  const upgradeToolTier = usePlayerStateStore((s) => s.upgradeToolTier);
  const removeGold = useInventoryStore((s) => s.removeGold);

  const currentTier = toolTiers[toolId] ?? 'basic';
  const currentStats = getToolUpgrade(toolId, currentTier);
  const nextUpgrade = getNextUpgrade(toolId, currentTier);
  const isMaxed = !nextUpgrade;
  const affordable = !isMaxed && gold >= (nextUpgrade?.cost ?? Infinity);

  const tool = TOOLS[toolId];

  function handleUpgrade() {
    if (!nextUpgrade || !affordable) return;
    if (removeGold(nextUpgrade.cost)) {
      upgradeToolTier(toolId, nextUpgrade.tier);
    }
  }

  return (
    <div
      style={{
        background: '#1a1610',
        border: `2px solid ${TIER_COLOR[currentTier] ?? '#3a2e1a'}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 24 }}>{tool.emoji}</span>
        <div>
          <div
            style={{ color: '#e8c878', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' }}
          >
            {tool.name}
          </div>
          <TierBadge tier={currentTier} />
        </div>
      </div>

      <p style={{ margin: 0, color: '#7a6a40', fontFamily: 'monospace', fontSize: 11 }}>
        {tool.description}
      </p>

      {/* Current stats */}
      {currentStats && (
        <div
          style={{
            background: '#12100a',
            borderRadius: 6,
            padding: '8px 10px',
          }}
        >
          <div style={{ color: '#6a5a30', fontFamily: 'monospace', fontSize: 10, marginBottom: 4 }}>
            CURRENT STATS
          </div>
          <StatRow label="Yield bonus" value={`×${currentStats.cropYieldBonus.toFixed(2)}`} />
          <StatRow label="Speed bonus" value={`×${currentStats.speedBonus.toFixed(2)}`} />
          <StatRow label="Energy cost" value={`×${currentStats.energyCostMultiplier.toFixed(2)}`} />
        </div>
      )}

      {/* Upgrade section */}
      {isMaxed ? (
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            fontFamily: 'monospace',
            color: TIER_COLOR.iridium,
            padding: '6px 0',
          }}
        >
          ✨ Max tier reached
        </div>
      ) : (
        <div
          style={{
            background: '#0e0d08',
            borderRadius: 6,
            padding: '8px 10px',
            border: `1px solid ${affordable ? '#4a6010' : '#2a2010'}`,
          }}
        >
          <div
            style={{
              color: TIER_COLOR[nextUpgrade.tier] ?? '#8a7a50',
              fontFamily: 'monospace',
              fontSize: 10,
              marginBottom: 4,
            }}
          >
            NEXT: {nextUpgrade.name.toUpperCase()}
          </div>
          <StatRow
            label="Yield bonus"
            value={`×${nextUpgrade.cropYieldBonus.toFixed(2)}`}
            highlight={nextUpgrade.cropYieldBonus > (currentStats?.cropYieldBonus ?? 1)}
          />
          <StatRow
            label="Speed bonus"
            value={`×${nextUpgrade.speedBonus.toFixed(2)}`}
            highlight={nextUpgrade.speedBonus > (currentStats?.speedBonus ?? 1)}
          />
          <StatRow
            label="Energy cost"
            value={`×${nextUpgrade.energyCostMultiplier.toFixed(2)}`}
            highlight={nextUpgrade.energyCostMultiplier < (currentStats?.energyCostMultiplier ?? 1)}
          />

          {nextUpgrade.materials.length > 0 && (
            <div style={{ marginTop: 4, color: '#6a5a30', fontFamily: 'monospace', fontSize: 10 }}>
              Requires: {nextUpgrade.materials.map((m) => `${m.qty}× ${m.item}`).join(', ')}
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={!affordable}
            style={{
              marginTop: 8,
              width: '100%',
              background: affordable ? '#2e4010' : '#1a1a10',
              border: `1px solid ${affordable ? '#6a9020' : '#3a3010'}`,
              borderRadius: 6,
              padding: '6px 0',
              color: affordable ? '#aacc22' : '#4a4020',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: affordable ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (affordable) e.currentTarget.style.background = '#3e5418';
            }}
            onMouseLeave={(e) => {
              if (affordable) e.currentTarget.style.background = '#2e4010';
            }}
          >
            Upgrade — 🪙 {nextUpgrade.cost.toLocaleString()}g
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tier progress bar ────────────────────────────────────────────────────────

function TierProgress({ tier }) {
  const rank = UPGRADE_TIERS.indexOf(tier);
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
      {UPGRADE_TIERS.map((t, i) => (
        <div
          key={t}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: i <= rank ? TIER_COLOR[t] : '#2a2010',
            transition: 'background 0.3s',
          }}
          title={t}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ToolUpgradeMenu({ open, onClose }) {
  const toolTiers = usePlayerStateStore((s) => s.toolTiers);
  const gold = useInventoryStore((s) => s.gold);

  if (!open) return null;

  const overallRank = Math.min(...Object.values(toolTiers).map((t) => UPGRADE_TIERS.indexOf(t)));
  const overallTier = UPGRADE_TIERS[overallRank] ?? 'basic';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#12100a',
          border: '2px solid #7a6030',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: '#e8c878', fontFamily: 'monospace', fontSize: 18 }}>
              🔨 Tool Upgrades
            </h2>
            <p
              style={{ margin: '4px 0 0', color: '#6a5a30', fontFamily: 'monospace', fontSize: 12 }}
            >
              Better tools = faster work, higher yields, less energy spent.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                color: '#e8c878',
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: 'bold',
              }}
            >
              🪙 {gold.toLocaleString()}g
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 4,
                background: 'transparent',
                border: '1px solid #4a3a1a',
                borderRadius: 6,
                padding: '3px 10px',
                color: '#6a5a30',
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Overall tier indicator */}
        <TierProgress tier={overallTier} />

        {/* Tool grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {Object.keys(TOOLS).map((toolId) => (
            <ToolCard key={toolId} toolId={toolId} toolTiers={toolTiers} gold={gold} />
          ))}
        </div>
      </div>
    </div>
  );
}
