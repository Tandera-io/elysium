/**
 * Type declarations for CropDisplay.jsx
 */

import type { ReactElement } from 'react';

export interface CropDisplayProps {
  cropId: string;
  daysGrown?: number;
  daysToMature?: number;
  totalStages?: number;
  size?: number;
  showLabel?: boolean;
  animate?: boolean;
}

export interface CropGrowthBarProps {
  daysGrown: number;
  daysToMature: number;
  width?: number;
}

export function CropDisplay(props: CropDisplayProps): ReactElement;
export function CropGrowthBar(props: CropGrowthBarProps): ReactElement;
export default CropDisplay;
