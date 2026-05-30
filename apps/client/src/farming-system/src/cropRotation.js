/**
 * cropRotation.js
 *
 * Manages planned crop sequences for farm fields.
 * A rotation is an ordered list of crop types that cycle through seasons.
 * Each field has its own rotation schedule; after a crop is harvested the
 * next one in the sequence becomes the "current" crop for that field.
 *
 * Soil-quality bonuses are awarded when crops from different families are
 * rotated in sequence (e.g. legumes → grains → brassicas) — mirroring the
 * real agronomic benefit of not planting the same family back-to-back.
 */

/** Season order used throughout the game. */
export const SEASONS = /** @type {const} */ (['spring', 'summer', 'fall', 'winter']);

/**
 * Crop families used to determine rotation bonuses.
 * Crops in the same family planted consecutively receive NO bonus.
 * @type {Record<string, string>}
 */
export const CROP_FAMILY = {
  wheat: 'grain',
  corn: 'grain',
  tomato: 'fruit',
  strawberry: 'fruit',
  pumpkin: 'gourd',
};

/**
 * Soil-quality bonus (0–1) granted when the previous crop family
 * differs from the current crop family.  Used by FieldManager to
 * compute an effective growth-speed multiplier.
 */
export const ROTATION_SOIL_BONUS = 0.25;

/**
 * Preferred season(s) for each crop — planting outside these seasons
 * will not award the rotation bonus and may cause wilting (handled by
 * the farm store separately).
 * @type {Record<string, string[]>}
 */
export const CROP_SEASONS = {
  wheat: ['spring', 'fall'],
  corn: ['summer'],
  tomato: ['spring', 'summer'],
  strawberry: ['spring'],
  pumpkin: ['summer', 'fall'],
};

/**
 * A single entry in a rotation schedule.
 * @typedef {Object} RotationEntry
 * @property {string} cropType    - Crop id (matches CropDefs.CropId)
 * @property {string} preferredSeason - Season in which this crop should be planted
 * @property {number} [priority]  - Optional sort hint; lower = plant first
 */

/**
 * The full state for one field's rotation.
 * @typedef {Object} FieldRotation
 * @property {string}          fieldId
 * @property {RotationEntry[]} sequence      - Ordered list of planned crops
 * @property {number}          currentIndex  - Which slot in `sequence` is active
 * @property {number}          cycleCount    - How many full rotations have completed
 * @property {string|null}     lastCropFamily - Family of the most-recently completed crop
 * @property {number}          soilQuality   - 0–1; boosted by good rotations
 */

/**
 * CropRotation manages the per-field crop sequences.
 *
 * Usage:
 *   const rotation = new CropRotation();
 *   rotation.addCropToRotation('field-1', 'wheat');
 *   rotation.addCropToRotation('field-1', 'corn');
 *   rotation.addCropToRotation('field-1', 'tomato');
 *
 *   const next = rotation.getNextCrop('field-1');   // 'wheat'
 *   rotation.advanceRotation('field-1');             // moves to 'corn'
 */
