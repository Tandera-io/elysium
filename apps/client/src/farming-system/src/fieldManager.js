/**
 * fieldManager.js
 *
 * FieldManager tracks all farm fields and orchestrates their day-by-day
 * lifecycle: tilling, planting, watering, growth, and harvesting.
 *
 * It delegates rotation scheduling to CropRotation and surfaces a unified
 * status object per field so the UI / game loop only needs one call site.
 *
 * Design goals
 * ─────────────
 * - Plain-JS module so it can run outside the React/Zustand layer (e.g. in
 *   workers or tests without a DOM).
 * - CropRotation is injected at construction time — easy to mock in tests.
 * - "update(day)" is the single clock tick; call it once per game-day advance.
 */

import { CropRotation, CROP_SEASONS } from './cropRotation.js';

/**
 * Possible states a field can be in.
 * @typedef {'idle'|'tilled'|'planted'|'growing'|'ready'|'harvested'|'fallow'} FieldStatus
 */

/**
 * Configuration supplied when creating a field.
 * @typedef {Object} FieldConfig
 * @property {number}   [size=1]          - Number of tiles in the field (for yield scaling)
 * @property {string[]} [rotationPlan=[]] - Initial ordered list of cropType ids
 * @property {string}   [name]            - Human-readable label
 */

/**
 * Runtime state for a single field.
 * @typedef {Object} Field
 * @property {string}      id
 * @property {string}      name
 * @property {number}      size
 * @property {FieldStatus} status
 * @property {string|null} currentCrop    - cropType currently planted (null = none)
 * @property {number}      plantedOnDay   - game day when crop was planted
 * @property {number}      daysGrown      - how many days the crop has grown
 * @property {boolean}     isWatered      - true until next advanceDay call
 * @property {number}      soilQuality    - 0–1, influenced by rotation history
 * @property {number}      lastHarvestDay - game day of last successful harvest
 * @property {number}      totalHarvests  - running harvest count for this field
 */

export class FieldManager {
  /**
   * @param {CropRotation} [rotationEngine] - Provide a pre-configured instance
   *   or omit to get a fresh one.
   */
  constructor(rotationEngine) {
    /** @type {CropRotation} */
    this._rotation = rotationEngine ?? new CropRotation();

    /** @type {Map<string, Field>} */
    this._fields = new Map();
  }

  // ---------------------------------------------------------------------------
  // Field lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Registers a new field.  Throws if a field with the same id already exists.
   *
   * @param {string}      id
   * @param {FieldConfig} [config={}]
   * @returns {Field}
   */
  createField(id, config = {}) {
    if (this._fields.has(id)) {
      throw new Error(`FieldManager: field "${id}" already exists.`);
    }

    const { size = 1, rotationPlan = [], name = id } = config;

    /** @type {Field} */
    const field = {
      id,
      name,
      size,
      status: 'idle',
      currentCrop: null,
      plantedOnDay: 0,
      daysGrown: 0,
      isWatered: false,
      soilQuality: 0.5,
      lastHarvestDay: 0,
      totalHarvests: 0,
    };

    this._fields.set(id, field);

    // Register the rotation plan
    for (const cropType of rotationPlan) {
      this._rotation.addCropToRotation(id, cropType);
    }

    return { ...field };
  }

  /**
   * Removes a field and its rotation record.
   *
   * @param {string} id
   */
  removeField(id) {
    this._fields.delete(id);
    this._rotation.removeField(id);
  }

  // ---------------------------------------------------------------------------
  // Player actions (mirror the farmStore actions but at field granularity)
  // ---------------------------------------------------------------------------

  /**
   * Tills the field (must be idle or fallow).
   *
   * @param {string} id
   * @returns {boolean}
   */
  tillField(id) {
    const field = this._requireField(id);
    if (field.status !== 'idle' && field.status !== 'fallow') return false;
    field.status = 'tilled';
    return true;
  }

  /**
   * Waters the field (must have a crop planted or just be tilled).
   *
   * @param {string} id
   * @returns {boolean}
   */
  waterField(id) {
    const field = this._requireField(id);
    if (field.status !== 'tilled' && field.status !== 'planted' && field.status !== 'growing') {
      return false;
    }
    field.isWatered = true;
    return true;
  }

