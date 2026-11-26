/**
 * PluginBridgeContext — single source of truth for the Figma ↔ UI message bridge.
 *
 * Before this context, usePluginBridge() was called in 4 separate components
 * (AppReady, AppShell, SettingsScreen, AiTrialInvite), each registering its own
 * window.addEventListener("message", handler). That caused every Figma postMessage
 * to be processed multiple times. This context registers the handler exactly once
 * at the Provider level, and all children share the same API object.
 */

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { store } from "../../app/store";
import {
  setUserIdentity,
  setSelection,
  setPreviewUrl,
  setOriginalUrl,
  setImageFormat,
  setHistoryItems,
  addHistoryItem,
  removeHistoryItem,
  clearHistoryItems,
} from "../../app/slices/figmaSlice";
import { detectImageFormat } from "../utils/imageFormat";
import { dataUrlToUint8Array, compressHighResCutout } from "../utils/thumbnailHelper";
import { setPlanStatus } from "../../app/slices/statusSlice";
import type { PluginToUIMessage, UIToPluginMessage, SelectionNodeRef, HistoryMetaItem } from "../types/messages";
import type { PlanStatus } from "../types/api";

function send(msg: UIToPluginMessage) {
  parent.postMessage({ pluginMessage: msg }, "*");
}

let reqCounter = 0;

export interface PluginBridge {
  exportSelectedImage: () => Promise<Uint8Array>;
  insertResultImage: (payload: Uint8Array | { bytes: Uint8Array; mode?: "new" | "replace"; nodeId?: string }) => void;
  requestPreview: () => void;
  requestUserIdRetry: () => void;
  openExternal: (url: string) => void;
  notify: (msg: string) => void;
  listSelection: () => Promise<SelectionNodeRef[]>;
  exportNode: (nodeId: string) => Promise<Uint8Array>;
  resizeSelection: (width: number, height: number) => void;
  applyAdjustments: (
    brightness: number,
    contrast: number,
    saturation: number,
    opacity?: number,
    backgroundPreset?: string,
    imageFilterPreset?: string,
    customBgBytes?: Uint8Array
  ) => void;
  exportSelectionBatch: () => Promise<Array<{ id: string; name: string; bytes: Uint8Array; width: number; height: number }>>;
  insertBatchResultImages: (items: Array<{ name: string; bytes: Uint8Array }>) => void;
  resizeWindow: (width: number, height: number) => void;
  requestSelection: () => void;
  saveHistoryItem: (item: HistoryMetaItem, cutoutBytes?: Uint8Array) => void;
  deleteHistoryItem: (id: string) => void;
  clearAllHistory: () => void;
  getHistoryItemBytes: (id: string, fallbackThumbnailDataUrl?: string) => Promise<Uint8Array | null>;
  requestHistoryList: () => void;
}

const PluginBridgeContext = createContext<PluginBridge | null>(null);

