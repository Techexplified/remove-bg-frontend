figma.showUI(__html__, { width: 540, height: 700, themeColors: false });

// Send user identity to UI immediately and on retry requests
function sendUserIdentity() {
  figma.ui.postMessage({
    type: "figma-user-id",
    payload: figma.currentUser?.id ?? null,
    displayName: figma.currentUser?.name ?? ""
  });
}

sendUserIdentity();

type SelectionInfo =
  | { hasSelection: false }
  | { hasSelection: true; name: string; width: number; height: number; count: number; pixelCount: number };

function isExportable(node: SceneNode): node is SceneNode & ExportMixin & LayoutMixin {
  return "exportAsync" in node && "width" in node;
}

function getSelectionInfo(): SelectionInfo {
  const sel = figma.currentPage.selection.filter(isExportable);
  if (sel.length === 0) return { hasSelection: false };
  const first = sel[0];
  const w = Math.round(first.width), h = Math.round(first.height);
  return { hasSelection: true, name: sel.length === 1 ? first.name : `${sel.length} layers`, width: w, height: h, count: sel.length, pixelCount: w * h };
}

function broadcastSelection() {
  figma.ui.postMessage({ type: "selection-changed", payload: getSelectionInfo() });
  void pushPreview();
}

broadcastSelection();
figma.on("selectionchange", broadcastSelection);

async function pushPreview() {
  const sel = figma.currentPage.selection.filter(isExportable);
  if (sel.length === 0) { figma.ui.postMessage({ type: "preview-update", payload: null }); return; }
  try {
    // Wait 150ms to ensure Figma finishes compiling and rendering the image paints/fills
    await new Promise(resolve => setTimeout(resolve, 150));
    const bytes = await sel[0].exportAsync({ format: "JPG", constraint: { type: "SCALE", value: 1 } });
    figma.ui.postMessage({ type: "preview-update", payload: bytes });
  } catch { figma.ui.postMessage({ type: "preview-update", payload: null }); }
}

