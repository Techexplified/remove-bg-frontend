export interface SelectedImageItem {
  id: string;
  name: string;
  previewUrl: string;
  source?: "canvas" | "upload";
  width?: number;
  height?: number;
  bytes?: Uint8Array;
}

export type HomeViewMode = "empty" | "single" | "multi";
