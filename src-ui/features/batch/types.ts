export type BatchItemStatus = "idle" | "processing" | "done" | "error";

export interface BatchItem {
  id: string;
  name: string;
  originalBytes: Uint8Array;
  previewUrl: string;
  selected: boolean;
  status: BatchItemStatus;
  resultBytes?: Uint8Array;
  resultPreviewUrl?: string;
  error?: string;
  width?: number;
  height?: number;
}

export type BatchBackgroundType = "transparent" | "white" | "black";
export type BatchResizeRatio = "original" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
export type BatchExportFormat = "png" | "jpg" | "webp";

export interface BatchSettings {
  removeBackground: boolean;
  background: BatchBackgroundType;
  resize: BatchResizeRatio;
  exportFormat: BatchExportFormat;
}