figma.ui.onmessage = async (msg: { type: string; [k: string]: unknown }) => {
  switch (msg.type) {
    case "request-selection": broadcastSelection(); break;
    case "request-preview": void pushPreview(); break;
    case "request-user-id": sendUserIdentity(); break;

    case "export-selected-image": {
      const sel = figma.currentPage.selection.filter(isExportable);
      if (sel.length !== 1) { figma.ui.postMessage({ type: "export-error", payload: "Select a single layer first." }); break; }
      try {
        const bytes = await (sel[0] as SceneNode & ExportMixin).exportAsync({ format: "PNG" });
        figma.ui.postMessage({ type: "export-success", payload: bytes });
      } catch (e) { figma.ui.postMessage({ type: "export-error", payload: e instanceof Error ? e.message : "Export failed." }); }
      break;
    }

    case "insert-result-image": {
      const bytes = msg.payload as Uint8Array;
      try {
        const img = figma.createImage(bytes);
        const { width, height } = await img.getSizeAsync();
        const rect = figma.createRectangle();
        rect.resize(width, height);
        rect.fills = [{ type: "IMAGE", imageHash: img.hash, scaleMode: "FILL" }];
        rect.x = figma.viewport.center.x - width / 2;
        rect.y = figma.viewport.center.y - height / 2;
        rect.name = "RemoveBG result";
        figma.currentPage.appendChild(rect);
        figma.currentPage.selection = [rect];
        figma.viewport.scrollAndZoomIntoView([rect]);
        figma.ui.postMessage({ type: "insert-success" });
        void pushPreview();
      } catch (e) { figma.notify(e instanceof Error ? e.message : "Couldn't place result."); }
      break;
    }

    case "resize-selection": {
      const { width, height } = msg as unknown as { width: number; height: number };
      const sel = figma.currentPage.selection.filter((n): n is SceneNode & LayoutMixin => "resize" in n);
      if (sel.length === 0) { figma.notify("Select a layer to resize."); break; }
      sel.forEach(n => n.resize(width, height));
      figma.notify(`Resized to ${width}×${height}.`);
      void pushPreview();
      break;
    }

    case "apply-image-adjustments": {
      const { brightness, contrast, saturation, opacity, backgroundPreset } = msg as unknown as { brightness: number; contrast: number; saturation: number; opacity?: number; backgroundPreset?: string };
      const sel = figma.currentPage.selection.filter((n): n is SceneNode & MinimalFillsMixin => "fills" in n);
      for (const node of sel) {
        if ("opacity" in node && typeof opacity === "number") {
          node.opacity = opacity / 100;
        }

        const fills = node.fills;
        if (fills === figma.mixed || !Array.isArray(fills)) continue;
        const imgFill = fills.find(f => f.type === "IMAGE") as ImagePaint | undefined;
        if (!imgFill) continue;

        const updatedImgFill = {
          ...imgFill,
          filters: {
            exposure: (brightness - 50) / 50, // Map 0-100 to -1.0 to 1.0 (exposure)
            contrast: (contrast - 50) / 50,  // Map 0-100 to -1.0 to 1.0
            saturation: (saturation - 50) / 50, // Map 0-100 to -1.0 to 1.0
            temperature: 0,
            tint: 0,
            highlights: 0,
            shadows: 0
          }
        };

        if (backgroundPreset) {
          if (backgroundPreset === "transparent") {
            node.fills = [updatedImgFill];
          } else if (backgroundPreset === "white") {
            node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, updatedImgFill];
          } else if (backgroundPreset === "sand") {
            node.fills = [{ type: "SOLID", color: { r: 245/255, g: 230/255, b: 211/255 } }, updatedImgFill];
          } else if (backgroundPreset === "gradient") {
            node.fills = [
              {
                type: "GRADIENT_LINEAR",
                gradientTransform: [[0, 1, 0], [-1, 0, 1]],
                gradientStops: [
                  { position: 0, color: { r: 108/255, g: 71/255, b: 255/255, a: 1 } },
                  { position: 1, color: { r: 236/255, g: 72/255, b: 153/255, a: 1 } }
                ]
              },
              updatedImgFill
            ];
          } else if (backgroundPreset === "steel") {
            node.fills = [{ type: "SOLID", color: { r: 156/255, g: 163/255, b: 175/255 } }, updatedImgFill];
          } else if (backgroundPreset === "shadow") {
            node.fills = [updatedImgFill];
            if ("effects" in node) {
              (node as any).effects = [
                {
                  type: "DROP_SHADOW",
                  color: { r: 0, g: 0, b: 0, a: 0.15 },
                  offset: { x: 0, y: 6 },
                  radius: 14,
                  visible: true,
                  blendMode: "NORMAL"
                }
              ];
            }
          }
        } else {
          node.fills = fills.map(f => f.type === "IMAGE" ? updatedImgFill : f);
        }
      }
      figma.notify("Adjustments applied.");
      void pushPreview();
      break;
    }

    case "list-selection": {
      const sel = figma.currentPage.selection.filter(isExportable);
      figma.ui.postMessage({ type: "list-selection-result", payload: sel.map(n => ({ id: n.id, name: n.name })) });
      break;
    }

    case "export-node-by-id": {
      const { requestId, nodeId } = msg as unknown as { requestId: string; nodeId: string };
      const node = figma.getNodeById(nodeId);
      if (!node || !isExportable(node as SceneNode)) {
        figma.ui.postMessage({ type: "export-node-result", payload: { requestId, error: "Layer not found." } }); break;
      }
      try {
        const bytes = await (node as SceneNode & ExportMixin).exportAsync({ format: "PNG" });
        figma.ui.postMessage({ type: "export-node-result", payload: { requestId, bytes } });
      } catch (e) { figma.ui.postMessage({ type: "export-node-result", payload: { requestId, error: e instanceof Error ? e.message : "Failed." } }); }
      break;
    }

    case "open-external": figma.openExternal(msg.payload as string); break;
    case "notify": figma.notify(msg.payload as string); break;
    case "close-plugin": figma.closePlugin(); break;
  }
};
