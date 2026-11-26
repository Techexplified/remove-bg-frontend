// ============================================================================
// Figma Plugin Bridge Message Types
// ============================================================================

export interface HistoryMetaItem {
  id: string;
  name: string;
  timestamp: number;
  width?: number;
  height?: number;
  format?: string;
  source?: "canvas" | "upload";
  nodeId?: string;
  thumbnailDataUrl: string;
}

export type PluginToUIMessage =
  | { type: "selection-changed"; payload: SelectionInfo }
  | { type: "export-success"; payload: Uint8Array }
  | { type: "export-error"; payload: string }
  | { type: "insert-success" }
  | { type: "figma-user-id"; payload: string | null; displayName?: string; cachedStatus?: unknown }
  | { type: "cached-plan-status"; payload: unknown }
  | { type: "list-selection-result"; payload: SelectionNodeRef[] }
  | { type: "export-node-result"; payload: ExportNodeResult }
  | { type: "export-selection-batch-result"; payload: Array<{ id: string; name: string; bytes: Uint8Array; width: number; height: number }> }
  | { type: "preview-update"; payload: Uint8Array | null }
  | { type: "history-list-updated"; payload: HistoryMetaItem[] }
  | { type: "history-image-bytes-result"; requestId: string; id: string; bytes: Uint8Array | null };

export type UIToPluginMessage =
  | { type: "request-selection" }
  | { type: "request-user-id" }
  | { type: "request-preview" }
  | { type: "export-selected-image" }
  | { type: "insert-result-image"; payload: Uint8Array | { bytes: Uint8Array; mode?: "new" | "replace"; nodeId?: string } }
  | { type: "export-selection-batch" }
  | { type: "insert-batch-result-images"; items: Array<{ name: string; bytes: Uint8Array }> }
  | { type: "list-selection" }
  | { type: "export-node-by-id"; requestId: string; nodeId: string }
  | { type: "resize-selection"; width: number; height: number }
  | {
      type: "apply-image-adjustments";
      brightness: number;
      contrast: number;
      saturation: number;
      opacity?: number;
      backgroundPreset?: string;
      imageFilterPreset?: string;
      customBgBytes?: Uint8Array;
    }
  | { type: "persist-plan-status"; payload: unknown }
  | { type: "open-external"; payload: string }
  | { type: "notify"; payload: string }
  | { type: "resize-window"; width: number; height: number }
  | { type: "close-plugin" }
  | { type: "request-history-list" }
  | { type: "save-history-item"; payload: HistoryMetaItem; highResBytes?: Uint8Array }
  | { type: "request-history-image-bytes"; requestId: string; id: string }
  | { type: "delete-history-item"; payload: { id: string } }
  | { type: "clear-all-history" };

export type SelectionInfo =
  | { hasSelection: false }
  | { hasSelection: true; id?: string; name: string; width: number; height: number; count: number; pixelCount: number };

export interface SelectionNodeRef { id: string; name: string; }

export type ExportNodeResult =
  | { requestId: string; bytes: Uint8Array }
  | { requestId: string; error: string };
