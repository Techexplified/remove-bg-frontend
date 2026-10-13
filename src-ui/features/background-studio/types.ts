export type BackgroundTab = "color" | "gradient" | "image";

export interface GradientStop {
  color: string;
  offset: number; // 0 to 1
}

export interface GradientConfig {
  angle: number; // in degrees, e.g. 135
  stops: [GradientStop, GradientStop]; // 2-stop gradient
}

export interface AdjustmentsState {
  opacity: number; // 0 to 100 (default 100)
  brightness: number; // 0 to 200 (default 100, where 100 is normal)
  contrast: number; // 0 to 200 (default 100)
  saturation: number; // 0 to 200 (default 100)
  blur: number; // 0 to 20px (default 0)
}

export type StudioFilter = "normal" | "bw" | "sepia" | "vivid" | "cool" | "warm";

export interface StudioShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetY: number;
}

export type BackgroundPreset = {
  id: string;
  name: string;
  type: "gradient" | "image";
  colors?: [string, string];
  angle?: number;
  effect?: "shadow" | "glow" | "vignette" | "none";
  imageUrl?: string;
};

export interface RecentBackgroundItem {
  id: string;
  type: "color" | "gradient" | "image";
  value: string; // hex color, css gradient string, or thumbnail data url
  gradient?: GradientConfig;
  timestamp: number;
}

export interface CompositorParams {
  foregroundImage: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
  bgType: BackgroundTab | "preset";
  solidColor: string;
  gradient: GradientConfig;
  backdropImage: HTMLImageElement | ImageBitmap | null;
  preset?: BackgroundPreset | null;
  adjustments: AdjustmentsState;
  filter: StudioFilter;
  shadow: StudioShadow;
}
