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
import { setUserIdentity, setSelection, setPreviewUrl } from "../../app/slices/figmaSlice";
import { setPlanStatus } from "../../app/slices/statusSlice";
import { setProcessing } from "../../app/slices/uiSlice";
import type { PluginToUIMessage, UIToPluginMessage, SelectionNodeRef } from "../types/messages";
import type { PlanStatus } from "../types/api";

function send(msg: UIToPluginMessage) {
  parent.postMessage({ pluginMessage: msg }, "*");
}

let reqCounter = 0;

export interface PluginBridge {
  exportSelectedImage: () => Promise<Uint8Array>;
  insertResultImage: (bytes: Uint8Array) => void;
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
    imageFilterPreset?: string
  ) => void;
}

const PluginBridgeContext = createContext<PluginBridge | null>(null);

export function PluginBridgeProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const prevUrlRef = useRef<string | null>(null);
  const pendingExport = useRef<{ resolve: (b: Uint8Array) => void; reject: (e: Error) => void } | null>(null);
  const pendingList = useRef<{ resolve: (nodes: SelectionNodeRef[]) => void; reject: (e: Error) => void } | null>(null);
  const pendingNodes = useRef<Map<string, { resolve: (b: Uint8Array) => void; reject: (e: Error) => void }>>(new Map());

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
          // Revoke old blob URL to prevent memory leaks
          if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null; }
          if (msg.payload) {
            const blob = new Blob([msg.payload as unknown as Uint8Array], { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);
            prevUrlRef.current = url;
            dispatch(setPreviewUrl(url));
          } else {
            dispatch(setPreviewUrl(null));
          }
          break;
        }

        case "export-success":
          pendingExport.current?.resolve(msg.payload);
          pendingExport.current = null;
          break;

        case "export-error":
          pendingExport.current?.reject(new Error(msg.payload));
          pendingExport.current = null;
          break;

        case "insert-success":
          dispatch(setProcessing({ stage: "success" }));
          break;

        case "list-selection-result":
          pendingList.current?.resolve(msg.payload);
          pendingList.current = null;
          break;

        case "export-node-result": {
          const pending = pendingNodes.current.get(msg.payload.requestId);
          if (!pending) break;
          if ("bytes" in msg.payload) { pending.resolve(msg.payload.bytes); }
          else { pending.reject(new Error(msg.payload.error)); }
          pendingNodes.current.delete(msg.payload.requestId);
          break;
        }
      }
    };

    window.addEventListener("message", handler);
    send({ type: "request-selection" });
    send({ type: "request-user-id" });
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

  const insertResultImage = useCallback((bytes: Uint8Array) =>
    send({ type: "insert-result-image", payload: bytes }), []);

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
    opacity?: number, backgroundPreset?: string, imageFilterPreset?: string
  ) => send({ type: "apply-image-adjustments", brightness, contrast, saturation, opacity, backgroundPreset, imageFilterPreset }), []);

  const bridge: PluginBridge = {
    exportSelectedImage, insertResultImage, requestPreview, requestUserIdRetry,
    openExternal, notify, listSelection, exportNode, resizeSelection, applyAdjustments,
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
