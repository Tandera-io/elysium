import type { TileState } from '../systems/farming/farmStore';

interface CropTileProps {
  tile: Extract<TileState, { kind: 'planted' }>;
  position: [number, number, number];
  harvesting?: boolean;
}

export declare function CropTile(props: CropTileProps): JSX.Element | null;
