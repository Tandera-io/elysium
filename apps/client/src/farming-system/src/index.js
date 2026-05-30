/**
 * farming-system/src/index.js
 *
 * Public entry point for the farming-system rotation module.
 * Import from here to access CropRotation, FieldManager, and helpers.
 *
 * Example:
 *   import { createFieldManager, CropRotation, CROP_FAMILY } from './src/index.js';
 */

export {
  // Core classes
  CropRotation,
  // Constants
  SEASONS,
  CROP_FAMILY,
  CROP_SEASONS,
  ROTATION_SOIL_BONUS,
} from './cropRotation.js';

export { FieldManager, createFieldManager } from './fieldManager.js';
