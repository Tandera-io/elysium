/**
 * CropDisplay.jsx — Visual grid of farm plot tiles with growth stage indicators.
 *
 * Renders a compact crop-status panel that can be embedded anywhere in the UI.
 * Shows each plot's:
 *   - Current growth stage (seed → sprout → young → mature → harvestable)
 *   - Weather and season modifiers affecting growth rate
 *   - Watered status for today
 *   - Ready-to-harvest highlight
 *
 * Props:
 *   onHarvest  (plotId) => void  — called when player clicks a harvestable plot
 *   onWater    (plotId) => void  — called when player clicks a planted plot to water it
 *   onClear    (plotId) => void  — called when player clicks a wilted plot to clear it
 *   compact    boolean           — reduces tile size for use in sidebars
 */

import {
  useSeasonalFarmStore,
  CROP_CATALOGUE,
  SEASON_LABEL,
  seasonFromDay,
  dayInSeason,
  DAYS_PER_SEASON,
} from './farmStore.js';
import {
  growthStageIndex,
  stageName,
  WEATHER_GROWTH_RATE,
  WATERING_CAN_BONUS,
} from './cropGrowth.js';
import { Crop } from '../../components/Crop.jsx';

// ─── Visual constants ─────────────────────────────────────────────────────────

const STAGE_COLORS = {
  0: '#5a4a2a', // seed
  1: '#7caf3e', // sprout
  2: '#5e9b2e', // young
  3: '#c2c44a', // mature
  4: '#aacc22', // harvestable
};

const WEATHER_EMOJI = {
  sunny: '☀️',
  rainy: '🌧️',
  drought: '🌵',
};

const SEASON_COLOR = {
  spring: '#4a9e4a',
  summer: '#e8a020',
  fall: '#c85020',
  winter: '#4a7aaa',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Displays the computed growth-rate modifier for a plot, accounting for
 * weather, season suitability, and today's watering status.
 *
 * @param {{ cropType: string, currentSeason: string, weather: string, wateredToday: boolean }} props
 */
function GrowthRateBadge({ cropType, currentSeason, weather, wateredToday }) {
  const def = CROP_CATALOGUE[cropType];
  if (!def) return null;

  const inSeason = def.seasons.includes(currentSeason);
  const weatherRate = WEATHER_GROWTH_RATE[weather] ?? 1.0;
  const waterBonus = wateredToday ? WATERING_CAN_BONUS : 0;
  const seasonMult = inSeason ? 1.0 : 0.5;
  const effective = ((weatherRate + waterBonus) * seasonMult).toFixed(2);

  const color = effective >= 1.5 ? '#aacc22' : effective >= 1.0 ? '#e8c878' : '#c87050';

  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: 'monospace',
        color,
        background: '#1a1610',
        borderRadius: 3,
        padding: '1px 4px',
        marginTop: 2,
        display: 'inline-block',
      }}
      title={`Growth rate: ${effective}×/day${!inSeason ? ' (off-season penalty)' : ''}${wateredToday ? ' (watered)' : ''}`}
    >
      ×{effective}/day
    </span>
  );
}

/**
 * Single plot tile.  Delegates to <Crop> for planted plots; renders an
 * empty-plot placeholder for bare soil.
 *
 * @param {{ plot: object, currentSeason: string, weather: string, compact: boolean,
 *           onHarvest: Function, onWater: Function, onClear: Function }} props
 */
function PlotTile({ plot, currentSeason, weather, compact, onHarvest, onWater, onClear }) {
  const def = plot.cropType ? CROP_CATALOGUE[plot.cropType] : null;
  const stageIdx = def ? growthStageIndex(plot.daysGrown, def.daysToMature) : 0;
  const stageLbl = plot.cropType ? stageName(stageIdx) : 'empty';

  // Resolve click handler based on plot state.
  let clickHandler = null;
  if (plot.wilted) {
    clickHandler = () => onClear?.(plot.id);
  } else if (plot.readyToHarvest) {
    clickHandler = () => onHarvest?.(plot.id);
  } else if (plot.cropType && !plot.wateredToday) {
    clickHandler = () => onWater?.(plot.id);
  }

  // Planted / wilted plots → animated Crop tile.
  if (plot.cropType || plot.wilted) {
    return (
      <>
        <Crop
          emoji={def?.emoji ?? '🌱'}
          name={def?.name ?? ''}
          stage={stageIdx}
          stageName={stageLbl}
          daysGrown={plot.daysGrown}
          daysToMature={def?.daysToMature ?? 1}
          wilted={plot.wilted}
          wateredToday={plot.wateredToday ?? false}
          readyToHarvest={plot.readyToHarvest}
          onClick={clickHandler}
          compact={compact}
          stageColor={STAGE_COLORS[stageIdx]}
        />
        {/* Growth rate badge shown below the Crop tile in full mode */}
        {!compact && !plot.wilted && (
          <GrowthRateBadge
            cropType={plot.cropType}
            currentSeason={currentSeason}
            weather={weather}
            wateredToday={plot.wateredToday ?? false}
          />
        )}
      </>
    );
  }

  // Empty plot.
  const tileSize = compact ? 80 : 100;
  return (
    <div
      style={{
        background: '#1a1610',
        border: '2px solid #5a4a2a',
        borderRadius: 10,
        padding: compact ? '6px 5px 5px' : '10px 8px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        minHeight: tileSize,
        color: '#5a4a2a',
        fontFamily: 'monospace',
        fontSize: 10,
      }}
    >
      <span style={{ fontSize: compact ? 22 : 26 }}>🟫</span>
      <span>+ plant</span>
    </div>
  );
}

