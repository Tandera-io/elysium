export interface StageShapeConfig {
  coneRadius: number;
  coneHeight: number;
  segments: number;
  swayAmplitude: number;
  swayFreq: number;
}

export declare const STAGE_SHAPE_CONFIGS: readonly StageShapeConfig[];
export declare function shapeForStage(stageIndex: number): StageShapeConfig;
