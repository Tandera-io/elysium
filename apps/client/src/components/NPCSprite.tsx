import { BillboardSprite } from '../engine/loader/BillboardSprite';
import { SpriteAnimator } from '../engine/loader/SpriteAnimator';
import { SPRITES, WALK_CYCLES, type SpriteSlot } from '../content/assets';

export interface NPCSpriteProps {
  /** NPC identifier — must match a key in SPRITES / WALK_CYCLES. */
  npcId: string;
  /**
   * True while the NPC is in motion; drives the walk animation.
   * Defaults to false (idle frame shown).
   */
  moving?: boolean;
  /** Sprite height in world units. Defaults to 1.6. */
  height?: number;
}

function walkCycleFor(npcId: string): readonly string[] | null {
  const key = npcId as SpriteSlot;
  return WALK_CYCLES[key] ?? null;
}

function spriteFor(npcId: string): string | null {
  const key = npcId as SpriteSlot;
  return SPRITES[key] ?? null;
}

/**
 * Renders a single NPC as a billboarded pixel-art sprite.
 *
 * - If the NPC has a registered walk cycle (WALK_CYCLES entry), uses
 *   SpriteAnimator to play frame-by-frame animation while `moving` is true
 *   and shows the idle frame otherwise.
 * - Falls back to a static BillboardSprite when only a base sprite is registered.
 * - Returns null if neither is available (caller should render a fallback).
 */
export function NPCSprite({ npcId, moving = false, height = 1.6 }: NPCSpriteProps) {
  const cycle = walkCycleFor(npcId);
  if (cycle && cycle.length > 1) {
    return <SpriteAnimator frames={cycle} fps={6} playing={moving} height={height} />;
  }
  const spritePath = spriteFor(npcId);
  if (!spritePath) return null;
  return <BillboardSprite path={spritePath} height={height} />;
}
