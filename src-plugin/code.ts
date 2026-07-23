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

figma.ui.onmessage = async (msg: { type: string;[k: string]: unknown }) => {
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
        rect.name = "ZeroBG result";
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
      const { brightness, contrast, saturation, opacity, backgroundPreset, imageFilterPreset } = msg as unknown as {
        brightness: number; contrast: number; saturation: number;
        opacity?: number; backgroundPreset?: string; imageFilterPreset?: string;
      };
      const sel = figma.currentPage.selection.filter((n): n is SceneNode & MinimalFillsMixin => "fills" in n);
      for (const node of sel) {
        if ("opacity" in node && typeof opacity === "number") {
          node.opacity = opacity / 100;
        }

        const fills = node.fills;
        if (fills === figma.mixed || !Array.isArray(fills)) continue;
        const imgFill = fills.find(f => f.type === "IMAGE") as ImagePaint | undefined;
        if (!imgFill) continue;

        // Base filters from sliders (0-100 → -1 to 1)
        const baseFilters = {
          exposure: (brightness - 50) / 50,
          contrast: (contrast - 50) / 50,
          saturation: (saturation - 50) / 50,
          temperature: 0,
          tint: 0,
          highlights: 0,
          shadows: 0,
        };

        // Named image filter overrides — applied on top of slider values
        const filterOverrides: Partial<typeof baseFilters> = {};
        if (imageFilterPreset && imageFilterPreset !== "normal") {
          switch (imageFilterPreset) {
            case "grayscale": filterOverrides.saturation = -1; break;
            case "sepia": filterOverrides.saturation = -0.5; filterOverrides.temperature = 0.4; filterOverrides.tint = 0.1; break;
            case "vivid": filterOverrides.saturation = 0.6; filterOverrides.contrast = 0.15; filterOverrides.highlights = 0.1; break;
            case "cool": filterOverrides.temperature = -0.5; filterOverrides.shadows = 0.1; break;
            case "warm": filterOverrides.temperature = 0.35; filterOverrides.tint = 0.1; break;
            case "fade": filterOverrides.saturation = -0.2; filterOverrides.contrast = -0.2; filterOverrides.exposure = 0.1; filterOverrides.highlights = 0.2; break;
            case "matte": filterOverrides.saturation = -0.2; filterOverrides.contrast = -0.15; filterOverrides.exposure = 0.05; filterOverrides.shadows = 0.15; break;
            case "dramatic": filterOverrides.contrast = 0.4; filterOverrides.saturation = 0.2; filterOverrides.exposure = -0.1; break;
            case "retro": filterOverrides.saturation = -0.3; filterOverrides.temperature = 0.2; filterOverrides.tint = 0.05; filterOverrides.contrast = 0.1; break;
          }
        }

        const updatedImgFill = {
          ...imgFill,
          filters: { ...baseFilters, ...filterOverrides },
        };

        if (backgroundPreset) {
          if (backgroundPreset === "transparent") {
            node.fills = [updatedImgFill];
          } else if (backgroundPreset === "white") {
            node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, updatedImgFill];
          } else if (backgroundPreset === "sand") {
            node.fills = [{ type: "SOLID", color: { r: 245 / 255, g: 230 / 255, b: 211 / 255 } }, updatedImgFill];
          } else if (backgroundPreset === "gradient") {
            // gradientTransform for 180deg (top → bottom): [[1,0,0],[0,1,0]]
            // This matches the CSS linear-gradient(180deg, …) used in the preview.
            node.fills = [
              {
                type: "GRADIENT_LINEAR",
                gradientTransform: [[1, 0, 0], [0, 1, 0]],
                gradientStops: [
                  { position: 0, color: { r: 108 / 255, g: 71 / 255, b: 255 / 255, a: 1 } },
                  { position: 1, color: { r: 236 / 255, g: 72 / 255, b: 153 / 255, a: 1 } }
                ]
              },
              updatedImgFill
            ];
          } else if (backgroundPreset === "steel") {
            // Match CSS #9ca3af (steel grey)
            node.fills = [{ type: "SOLID", color: { r: 156 / 255, g: 163 / 255, b: 175 / 255 } }, updatedImgFill];
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
          } else if (backgroundPreset === "wood") {
            node.fills = [{ type: "SOLID", color: { r: 139 / 255, g: 90 / 255, b: 43 / 255 } }, updatedImgFill];
          } else if (backgroundPreset === "sky") {
            node.fills = [{ type: "SOLID", color: { r: 135 / 255, g: 206 / 255, b: 235 / 255 } }, updatedImgFill];
          } else if (backgroundPreset === "lavender") {
            node.fills = [{ type: "SOLID", color: { r: 230 / 255, g: 230 / 255, b: 250 / 255 } }, updatedImgFill];
          } else if (backgroundPreset === "mint") {
            // Match CSS #bdfcc9
            node.fills = [{ type: "SOLID", color: { r: 189 / 255, g: 252 / 255, b: 201 / 255 } }, updatedImgFill];
          } else if (backgroundPreset.startsWith("#")) {
            const r = parseInt(backgroundPreset.substring(1, 3), 16) / 255;
            const g = parseInt(backgroundPreset.substring(3, 5), 16) / 255;
            const b = parseInt(backgroundPreset.substring(5, 7), 16) / 255;
            node.fills = [{ type: "SOLID", color: { r, g, b } }, updatedImgFill];
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
