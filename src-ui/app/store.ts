import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import figmaReducer from "./slices/figmaSlice";
import statusReducer from "./slices/statusSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    figma: figmaReducer,
    status: statusReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Uint8Array (image bytes) is non-serializable — ignore it
        ignoredActionPaths: ["payload.bytes", "payload", "meta.arg.imageBytes"],
        ignoredPaths: ["figma.previewUrl"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
