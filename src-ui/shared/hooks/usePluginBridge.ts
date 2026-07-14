import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "../../app/hooks";
import { setUserIdentity, setSelection, setPreviewUrl } from "../../app/slices/figmaSlice";
import { setProcessing } from "../../app/slices/uiSlice";
import type { PluginToUIMessage, UIToPluginMessage, SelectionNodeRef } from "../types/messages";

function send(msg: UIToPluginMessage) {
  parent.postMessage({ pluginMessage: msg }, "*");
}

let reqCounter = 0;

export function usePluginBridge() {
  const dispatch = useAppDispatch();
  const prevUrlRef = useRef<string | null>(null);

  const pendingExport = useRef<{ resolve: (b: Uint8Array) => void; reject: (e: Error) => void } | null>(null);
  const pendingList = useRef<{ resolve: (nodes: SelectionNodeRef[]) => void } | null>(null);
  const pendingNodes = useRef<Map<string, { resolve: (b: Uint8Array) => void; reject: (e: Error) => void }>>(new Map());

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginToUIMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case "figma-user-id":
          dispatch(setUserIdentity({ userId: msg.payload, displayName: msg.displayName ?? "" }));
          break;

        case "selection-changed":
          dispatch(setSelection(msg.payload));
          break;

        case "preview-update": {
          // Revoke old blob URL to prevent memory leaks
          if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null; }
          if (msg.payload) {
            const blob = new Blob([msg.payload as unknown as ArrayBufferView<ArrayBuffer>], { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);
            prevUrlRef.current = url;
            dispatch(setPreviewUrl(url));
          } else { dispatch(setPreviewUrl(null)); }
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
          // Status refresh happens explicitly in App.tsx's executeFeature
          // after runFeature() resolves — no cache invalidation needed here.
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
    return () => {
      window.removeEventListener("message", handler);
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, [dispatch]);

  const exportSelectedImage = useCallback((): Promise<Uint8Array> =>
    new Promise((resolve, reject) => { pendingExport.current = { resolve, reject }; send({ type: "export-selected-image" }); }), []);

  const insertResultImage = useCallback((bytes: Uint8Array) => send({ type: "insert-result-image", payload: bytes }), []);
  const requestPreview = useCallback(() => send({ type: "request-preview" }), []);
  const requestUserIdRetry = useCallback(() => send({ type: "request-user-id" }), []);
  const openExternal = useCallback((url: string) => send({ type: "open-external", payload: url }), []);
  const notify = useCallback((msg: string) => send({ type: "notify", payload: msg }), []);

  const listSelection = useCallback((): Promise<SelectionNodeRef[]> =>
    new Promise((resolve) => { pendingList.current = { resolve }; send({ type: "list-selection" }); }), []);

  const exportNode = useCallback((nodeId: string): Promise<Uint8Array> => {
    const requestId = `req_${++reqCounter}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      pendingNodes.current.set(requestId, { resolve, reject });
      send({ type: "export-node-by-id", requestId, nodeId });
    });
  }, []);

  const resizeSelection = useCallback((width: number, height: number) => send({ type: "resize-selection", width, height }), []);
  const applyAdjustments = useCallback((brightness: number, contrast: number, saturation: number, opacity?: number, backgroundPreset?: string) =>
    send({ type: "apply-image-adjustments", brightness, contrast, saturation, opacity, backgroundPreset }), []);

  return { exportSelectedImage, insertResultImage, requestPreview, requestUserIdRetry, openExternal, notify, listSelection, exportNode, resizeSelection, applyAdjustments };
}
