import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SelectionInfo } from "../../shared/types/messages";

export interface UploadedImageInfo {
  name: string;
  previewUrl: string;
  bytes: Uint8Array;
  width?: number;
  height?: number;
  originalPreviewUrl?: string;
  originalBytes?: Uint8Array;
  source?: "canvas" | "upload";
  nodeId?: string;
}

export interface EditingImageInfo {
  id: string;
  name: string;
  previewUrl: string;
  width?: number;
  height?: number;
  bytes?: Uint8Array;
}

export interface BatchResultItem {
  id: string;
  nodeId?: string;
  name: string;
  previewUrl: string;
  bytes: Uint8Array;
  width?: number;
  height?: number;
  source?: "canvas" | "upload";
  status: "waiting" | "processing" | "done" | "error";
  resultUrl?: string;
  resultBytes?: Uint8Array;
  errorMessage?: string;
}

interface FigmaState {
  userId: string | null;
  displayName: string | null;
  hasReceivedUserId: boolean;
  selection: SelectionInfo;
  previewUrl: string | null;
  originalUrl: string | null;
  imageFormat: string;
  uploadedImage: UploadedImageInfo | null;
  activeImageSource: "canvas" | "upload";
  editingImage: EditingImageInfo | null;
  batchResultItems: BatchResultItem[];
}

const CACHED_USER_ID_KEY = "removebg_cached_user_id";
const CACHED_DISPLAY_NAME_KEY = "removebg_cached_display_name";

function loadCachedUser(): { userId: string | null; displayName: string | null } {
  try {
    const uid = localStorage.getItem(CACHED_USER_ID_KEY) || localStorage.getItem("removebg_anon_user_id") || localStorage.getItem("zerobg_anon_user_id");
    const name = localStorage.getItem(CACHED_DISPLAY_NAME_KEY);
    if (uid) {
      const w = window as unknown as { __figmaUserId?: string | null; __figmaDisplayName?: string };
      w.__figmaUserId = uid;
      w.__figmaDisplayName = name || "Figma User";
      return { userId: uid, displayName: name || "Figma User" };
    }
  } catch {
    // Ignore storage errors
  }
  return { userId: null, displayName: null };
}

const cachedUser = loadCachedUser();

const initialState: FigmaState = {
  userId: cachedUser.userId,
  displayName: cachedUser.displayName,
  hasReceivedUserId: cachedUser.userId !== null,
  selection: { hasSelection: false },
  previewUrl: null,
  originalUrl: null,
  imageFormat: "PNG",
  uploadedImage: null,
  activeImageSource: "canvas",
  editingImage: null,
  batchResultItems: [],
};

const figmaSlice = createSlice({
  name: "figma",
  initialState,
  reducers: {
    setUserIdentity: (s, a: PayloadAction<{ userId: string | null; displayName: string }>) => {
      s.userId = a.payload.userId;
      s.displayName = a.payload.displayName || null;
      s.hasReceivedUserId = true;
      // Store on window for the plain apiFetch client (shared/api/client.ts)
      // to read synchronously when building request headers.
      const w = window as unknown as { __figmaUserId?: string | null; __figmaDisplayName?: string };
      w.__figmaUserId = a.payload.userId ?? undefined;
      w.__figmaDisplayName = a.payload.displayName;

      try {
        if (a.payload.userId) {
          localStorage.setItem(CACHED_USER_ID_KEY, a.payload.userId);
          localStorage.setItem(CACHED_DISPLAY_NAME_KEY, a.payload.displayName || "");
        }
      } catch {
        // Ignore storage errors
      }
    },
    setSelection: (s, a: PayloadAction<SelectionInfo>) => {
      const prevId = s.selection.hasSelection ? s.selection.id : undefined;
      const nextId = a.payload.hasSelection ? a.payload.id : undefined;

      // Only reset canvas originalUrl if there is no active uploaded/staged image
      if (!s.uploadedImage && (!a.payload.hasSelection || (prevId && nextId && prevId !== nextId))) {
        s.originalUrl = null;
      }

      s.selection = a.payload;
      if (a.payload.hasSelection && !s.uploadedImage) {
        s.activeImageSource = "canvas";
      }
    },
    setPreviewUrl: (s, a: PayloadAction<string | null>) => { s.previewUrl = a.payload; },

    setOriginalUrl: (s, a: PayloadAction<string | null>) => {
      s.originalUrl = a.payload;
    },
    setImageFormat: (s, a: PayloadAction<string>) => {
      s.imageFormat = a.payload;
    },
    setUploadedImage: (s, a: PayloadAction<UploadedImageInfo | null>) => {
      s.uploadedImage = a.payload;
      if (a.payload) {
        s.activeImageSource = "upload";
      }
    },
    setActiveImageSource: (s, a: PayloadAction<"canvas" | "upload">) => {
      s.activeImageSource = a.payload;
    },
    clearUploadedImage: (s) => {
      const oldPreview = s.uploadedImage?.previewUrl;
      const oldOriginal = s.uploadedImage?.originalPreviewUrl;
      if (oldPreview && oldPreview.startsWith("blob:")) {
        try { URL.revokeObjectURL(oldPreview); } catch { /* ignore */ }
      }
      if (oldOriginal && oldOriginal !== oldPreview && oldOriginal.startsWith("blob:")) {
        try { URL.revokeObjectURL(oldOriginal); } catch { /* ignore */ }
      }
      // If s.originalUrl was referencing the deleted uploaded image, clear it
      if (s.originalUrl && (s.originalUrl === oldPreview || s.originalUrl === oldOriginal)) {
        s.originalUrl = null;
      }
      s.uploadedImage = null;
      s.activeImageSource = "canvas";
    },
    setEditingImage: (s, a: PayloadAction<EditingImageInfo | null>) => {
      s.editingImage = a.payload;
    },
    setBatchResultItems: (s, a: PayloadAction<BatchResultItem[]>) => {
      s.batchResultItems = a.payload;
    },
    updateBatchResultItemStatus: (
      s,
      a: PayloadAction<{
        id: string;
        status: "waiting" | "processing" | "done" | "error";
        resultUrl?: string;
        resultBytes?: Uint8Array;
        errorMessage?: string;
      }>
    ) => {
      const item = s.batchResultItems.find((i) => i.id === a.payload.id);
      if (item) {
        item.status = a.payload.status;
        if (a.payload.resultUrl) item.resultUrl = a.payload.resultUrl;
        if (a.payload.resultBytes) item.resultBytes = a.payload.resultBytes;
        if (a.payload.errorMessage) item.errorMessage = a.payload.errorMessage;
      }
    },
  },
});

export const {
  setUserIdentity,
  setSelection,
  setPreviewUrl,
  setOriginalUrl,
  setImageFormat,
  setUploadedImage,
  setActiveImageSource,
  clearUploadedImage,
  setEditingImage,
  setBatchResultItems,
  updateBatchResultItemStatus,
} = figmaSlice.actions;
export default figmaSlice.reducer;