// ─── Weather panel ────────────────────────────────────────────────────────────

/**
 * Small banner showing current weather and its growth effect.
 *
 * @param {{ weather: string }} props
 */
function WeatherBanner({ weather }) {
  const _rate = WEATHER_GROWTH_RATE[weather] ?? 1.0;
  const label =
    weather === 'rainy'
      ? 'Rainy — crops grow faster (×1.5 base)'
      : weather === 'drought'
        ? 'Drought — crops struggle (×0.5 base)'
        : 'Sunny — normal growth (×1.0 base)';

  const color = weather === 'rainy' ? '#4a9acc' : weather === 'drought' ? '#c87050' : '#e8c878';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontFamily: 'monospace',
        color,
        background: '#12100a',
        border: `1px solid ${color}40`,
        borderRadius: 6,
        padding: '4px 10px',
      }}
    >
      <span>{WEATHER_EMOJI[weather] ?? '☀️'}</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * CropDisplay — standalone crop growth grid.
 *
 * Reads all state from `useSeasonalFarmStore`.  Accepts optional callback
 * props so parent components can respond to harvest/water/clear events
 * without duplicating store wiring.
 *
 * @param {{
 *   onHarvest?: (plotId: number) => void,
 *   onWater?:   (plotId: number) => void,
 *   onClear?:   (plotId: number) => void,
 *   compact?:   boolean,
 *   className?: string,
 *   style?:     React.CSSProperties,
 * }} props
 */
export default function CropDisplay({
  onHarvest,
  onWater,
  onClear,
  compact = false,
  className,
  style,
}) {
  const day = useSeasonalFarmStore((s) => s.day);
  const weather = useSeasonalFarmStore((s) => s.weather);
  const plots = useSeasonalFarmStore((s) => s.plots);
  const waterPlot = useSeasonalFarmStore((s) => s.waterPlot);
  const harvestCrop = useSeasonalFarmStore((s) => s.harvestCrop);
  const clearPlot = useSeasonalFarmStore((s) => s.clearPlot);

  const currentSeason = seasonFromDay(day);
  const currentDayInSeason = dayInSeason(day);

  function handleHarvest(plotId) {
    harvestCrop(plotId);
    onHarvest?.(plotId);
  }

  function handleWater(plotId) {
    waterPlot(plotId);
    onWater?.(plotId);
  }

  function handleClear(plotId) {
    clearPlot(plotId);
    onClear?.(plotId);
  }

  return (
    <div
      className={className}
      style={{
        fontFamily: 'monospace',
        ...style,
      }}
    >
      {/* Season / day header */}
      {!compact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <span
            style={{
              background: SEASON_COLOR[currentSeason],
              color: '#fff',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 'bold',
            }}
          >
            {SEASON_LABEL[currentSeason]}
          </span>
          <span style={{ fontSize: 11, color: '#8a7a50' }}>
            Day {currentDayInSeason}/{DAYS_PER_SEASON}
          </span>
        </div>
      )}

      {/* Weather banner */}
      {!compact && (
        <div style={{ marginBottom: 8 }}>
          <WeatherBanner weather={weather} />
        </div>
      )}

      {/* Plot grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${compact ? 4 : 3}, 1fr)`,
          gap: compact ? 6 : 10,
        }}
      >
        {plots.map((plot) => (
          <PlotTile
            key={plot.id}
            plot={plot}
            currentSeason={currentSeason}
            weather={weather}
            compact={compact}
            onHarvest={handleHarvest}
            onWater={handleWater}
            onClear={handleClear}
          />
        ))}
      </div>

      {/* Legend (full mode only) */}
      {!compact && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            fontSize: 9,
            color: '#6a5a30',
          }}
        >
          <span>🟫 empty</span>
          <span>🌑 seed</span>
          <span>🌱 sprout</span>
          <span>🌿 young</span>
          <span>🌳 mature</span>
          <span>✨ harvestable</span>
          <span>💀 wilted</span>
          <span style={{ color: '#4a9acc' }}>● watered</span>
        </div>
      )}
    </div>
  );
}
