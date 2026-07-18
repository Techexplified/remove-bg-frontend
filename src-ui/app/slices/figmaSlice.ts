import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SelectionInfo } from "../../shared/types/messages";

interface FigmaState {
  userId: string | null;
  displayName: string | null;
  hasReceivedUserId: boolean;
  selection: SelectionInfo;
  previewUrl: string | null;
  originalUrl: string | null;
}

const initialState: FigmaState = {
  userId: null,
  displayName: null,
  hasReceivedUserId: false,
  selection: { hasSelection: false },
  previewUrl: null,
  originalUrl: null,
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
    },
    setSelection: (s, a: PayloadAction<SelectionInfo>) => { s.selection = a.payload; },
    setPreviewUrl: (s, a: PayloadAction<string | null>) => { s.previewUrl = a.payload; },

    // Fix #10 — revoke the old originalUrl blob URL before overwriting, to prevent memory leaks.
    setOriginalUrl: (s, a: PayloadAction<string | null>) => {
      if (s.originalUrl && s.originalUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(s.originalUrl); } catch { /* ignore */ }
      }
      s.originalUrl = a.payload;
    },
  },
});

export const { setUserIdentity, setSelection, setPreviewUrl, setOriginalUrl } = figmaSlice.actions;
export default figmaSlice.reducer;
