export type EditTab = "refine" | "magic_brush" | "background" | "filters" | "resize";

export interface RefineAdjustments {
  brightness: number; // 0 to 200, default 100
  contrast: number;   // 0 to 200, default 100
  saturation: number; // 0 to 200, default 100
  opacity: number;    // 0 to 100, default 100
}

export type BackgroundKind = "color" | "gradient" | "image";

export interface GradientConfig {
  angle: number; // 0 to 360 deg
  start: string;
  end: string;
}

export interface BackgroundConfig {
  kind: BackgroundKind;
  color: string;
  gradient: GradientConfig;
  imageSrc: string | null;
}

export type FilterPresetId =
  | "original"
  | "bright"
  | "vivid"
  | "cool"
  | "warm"
  | "dramatic"
  | "bw"
  | "vintage"
  | "crisp";

export interface FilterPreset {
  id: FilterPresetId;
  label: string;
  cssFilter: (strength: number) => string;
}

export interface FilterConfig {
  id: FilterPresetId;
  strength: number; // 0 to 100 %, default 100
}

export type ExportFormat = "png" | "jpg" | "webp";

export type ResizePreset = "square" | "story" | "product" | "original" | "custom";

export interface ResizeConfig {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  lockAspect: boolean;
  preset: ResizePreset;
  format: ExportFormat;
}

export interface RemoveState {
  hasSelection: boolean;
  brushSize: number;
}

export interface EditSnapshot {
  adjustments: RefineAdjustments;
  background: BackgroundConfig;
  filter: FilterConfig;
  resize: ResizeConfig;
  maskDataUrl?: string | null;
}
