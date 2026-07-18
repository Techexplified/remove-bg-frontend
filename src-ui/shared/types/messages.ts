// ============================================================================
// Figma Plugin Bridge Message Types
// ============================================================================

export type PluginToUIMessage =
  | { type: "selection-changed"; payload: SelectionInfo }
  | { type: "export-success"; payload: Uint8Array }
  | { type: "export-error"; payload: string }
  | { type: "insert-success" }
  | { type: "figma-user-id"; payload: string | null; displayName?: string }
  | { type: "list-selection-result"; payload: SelectionNodeRef[] }
  | { type: "export-node-result"; payload: ExportNodeResult }
  | { type: "preview-update"; payload: Uint8Array | null };

export type UIToPluginMessage =
  | { type: "request-selection" }
  | { type: "request-user-id" }
  | { type: "request-preview" }
  | { type: "export-selected-image" }
  | { type: "insert-result-image"; payload: Uint8Array }
  | { type: "list-selection" }
  | { type: "export-node-by-id"; requestId: string; nodeId: string }
  | { type: "resize-selection"; width: number; height: number }
  | { type: "apply-image-adjustments"; brightness: number; contrast: number; saturation: number }
  | { type: "open-external"; payload: string }
  | { type: "notify"; payload: string }
  | { type: "close-plugin" };

export type SelectionInfo =
  | { hasSelection: false }
  | { hasSelection: true; name: string; width: number; height: number; count: number; pixelCount: number };

export interface SelectionNodeRef { id: string; name: string; }

export type ExportNodeResult =
  | { requestId: string; bytes: Uint8Array }
  | { requestId: string; error: string };
