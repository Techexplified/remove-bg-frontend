export type PresetCategory = "social" | "ecommerce" | "design" | "custom";

export interface SizePreset {
  id: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  category: "social" | "ecommerce" | "design";
  iconName: string;
}

export type ExportFormat = "png" | "jpg" | "webp";

export interface CompressionSettings {
  enabled: boolean;
  level: number; // 0.1 to 1.0 (e.g. 0.75 for 75%)
  mode: "high" | "balanced" | "max";
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  opacity: number; // 10 to 100
  position: "bottom_right" | "diagonal";
}

export interface CustomDimensions {
  width: number;
  height: number;
  locked: boolean;
  unit?: "px";
}

export type ResizeFitMode = "cover" | "contain";

export interface ResizeExportSettings {
  category: PresetCategory;
  selectedPresetId: string | null;
  customDimensions: CustomDimensions;
  targetWidth: number;
  targetHeight: number;
  exportFormat: ExportFormat;
  compression: CompressionSettings;
  watermark: WatermarkSettings;
  fitMode: ResizeFitMode;
}
