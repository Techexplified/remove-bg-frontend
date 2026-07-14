import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SelectionInfo } from "../../shared/types/messages";

interface FigmaState {
  userId: string | null;
  displayName: string | null;
  hasReceivedUserId: boolean;
  selection: SelectionInfo;
  previewUrl: string | null;
}

const initialState: FigmaState = {
  userId: null,
  displayName: null,
  hasReceivedUserId: false,
  selection: { hasSelection: false },
  previewUrl: null,
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
  },
});

export const { setUserIdentity, setSelection, setPreviewUrl } = figmaSlice.actions;
export default figmaSlice.reducer;
