/**
 * Grid coordinate utilities. The world is a fixed-size tile grid centered at
 * origin. Tile (0, 0) is the south-west-most cell; (size-1, size-1) is the
 * north-east-most. World units: 1 tile = 1 unit on X (east) and Z (north).
 */

export interface GridConfig {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
}

export const DEFAULT_GRID: GridConfig = {
  width: 50,
  height: 50,
  tileSize: 1,
};

export interface TileCoord {
  readonly x: number;
  readonly z: number;
}

export interface WorldPos {
  readonly x: number;
  readonly z: number;
}

/** Convert tile coordinates (integers) to world-space center of that tile. */
export function tileToWorld(tile: TileCoord, grid: GridConfig = DEFAULT_GRID): WorldPos {
  const halfW = (grid.width * grid.tileSize) / 2;
  const halfH = (grid.height * grid.tileSize) / 2;
  return {
    x: tile.x * grid.tileSize + grid.tileSize / 2 - halfW,
    z: tile.z * grid.tileSize + grid.tileSize / 2 - halfH,
  };
}

/** Snap a world-space position to the nearest tile coordinate. */
export function worldToTile(pos: WorldPos, grid: GridConfig = DEFAULT_GRID): TileCoord {
  const halfW = (grid.width * grid.tileSize) / 2;
  const halfH = (grid.height * grid.tileSize) / 2;
  return {
    x: Math.floor((pos.x + halfW) / grid.tileSize),
    z: Math.floor((pos.z + halfH) / grid.tileSize),
  };
}

export function isInBounds(tile: TileCoord, grid: GridConfig = DEFAULT_GRID): boolean {
  return tile.x >= 0 && tile.x < grid.width && tile.z >= 0 && tile.z < grid.height;
}

export function clampToBounds(tile: TileCoord, grid: GridConfig = DEFAULT_GRID): TileCoord {
  return {
    x: Math.max(0, Math.min(grid.width - 1, tile.x)),
    z: Math.max(0, Math.min(grid.height - 1, tile.z)),
  };
}