export class CropRotation {
  constructor() {
    /** @type {Map<string, FieldRotation>} */
    this._fields = new Map();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the FieldRotation for `fieldId`, throwing if it does not exist.
   * @param {string} fieldId
   * @returns {FieldRotation}
   */
  _getRotation(fieldId) {
    const rotation = this._fields.get(fieldId);
    if (!rotation) {
      throw new Error(
        `CropRotation: field "${fieldId}" is not registered. Call addCropToRotation first.`,
      );
    }
    return rotation;
  }

  /**
   * Creates an empty FieldRotation record for a field if one does not already exist.
   * @param {string} fieldId
   */
  _ensureField(fieldId) {
    if (!this._fields.has(fieldId)) {
      /** @type {FieldRotation} */
      const record = {
        fieldId,
        sequence: [],
        currentIndex: 0,
        cycleCount: 0,
        lastCropFamily: null,
        soilQuality: 0.5, // base quality
      };
      this._fields.set(fieldId, record);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Appends a crop type to the rotation sequence for `fieldId`.
   * Creates the field record automatically if it does not yet exist.
   *
   * @param {string} fieldId
   * @param {string} cropType - Must be a key in CROP_FAMILY / CROP_SEASONS
   * @param {Partial<RotationEntry>} [options]
   * @returns {void}
   */
  addCropToRotation(fieldId, cropType, options = {}) {
    this._ensureField(fieldId);
    const rotation = this._fields.get(fieldId);

    const preferredSeason = options.preferredSeason ?? CROP_SEASONS[cropType]?.[0] ?? 'spring';

    /** @type {RotationEntry} */
    const entry = {
      cropType,
      preferredSeason,
      priority: options.priority ?? rotation.sequence.length,
    };

    rotation.sequence.push(entry);
  }

  /**
   * Returns the crop entry that should be planted *next* (after the current one
   * is harvested).  Does NOT advance the internal pointer.
   *
   * @param {string} fieldId
   * @returns {RotationEntry|null} null if the sequence is empty
   */
  getNextCrop(fieldId) {
    const rotation = this._getRotation(fieldId);
    if (rotation.sequence.length === 0) return null;

    const nextIndex = (rotation.currentIndex + 1) % rotation.sequence.length;
    return rotation.sequence[nextIndex] ?? null;
  }

  /**
   * Returns the currently active crop entry for `fieldId`.
   *
   * @param {string} fieldId
   * @returns {RotationEntry|null} null if the sequence is empty
   */
  getCurrentCrop(fieldId) {
    const rotation = this._getRotation(fieldId);
    if (rotation.sequence.length === 0) return null;
    return rotation.sequence[rotation.currentIndex] ?? null;
  }

  /**
   * Advances the rotation pointer by one slot (call after harvest).
   * Applies soil quality bonuses/penalties based on crop family diversity.
   *
   * @param {string} fieldId
   * @returns {{ soilQualityDelta: number; newSoilQuality: number; completedCycle: boolean }}
   */
  advanceRotation(fieldId) {
    const rotation = this._getRotation(fieldId);

    const harvestedEntry = this.getCurrentCrop(fieldId);
    const harvestedFamily = harvestedEntry
      ? (CROP_FAMILY[harvestedEntry.cropType] ?? 'unknown')
      : null;

    // Compute soil quality delta
    let soilQualityDelta = 0;
    if (harvestedFamily !== null && rotation.lastCropFamily !== null) {
      if (harvestedFamily !== rotation.lastCropFamily) {
        // Good rotation — different families
        soilQualityDelta = ROTATION_SOIL_BONUS;
      } else {
        // Same family planted consecutively — deplete soil slightly
        soilQualityDelta = -0.1;
      }
    }

    rotation.lastCropFamily = harvestedFamily;
    rotation.soilQuality = Math.max(0, Math.min(1, rotation.soilQuality + soilQualityDelta));

    // Advance index
    const prevIndex = rotation.currentIndex;
    rotation.currentIndex = (prevIndex + 1) % Math.max(rotation.sequence.length, 1);

    const completedCycle = rotation.currentIndex === 0 && rotation.sequence.length > 0;
    if (completedCycle) {
      rotation.cycleCount += 1;
    }

    return {
      soilQualityDelta,
      newSoilQuality: rotation.soilQuality,
      completedCycle,
    };
  }

  /**
   * Returns the current soil quality (0–1) for a field.
   * Higher values confer a growth speed bonus in FieldManager.
   *
   * @param {string} fieldId
   * @returns {number}
   */
  getSoilQuality(fieldId) {
    return this._getRotation(fieldId).soilQuality;
  }

  /**
   * Returns how many complete rotation cycles the field has completed.
   *
   * @param {string} fieldId
   * @returns {number}
   */
  getCycleCount(fieldId) {
    return this._getRotation(fieldId).cycleCount;
  }

  /**
   * Returns the full rotation sequence for a field (read-only copy).
   *
   * @param {string} fieldId
   * @returns {RotationEntry[]}
   */
  getSequence(fieldId) {
    return [...this._getRotation(fieldId).sequence];
  }

  /**
   * Returns which crop types are scheduled for the given season across ALL
   * fields.  Useful for the UI to highlight what should be planted now.
   *
   * @param {string} season
   * @returns {{ fieldId: string; cropType: string }[]}
   */
  getCropsForSeason(season) {
    const results = [];
    for (const [fieldId, rotation] of this._fields) {
      for (const entry of rotation.sequence) {
        if (entry.preferredSeason === season) {
          results.push({ fieldId, cropType: entry.cropType });
        }
      }
    }
    return results;
  }

  /**
   * Removes the entire rotation record for `fieldId`.
   *
   * @param {string} fieldId
   */
  removeField(fieldId) {
    this._fields.delete(fieldId);
  }

  /**
   * Returns all field ids currently tracked.
   *
   * @returns {string[]}
   */
  getAllFieldIds() {
    return [...this._fields.keys()];
  }

  /**
   * Serialises the internal state to a plain object (for save/load).
   *
   * @returns {Object}
   */
  toJSON() {
    const fields = {};
    for (const [id, rotation] of this._fields) {
      fields[id] = { ...rotation, sequence: [...rotation.sequence] };
    }
    return { fields };
  }

  /**
   * Restores state from a previously serialised snapshot.
   *
   * @param {Object} snapshot
   */
  fromJSON(snapshot) {
    this._fields.clear();
    for (const [id, data] of Object.entries(snapshot.fields ?? {})) {
      this._fields.set(id, {
        fieldId: id,
        sequence: data.sequence ?? [],
        currentIndex: data.currentIndex ?? 0,
        cycleCount: data.cycleCount ?? 0,
        lastCropFamily: data.lastCropFamily ?? null,
        soilQuality: data.soilQuality ?? 0.5,
      });
    }
  }
}