export function PluginBridgeProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const prevUrlRef = useRef<string | null>(null);
  const pendingExport = useRef<{ resolve: (b: Uint8Array) => void; reject: (e: Error) => void } | null>(null);
  const pendingList = useRef<{ resolve: (nodes: SelectionNodeRef[]) => void; reject: (e: Error) => void } | null>(null);
  const pendingNodes = useRef<Map<string, { resolve: (b: Uint8Array) => void; reject: (e: Error) => void }>>(new Map());
  const pendingBatchExport = useRef<{ resolve: (items: Array<{ id: string; name: string; bytes: Uint8Array; width: number; height: number }>) => void; reject: (e: Error) => void } | null>(null);
  const inMemoryCutoutCache = useRef<Map<string, Uint8Array>>(new Map());
  const pendingHistoryImageBytes = useRef<Map<string, { resolve: (b: Uint8Array | null) => void; reject: (e: Error) => void }>>(new Map());

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginToUIMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case "figma-user-id": {
          let uid = msg.payload;
          if (!uid) {
            try {
              uid = localStorage.getItem("removebg_anon_user_id") || localStorage.getItem("zerobg_anon_user_id");
              if (!uid) {
                uid = `anon_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
                localStorage.setItem("removebg_anon_user_id", uid);
              }
            } catch {
              uid = `anon_${Date.now().toString(36)}`;
            }
          }
          dispatch(setUserIdentity({ userId: uid, displayName: msg.displayName || "Figma User" }));
          if (msg.cachedStatus && typeof msg.cachedStatus === "object") {
            dispatch(setPlanStatus(msg.cachedStatus as PlanStatus));
          }
          break;
        }

        case "cached-plan-status": {
          if (msg.payload && typeof msg.payload === "object") {
            dispatch(setPlanStatus(msg.payload as PlanStatus));
          }
          break;
        }

        case "selection-changed":
          dispatch(setSelection(msg.payload));
          break;

        case "preview-update": {
          const currentSection = store.getState().ui.activeSection;
          // Never overwrite preview while user is actively reviewing a result, editing, or viewing batch results
          if (currentSection === "preview" || currentSection === "edit_studio" || currentSection === "batch_results") {
            break;
          }

          // Revoke old blob URL to prevent memory leaks
          if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null; }
          if (msg.payload) {
            const rawBytes = msg.payload as Uint8Array;
            const format = detectImageFormat(rawBytes);
            const mime = format === "JPG" ? "image/jpeg" : format === "WEBP" ? "image/webp" : format === "GIF" ? "image/gif" : "image/png";
            const blob = new Blob([rawBytes as unknown as BlobPart], { type: mime });
            const url = URL.createObjectURL(blob);
            prevUrlRef.current = url;
            dispatch(setPreviewUrl(url));
            dispatch(setImageFormat(format));
          } else {
            dispatch(setPreviewUrl(null));
            dispatch(setOriginalUrl(null));
            dispatch(setImageFormat("PNG"));
          }
          break;
        }

        case "export-success":
          if (msg.payload) {
            dispatch(setImageFormat(detectImageFormat(msg.payload as Uint8Array)));
          }
          pendingExport.current?.resolve(msg.payload);
          pendingExport.current = null;
          break;

        case "export-error":
          pendingExport.current?.reject(new Error(msg.payload));
          pendingExport.current = null;
          break;

        case "insert-success":
          // Image insertion completed. No generic modal needed (App.tsx manages its own flow).
          break;

        case "list-selection-result":
          pendingList.current?.resolve(msg.payload);
          pendingList.current = null;
          break;

        case "export-selection-batch-result":
          pendingBatchExport.current?.resolve(msg.payload);
          pendingBatchExport.current = null;
          break;

        case "export-node-result": {
          const pending = pendingNodes.current.get(msg.payload.requestId);
          if (!pending) break;
          if ("bytes" in msg.payload) { pending.resolve(msg.payload.bytes); }
          else { pending.reject(new Error(msg.payload.error)); }
          pendingNodes.current.delete(msg.payload.requestId);
          break;
        }

        case "history-list-updated": {
          dispatch(setHistoryItems(msg.payload || []));
          break;
        }

        case "history-image-bytes-result": {
          const pending = pendingHistoryImageBytes.current.get(msg.requestId);
          if (pending) {
            pending.resolve(msg.bytes);
            pendingHistoryImageBytes.current.delete(msg.requestId);
          }
          break;
        }
      }
    };

    window.addEventListener("message", handler);
    send({ type: "request-selection" });
    send({ type: "request-user-id" });
    send({ type: "request-history-list" });
    return () => {
      window.removeEventListener("message", handler);
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, [dispatch]);

  const status = useAppSelector(s => s.status.data);
  useEffect(() => {
    if (status) {
      send({ type: "persist-plan-status", payload: status });
    }
  }, [status]);

  const exportSelectedImage = useCallback((): Promise<Uint8Array> =>
    new Promise((resolve, reject) => {
      pendingExport.current = { resolve, reject };
      send({ type: "export-selected-image" });
    }), []);

  const insertResultImage = useCallback((payload: Uint8Array | { bytes: Uint8Array; mode?: "new" | "replace"; nodeId?: string }) =>
    send({ type: "insert-result-image", payload }), []);

  const requestPreview = useCallback(() => send({ type: "request-preview" }), []);
  const requestUserIdRetry = useCallback(() => send({ type: "request-user-id" }), []);
  const openExternal = useCallback((url: string) => send({ type: "open-external", payload: url }), []);
  const notify = useCallback((msg: string) => send({ type: "notify", payload: msg }), []);

  const listSelection = useCallback((): Promise<SelectionNodeRef[]> =>
    new Promise((resolve, reject) => {
      // BUG-09 fix: include reject so the promise doesn't hang forever on plugin error.
      // Timeout after 8s as a safety net.
      const timeoutId = setTimeout(() => {
        if (pendingList.current) {
          pendingList.current = null;
          reject(new Error("listSelection timed out — plugin did not respond."));
        }
      }, 8000);
      pendingList.current = {
        resolve: (nodes) => { clearTimeout(timeoutId); resolve(nodes); },
        reject: (err) => { clearTimeout(timeoutId); reject(err); },
      };
      send({ type: "list-selection" });
    }), []);

  const exportNode = useCallback((nodeId: string): Promise<Uint8Array> => {
    const requestId = `req_${++reqCounter}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      pendingNodes.current.set(requestId, { resolve, reject });
      send({ type: "export-node-by-id", requestId, nodeId });
    });
  }, []);

  const resizeSelection = useCallback((width: number, height: number) =>
    send({ type: "resize-selection", width, height }), []);

  const applyAdjustments = useCallback((
    brightness: number, contrast: number, saturation: number,
    opacity?: number, backgroundPreset?: string, imageFilterPreset?: string,
    customBgBytes?: Uint8Array
  ) => send({ type: "apply-image-adjustments", brightness, contrast, saturation, opacity, backgroundPreset, imageFilterPreset, customBgBytes }), []);

  const exportSelectionBatch = useCallback((): Promise<Array<{ id: string; name: string; bytes: Uint8Array; width: number; height: number }>> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (pendingBatchExport.current) {
          pendingBatchExport.current = null;
          reject(new Error("Batch selection export timed out."));
        }
      }, 15000);
      pendingBatchExport.current = {
        resolve: (items) => { clearTimeout(timeoutId); resolve(items); },
        reject: (err) => { clearTimeout(timeoutId); reject(err); },
      };
      send({ type: "export-selection-batch" });
    });
  }, []);

  const insertBatchResultImages = useCallback((items: Array<{ name: string; bytes: Uint8Array }>) => {
    send({ type: "insert-batch-result-images", items });
  }, []);

  const resizeWindow = useCallback((width: number, height: number) => {
    send({ type: "resize-window", width, height });
  }, []);

  const requestSelection = useCallback(() => {
    send({ type: "request-selection" });
  }, []);

  const saveHistoryItem = useCallback(
    (item: HistoryMetaItem, cutoutBytes?: Uint8Array) => {
      if (cutoutBytes && cutoutBytes.length > 0) {
        inMemoryCutoutCache.current.set(item.id, cutoutBytes);
      }
      dispatch(addHistoryItem(item));

      // Asynchronously compress high-res copy and persist to clientStorage
      if (cutoutBytes && cutoutBytes.length > 0) {
        void (async () => {
          try {
            const highResBytes = await compressHighResCutout(cutoutBytes);
            send({ type: "save-history-item", payload: item, highResBytes });
          } catch {
            send({ type: "save-history-item", payload: item, highResBytes: cutoutBytes });
          }
        })();
      } else {
        send({ type: "save-history-item", payload: item });
      }
    },
    [dispatch]
  );

  const deleteHistoryItem = useCallback(
    (id: string) => {
      inMemoryCutoutCache.current.delete(id);
      dispatch(removeHistoryItem(id));
      send({ type: "delete-history-item", payload: { id } });
    },
    [dispatch]
  );

  const clearAllHistory = useCallback(() => {
    inMemoryCutoutCache.current.clear();
    dispatch(clearHistoryItems());
    send({ type: "clear-all-history" });
  }, [dispatch]);

  const getHistoryItemBytes = useCallback(
    async (id: string, fallbackThumbnailDataUrl?: string): Promise<Uint8Array | null> => {
      // 1. Check in-memory RAM cache (0ms instant during active session)
      const cached = inMemoryCutoutCache.current.get(id);
      if (cached && cached.length > 0) return cached;

      // 2. Lazy load high-res bytes from clientStorage across plugin restarts
      const requestId = `hist_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        const bytesPromise = new Promise<Uint8Array | null>((resolve, reject) => {
          const timeout = setTimeout(() => {
            pendingHistoryImageBytes.current.delete(requestId);
            resolve(null);
          }, 4000);
          pendingHistoryImageBytes.current.set(requestId, {
            resolve: (b) => {
              clearTimeout(timeout);
              resolve(b);
            },
            reject: (err) => {
              clearTimeout(timeout);
              reject(err);
            },
          });
          send({ type: "request-history-image-bytes", requestId, id });
        });

        const loadedBytes = await bytesPromise;
        if (loadedBytes && loadedBytes.length > 0) {
          inMemoryCutoutCache.current.set(id, loadedBytes);
          return loadedBytes;
        }
      } catch (err) {
        console.warn("Failed to lazy-load history item bytes:", err);
      }

      // 3. Fallback to thumbnail data URL if clientStorage was empty
      if (fallbackThumbnailDataUrl) {
        return dataUrlToUint8Array(fallbackThumbnailDataUrl);
      }
      return null;
    },
    []
  );

  const requestHistoryList = useCallback(() => {
    send({ type: "request-history-list" });
  }, []);

  const bridge: PluginBridge = {
    exportSelectedImage,
    insertResultImage,
    requestPreview,
    requestUserIdRetry,
    openExternal,
    notify,
    listSelection,
    exportNode,
    resizeSelection,
    applyAdjustments,
    exportSelectionBatch,
    insertBatchResultImages,
    resizeWindow,
    requestSelection,
    saveHistoryItem,
    deleteHistoryItem,
    clearAllHistory,
    getHistoryItemBytes,
    requestHistoryList,
  };

  return (
    <PluginBridgeContext.Provider value={bridge}>
      {children}
    </PluginBridgeContext.Provider>
  );
}

/** Use this in any component that needs to call bridge functions.
 *  Throws if called outside a PluginBridgeProvider. */
export function usePluginBridgeContext(): PluginBridge {
  const ctx = useContext(PluginBridgeContext);
  if (!ctx) throw new Error("usePluginBridgeContext must be used inside PluginBridgeProvider");
  return ctx;
}