  /**
   * Plants a specific crop in the field.
   * If `cropType` is omitted, the next crop in the rotation plan is used.
   *
   * @param {string}  id
   * @param {string}  [cropType]
   * @param {number}  [day=0]      - Current game day (for record-keeping)
   * @returns {boolean}
   */
  plantField(id, cropType, day = 0) {
    const field = this._requireField(id);
    if (field.status !== 'tilled') return false;

    // Resolve crop from rotation if not explicitly supplied.
    // Use getCurrentCrop (the active slot) — getNextCrop is for after-harvest planning.
    let resolvedCrop = cropType;
    if (!resolvedCrop) {
      const currentEntry = this._rotation.getCurrentCrop(id);
      if (!currentEntry) return false; // no rotation plan defined
      resolvedCrop = currentEntry.cropType;
    }

    field.currentCrop = resolvedCrop;
    field.plantedOnDay = day;
    field.daysGrown = 0;
    field.status = 'planted';

    return true;
  }

  /**
   * Harvests the field when it is ready.
   *
   * @param {string} id
   * @param {number} [day=0]
   * @returns {{ crop: string; quantity: number }|null}
   */
  harvestField(id, day = 0) {
    const field = this._requireField(id);
    if (field.status !== 'ready') return null;

    const crop = field.currentCrop;
    const rotationResult = this._rotation.advanceRotation(id);

    // Base quantity scaled by field size and soil quality
    const baseQty = field.size;
    const soilMultiplier = 1 + rotationResult.newSoilQuality; // 1.0–2.0
    const quantity = Math.round(baseQty * soilMultiplier);

    field.status = 'harvested';
    field.lastHarvestDay = day;
    field.totalHarvests += 1;
    field.soilQuality = rotationResult.newSoilQuality;
    field.currentCrop = null;

    return { crop, quantity };
  }

  // ---------------------------------------------------------------------------
  // Clock tick
  // ---------------------------------------------------------------------------

  /**
   * Advances all fields by one game day.
   * - Grows planted/growing crops by 1 day (2 if soil quality ≥ 0.75 — composted)
   * - Resets water status
   * - Transitions planted → growing → ready when growth thresholds are met
   * - Returns to fallow if a harvested field is not re-tilled within 3 days
   *
   * @param {number} day         - The NEW day (after the advance)
   * @param {string} [season]    - Current season ('spring'|'summer'|'fall'|'winter')
   * @param {Object} [cropDefs]  - Map of cropId → { daysToMature } (pass CROPS from CropDefs)
   */
  updateField(id, day, season, cropDefs) {
    const field = this._requireField(id);
    this._tickField(field, day, season, cropDefs);
  }

  /**
   * Advances ALL registered fields by one game day.
   *
   * @param {number} day
   * @param {string} [season]
   * @param {Object} [cropDefs]
   */
  advanceDay(day, season, cropDefs) {
    for (const field of this._fields.values()) {
      this._tickField(field, day, season, cropDefs);
    }
  }

