import { DEFAULT_GRID, isInBounds, type GridConfig, type TileCoord } from './WorldGrid';

/**
 * 4-connected A* on the world grid.
 * For now there are no obstacles; the function still computes proper paths so
 * later phases (placed objects, fences, water) just have to fill `blocked`.
 */
export interface PathfindOptions {
  readonly grid?: GridConfig;
  readonly blocked?: ReadonlySet<string>; // keys produced by tileKey()
}

export function tileKey(t: TileCoord): string {
  return `${t.x},${t.z}`;
}

const NEIGHBOR_OFFSETS: readonly TileCoord[] = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
];

function manhattan(a: TileCoord, b: TileCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

/**
 * Returns the shortest path from `start` to `goal`, inclusive of both endpoints.
 * Returns an empty array if no path exists (e.g. goal blocked or out of bounds).
 */
export function findPath(
  start: TileCoord,
  goal: TileCoord,
  options: PathfindOptions = {},
): TileCoord[] {
  const grid = options.grid ?? DEFAULT_GRID;
  const blocked = options.blocked ?? new Set<string>();

  if (!isInBounds(start, grid) || !isInBounds(goal, grid)) return [];
  if (blocked.has(tileKey(goal))) return [];
  if (start.x === goal.x && start.z === goal.z) return [start];

  const open = new Map<string, { tile: TileCoord; f: number; g: number }>();
  const came = new Map<string, TileCoord>();
  const gScore = new Map<string, number>();

  const startKey = tileKey(start);
  open.set(startKey, { tile: start, f: manhattan(start, goal), g: 0 });
  gScore.set(startKey, 0);

  while (open.size > 0) {
    // pick node with lowest f
    let currentKey: string | null = null;
    let current: { tile: TileCoord; f: number; g: number } | null = null;
    for (const [k, v] of open) {
      if (!current || v.f < current.f) {
        current = v;
        currentKey = k;
      }
    }
    if (!current || !currentKey) break;

    if (current.tile.x === goal.x && current.tile.z === goal.z) {
      // reconstruct
      const path: TileCoord[] = [current.tile];
      let cursor = currentKey;
      while (came.has(cursor)) {
        const prev = came.get(cursor)!;
        path.push(prev);
        cursor = tileKey(prev);
      }
      return path.reverse();
    }

    open.delete(currentKey);

    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor: TileCoord = {
        x: current.tile.x + offset.x,
        z: current.tile.z + offset.z,
      };
      if (!isInBounds(neighbor, grid)) continue;
      const nKey = tileKey(neighbor);
      if (blocked.has(nKey)) continue;

      const tentativeG = current.g + 1;
      const existing = gScore.get(nKey);
      if (existing !== undefined && tentativeG >= existing) continue;

      came.set(nKey, current.tile);
      gScore.set(nKey, tentativeG);
      const f = tentativeG + manhattan(neighbor, goal);
      open.set(nKey, { tile: neighbor, f, g: tentativeG });
    }
  }

  return [];
}
