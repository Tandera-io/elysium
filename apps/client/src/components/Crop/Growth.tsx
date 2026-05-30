import { CROPS, stageForDayCount, isMature } from '../../systems/farming/CropDefs';
import type { CropId, CropDef, CropStage } from '../../systems/farming/CropDefs';

// ---------------------------------------------------------------------------
// Stage label map — friendly names for each stage index
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<number, string> = {
  0: 'semente',
  1: 'broto',
  2: 'jovem',
  3: 'maduro',
  4: 'pronto',
};

function stageLabel(stageIndex: number, totalStages: number): string {
  // Last stage is always "pronto" (ready to harvest)
  if (stageIndex === totalStages - 1) return 'pronto';
  return STAGE_LABELS[stageIndex] ?? `estágio ${stageIndex}`;
}

// ---------------------------------------------------------------------------
// CSS-based stage icon — renders a colored dot with a visual hint per stage
// No PNG assets required; sprites can be swapped in later by replacing this.
// ---------------------------------------------------------------------------

interface StageIconProps {
  stage: CropStage;
  cropId: CropId;
  isHarvestable: boolean;
  /** Size in Tailwind rem units, e.g. "8" for w-8 h-8. Defaults to "10". */
  size?: string;
}

export function CropStageIcon({
  stage,
  cropId: _cropId,
  isHarvestable,
  size = '10',
}: StageIconProps) {
  const sizeClass = `w-${size} h-${size}`;

  // Harvestable — floating glow ring with custom CSS animation
  if (isHarvestable) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center border-2 border-amber-400 harvest-glow`}
        style={{ background: stage.color }}
        aria-label="pronto para colher"
      >
        <span className="text-white text-[0.65rem] font-bold drop-shadow select-none">✦</span>
      </div>
    );
  }

  // Stage 0 — seeded soil: small dot buried in brown circle
  if (stage.index === 0) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center border-2 border-amber-900/60 crop-stage-pop`}
        style={{ background: stage.color }}
        aria-label="semente"
      >
        <span className="text-amber-200/80 text-[0.6rem] font-bold select-none">●</span>
      </div>
    );
  }

  // Stage 1 (sprout) — small upward chevron
  if (stage.index === 1) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center border-2 border-green-700/60 crop-stage-pop`}
        style={{ background: stage.color }}
        aria-label="broto"
      >
        <span className="text-white/90 text-[0.65rem] font-bold leading-none select-none">↑</span>
      </div>
    );
  }

  // Stage 2 (young) — leaf symbol
  if (stage.index === 2) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center border-2 border-green-600/60 crop-stage-pop`}
        style={{ background: stage.color }}
        aria-label="jovem"
      >
        <span className="text-white/90 text-[0.65rem] font-bold leading-none select-none">❧</span>
      </div>
    );
  }

  // Stage 3+ (mature, not yet harvestable) — filled circle with taller shape
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center border-2 border-yellow-600/60 crop-stage-pop`}
      style={{ background: stage.color }}
      aria-label="maduro"
    >
      <span className="text-white/90 text-[0.65rem] font-bold leading-none select-none">★</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress pip track — one pip per stage, filled up to current stage
// ---------------------------------------------------------------------------

interface StageTrackProps {
  totalStages: number;
  currentStageIndex: number;
  isHarvestable: boolean;
}

export function CropStageTrack({ totalStages, currentStageIndex, isHarvestable }: StageTrackProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: totalStages }).map((_, i) => {
        const filled = isHarvestable ? true : i <= currentStageIndex;
        // Newly-filled pip (exactly at the current stage boundary) gets the slide-in animation.
        const isNewlyFilled = filled && i === currentStageIndex && !isHarvestable;
        return (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              filled ? (isHarvestable ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-600'
            } ${isNewlyFilled ? 'pip-fill' : ''}`}
            style={{ width: `${Math.floor(48 / totalStages)}px` }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Growth component — self-contained display for one planted tile
// ---------------------------------------------------------------------------

export interface GrowthProps {
  /** The crop type identifier. */
  cropId: CropId;
  /** Days elapsed since planting (from farmStore planted tile). */
  daysGrown: number;
  /**
   * Layout variant:
   * - "hud"    compact inline strip for CropTile HUD overlay (default)
   * - "card"   larger card with icon + label for menus or inventory
   */
  variant?: 'hud' | 'card';
}

/**
 * Renders the current growth stage of a planted crop. Designed to be
 * composed into CropTile.tsx (HUD overlay) or any crop info card.
 *
 * Data flow: cropId + daysGrown (from farmStore) → CropDef lookup →
 * stageForDayCount → visual stage icon + pip track.
 */
export function Growth({ cropId, daysGrown, variant = 'hud' }: GrowthProps) {
  const def: CropDef = CROPS[cropId];
  const stage: CropStage = stageForDayCount(def, daysGrown);
  const harvestable = isMature(def, daysGrown);
  const totalStages = def.stages.length;
  const label = stageLabel(stage.index, totalStages);
  const progress = Math.min(daysGrown / def.daysToMature, 1);

  if (variant === 'card') {
    return (
      <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-800/80 border border-slate-700 min-w-[80px]">
        <CropStageIcon
          key={`${cropId}-${stage.index}-${harvestable}`}
          stage={stage}
          cropId={cropId}
          isHarvestable={harvestable}
          size="10"
        />
        <span
          className={`text-[0.65rem] font-semibold capitalize ${harvestable ? 'text-emerald-400' : 'text-slate-300'}`}
        >
          {label}
        </span>
        <CropStageTrack
          totalStages={totalStages}
          currentStageIndex={stage.index}
          isHarvestable={harvestable}
        />
        <div className="w-full bg-slate-700 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all duration-500 ${harvestable ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[0.6rem] text-slate-500">
          {daysGrown}/{def.daysToMature}d
        </span>
      </div>
    );
  }

  // variant === 'hud'
  return (
    <div className="flex items-center gap-2">
      <CropStageIcon
        key={`${cropId}-${stage.index}-${harvestable}`}
        stage={stage}
        cropId={cropId}
        isHarvestable={harvestable}
        size="6"
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[0.65rem] font-medium capitalize ${harvestable ? 'text-emerald-400' : 'text-slate-300'}`}
          >
            {label}
          </span>
          <span className="text-[0.6rem] text-slate-500 shrink-0">
            {daysGrown}/{def.daysToMature}d
          </span>
        </div>
        <CropStageTrack
          totalStages={totalStages}
          currentStageIndex={stage.index}
          isHarvestable={harvestable}
        />
      </div>
    </div>
  );
}