  /** @private */
  _tickField(field, day, season, cropDefs) {
    // Reset water flag at start of new day (must re-water daily)
    const wasWatered = field.isWatered;
    field.isWatered = false;

    if (field.status === 'planted' || field.status === 'growing') {
      // Only grow if watered the previous day
      if (wasWatered) {
        // High soil quality provides accelerated growth (composted-tier bonus)
        const growthIncrement = field.soilQuality >= 0.75 ? 2 : 1;
        field.daysGrown += growthIncrement;
      }

      // Check out-of-season (crops wilt if season doesn't match)
      if (season && field.currentCrop) {
        const validSeasons = CROP_SEASONS[field.currentCrop];
        if (validSeasons && !validSeasons.includes(season)) {
          // Crop wilts — return to fallow
          field.status = 'fallow';
          field.currentCrop = null;
          field.daysGrown = 0;
          return;
        }
      }

      // Check maturity
      const maturityDays = this._getMaturityDays(field.currentCrop, cropDefs);
      if (field.daysGrown >= maturityDays) {
        field.status = 'ready';
      } else {
        field.status = 'growing';
      }
    }

    // Tilled → fallow after 5 days without planting
    if (field.status === 'tilled' && day - field.plantedOnDay > 5) {
      field.status = 'fallow';
    }

    // Harvested → fallow after 3 days without re-tilling
    if (field.status === 'harvested' && day - field.lastHarvestDay > 3) {
      field.status = 'fallow';
    }

    // Update soil quality from rotation engine (may have changed last harvest)
    try {
      field.soilQuality = this._rotation.getSoilQuality(field.id);
    } catch {
      // Field may not have a rotation entry yet — leave soilQuality unchanged
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Returns a snapshot of the field's current state.
   *
   * @param {string} id
   * @returns {Field & { nextCrop: string|null; rotationCycleCount: number }}
   */
  getFieldStatus(id) {
    const field = this._requireField(id);
    let nextCrop = null;
    let rotationCycleCount = 0;
    try {
      const nextEntry = this._rotation.getNextCrop(id);
      nextCrop = nextEntry?.cropType ?? null;
      rotationCycleCount = this._rotation.getCycleCount(id);
    } catch {
      // No rotation plan registered
    }

    return {
      ...field,
      nextCrop,
      rotationCycleCount,
    };
  }

  /**
   * Returns status snapshots for every registered field.
   *
   * @returns {Array<Field & { nextCrop: string|null; rotationCycleCount: number }>}
   */
  getAllFields() {
    return [...this._fields.keys()].map((id) => this.getFieldStatus(id));
  }

  /**
   * Returns fields that currently need a specific action.
   *
   * @param {'water'|'plant'|'harvest'|'till'} action
   * @returns {string[]} field ids
   */
  getFieldsNeedingAction(action) {
    const results = [];
    for (const field of this._fields.values()) {
      switch (action) {
        case 'water':
          if ((field.status === 'planted' || field.status === 'growing') && !field.isWatered) {
            results.push(field.id);
          }
          break;
        case 'plant':
          if (field.status === 'tilled') results.push(field.id);
          break;
        case 'harvest':
          if (field.status === 'ready') results.push(field.id);
          break;
        case 'till':
          if (field.status === 'idle' || field.status === 'fallow') results.push(field.id);
          break;
      }
    }
    return results;
  }

  /**
   * Returns the CropRotation engine (for advanced queries / UI display).
   *
   * @returns {CropRotation}
   */
  getRotationEngine() {
    return this._rotation;
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  /**
   * Serialises full state for IndexedDB / save-file persistence.
   *
   * @returns {Object}
   */
  toJSON() {
    const fields = {};
    for (const [id, field] of this._fields) {
      fields[id] = { ...field };
    }
    return {
      fields,
      rotation: this._rotation.toJSON(),
    };
  }

  /**
   * Restores state from a saved snapshot.
   *
   * @param {Object} snapshot
   */
  fromJSON(snapshot) {
    this._fields.clear();
    for (const [id, data] of Object.entries(snapshot.fields ?? {})) {
      this._fields.set(id, { ...data });
    }
    if (snapshot.rotation) {
      this._rotation.fromJSON(snapshot.rotation);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * @private
   * @param {string} id
   * @returns {Field}
   */
  _requireField(id) {
    const field = this._fields.get(id);
    if (!field) throw new Error(`FieldManager: field "${id}" not found. Call createField first.`);
    return field;
  }

  /**
   * @private
   * Returns daysToMature for `cropId` from the provided cropDefs map, or a
   * sensible fallback if cropDefs is not supplied.
   *
   * @param {string|null} cropId
   * @param {Object|undefined} cropDefs
   * @returns {number}
   */
  _getMaturityDays(cropId, cropDefs) {
    if (!cropId) return Infinity;
    if (cropDefs?.[cropId]?.daysToMature != null) {
      return cropDefs[cropId].daysToMature;
    }
    // Fallback defaults mirroring CropDefs.ts values
    const defaults = { wheat: 4, tomato: 5, pumpkin: 7, corn: 6, strawberry: 3 };
    return defaults[cropId] ?? 5;
  }
}

/**
 * Convenience factory: creates a FieldManager with a shared CropRotation.
 * Re-export CropRotation so callers can import both from one location.
 *
 * @returns {FieldManager}
 */
export function createFieldManager() {
  return new FieldManager(new CropRotation());
}

export { CropRotation };
