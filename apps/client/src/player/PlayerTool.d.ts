import type { ItemId } from '../systems/inventory/inventoryStore';
import type { CropId } from '../systems/farming/CropDefs';
import type { TileCoord } from '../engine/world/WorldGrid';
import type { GroundItem } from '../systems/groundItems/groundItemStore';

export class PlayerTool {
  apply(tileCoord: TileCoord): boolean;
  plantSeed(seedItemId: ItemId, cropId: CropId, tileCoord: TileCoord): boolean;
  pickupGroundItem(groundItem: GroundItem): boolean;
}

export const playerTool: PlayerTool;
