figma.showUI(__html__, { width: 400, height: 700, themeColors: false });

let cachedUserId: string | null = null;
let cachedDisplayName: string = "Figma User";
let cachedPlanStatus: unknown = null;

// Initialize persistent status storage in background
void (async () => {
  try {
    cachedPlanStatus = await figma.clientStorage.getAsync("removebg_plan_status");
    if (cachedPlanStatus) {
      figma.ui.postMessage({ type: "cached-plan-status", payload: cachedPlanStatus });
    }
  } catch {}
})();

// Send user identity to UI immediately and on retry requests
async function sendUserIdentity() {
  if (cachedUserId) {
    figma.ui.postMessage({
      type: "figma-user-id",
      payload: cachedUserId,
      displayName: cachedDisplayName,
      cachedStatus: cachedPlanStatus
    });
    return;
  }

  let userId = figma.currentUser?.id ?? null;
  const displayName = figma.currentUser?.name ?? "Figma User";

  if (!userId) {
    try {
      userId = await figma.clientStorage.getAsync("removebg_user_id");
      if (!userId) {
        userId = `anon_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
        await figma.clientStorage.setAsync("removebg_user_id", userId);
      }
    } catch {
      userId = `anon_${Date.now().toString(36)}`;
    }
  }

  if (!cachedPlanStatus) {
    try {
      cachedPlanStatus = await figma.clientStorage.getAsync("removebg_plan_status");
    } catch {}
  }

  cachedUserId = userId;
  cachedDisplayName = displayName;

  figma.ui.postMessage({
    type: "figma-user-id",
    payload: userId,
    displayName,
    cachedStatus: cachedPlanStatus
  });
}

void sendUserIdentity();

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

let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function broadcastSelection() {
  figma.ui.postMessage({ type: "selection-changed", payload: getSelectionInfo() });
  if (previewDebounceTimer !== null) {
    clearTimeout(previewDebounceTimer);
  }
  previewDebounceTimer = setTimeout(() => {
    previewDebounceTimer = null;
    void pushPreview();
  }, 80);
}

broadcastSelection();
figma.on("selectionchange", broadcastSelection);

async function pushPreview() {
  const sel = figma.currentPage.selection.filter(isExportable);
  if (sel.length === 0) { figma.ui.postMessage({ type: "preview-update", payload: null }); return; }
  try {
    const node = sel[0];
    const savedFgHash = "getPluginData" in node ? node.getPluginData("removebg_fg_hash") : "";
    if (savedFgHash) {
      const img = figma.getImageByHash(savedFgHash);
      if (img) {
        const bytes = await img.getBytesAsync();
        figma.ui.postMessage({ type: "preview-update", payload: bytes });
        return;
      }
    }
    if ("fills" in node && Array.isArray(node.fills)) {
      const fgFill = [...node.fills].reverse().find(f => f.type === "IMAGE") as ImagePaint | undefined;
      if (fgFill?.imageHash) {
        const img = figma.getImageByHash(fgFill.imageHash);
        if (img) {
          const bytes = await img.getBytesAsync();
          figma.ui.postMessage({ type: "preview-update", payload: bytes });
          return;
        }
      }
    }
    // Constrain preview to max 500px for snappy transfer and rendering
    const maxDim = Math.max(sel[0].width, sel[0].height);
    const scale = maxDim > 500 ? 500 / maxDim : 1;
    const bytes = await sel[0].exportAsync({ format: "PNG", constraint: { type: "SCALE", value: scale } });
    figma.ui.postMessage({ type: "preview-update", payload: bytes });
  } catch { figma.ui.postMessage({ type: "preview-update", payload: null }); }
}

figma.ui.onmessage = async (msg: { type: string;[k: string]: unknown }) => {
  switch (msg.type) {
    case "request-selection": broadcastSelection(); break;
    case "request-preview": void pushPreview(); break;
    case "request-user-id": void sendUserIdentity(); break;

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
        rect.setPluginData("removebg_fg_hash", img.hash);
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
      const { brightness, contrast, saturation, opacity, backgroundPreset, imageFilterPreset, customBgBytes } = msg as unknown as {
        brightness: number; contrast: number; saturation: number;
        opacity?: number; backgroundPreset?: string; imageFilterPreset?: string;
        customBgBytes?: Uint8Array;
      };
      const sel = figma.currentPage.selection.filter((n): n is SceneNode & MinimalFillsMixin => "fills" in n);
      for (const node of sel) {
        if ("opacity" in node && typeof opacity === "number") {
          node.opacity = opacity / 100;
        }

        const fills = node.fills;
        if (fills === figma.mixed || !Array.isArray(fills)) continue;

        // Locate the foreground image fill (the cut-out subject)
        // Figma paints fills bottom-to-top, so the foreground subject is always on top.
        // We first check if the node has a stored 'removebg_fg_hash'.
        const savedFgHash = "getPluginData" in node ? node.getPluginData("removebg_fg_hash") : "";
        let fgFill: ImagePaint | undefined;
        if (savedFgHash) {
          fgFill = fills.find(f => f.type === "IMAGE" && (f as ImagePaint).imageHash === savedFgHash) as ImagePaint | undefined;
        }
        if (!fgFill) {
          // Fallback: topmost IMAGE fill in the fills array
          fgFill = [...fills].reverse().find(f => f.type === "IMAGE") as ImagePaint | undefined;
        }
        if (!fgFill) continue;

        // Save foreground image hash so we consistently identify the cutout subject
        if ("setPluginData" in node && fgFill.imageHash) {
          node.setPluginData("removebg_fg_hash", fgFill.imageHash);
        }

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

        const updatedFgFill: ImagePaint = {
          ...fgFill,
          filters: { ...baseFilters, ...filterOverrides },
        };

        if (backgroundPreset) {
          // Clear any drop-shadow effect if switching away from the shadow preset
          if (backgroundPreset !== "shadow" && "effects" in node && Array.isArray((node as any).effects)) {
            (node as any).effects = [];
          }

          if (backgroundPreset === "transparent") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [updatedFgFill];
          } else if (backgroundPreset === "custom-image") {
            if (customBgBytes) {
              const bgImg = figma.createImage(customBgBytes);
              if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", bgImg.hash);
              const bgFill: ImagePaint = { type: "IMAGE", imageHash: bgImg.hash, scaleMode: "FILL" };
              node.fills = [bgFill, updatedFgFill];
            } else {
              // Preserve existing background image on the layer
              const savedBgHash = "getPluginData" in node ? node.getPluginData("removebg_bg_hash") : "";
              let existingBgFill: ImagePaint | undefined;
              if (savedBgHash) {
                existingBgFill = fills.find(f => f.type === "IMAGE" && (f as ImagePaint).imageHash === savedBgHash) as ImagePaint | undefined;
              }
              if (!existingBgFill) {
                existingBgFill = fills.find(f => f.type === "IMAGE" && f !== fgFill) as ImagePaint | undefined;
              }
              if (existingBgFill) {
                node.fills = [existingBgFill, updatedFgFill];
              } else {
                node.fills = [updatedFgFill];
              }
            }
          } else if (backgroundPreset === "white") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, updatedFgFill];
          } else if (backgroundPreset === "sand") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [{ type: "SOLID", color: { r: 245 / 255, g: 230 / 255, b: 211 / 255 } }, updatedFgFill];
          } else if (backgroundPreset === "gradient") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
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
              updatedFgFill
            ];
          } else if (backgroundPreset === "steel") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [{ type: "SOLID", color: { r: 156 / 255, g: 163 / 255, b: 175 / 255 } }, updatedFgFill];
          } else if (backgroundPreset === "shadow") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [updatedFgFill];
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
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [{ type: "SOLID", color: { r: 139 / 255, g: 90 / 255, b: 43 / 255 } }, updatedFgFill];
          } else if (backgroundPreset === "sky") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [{ type: "SOLID", color: { r: 135 / 255, g: 206 / 255, b: 235 / 255 } }, updatedFgFill];
          } else if (backgroundPreset === "lavender") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [{ type: "SOLID", color: { r: 230 / 255, g: 230 / 255, b: 250 / 255 } }, updatedFgFill];
          } else if (backgroundPreset === "mint") {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            node.fills = [{ type: "SOLID", color: { r: 189 / 255, g: 252 / 255, b: 201 / 255 } }, updatedFgFill];
          } else if (backgroundPreset.startsWith("#")) {
            if ("setPluginData" in node) node.setPluginData("removebg_bg_hash", "");
            const r = parseInt(backgroundPreset.substring(1, 3), 16) / 255;
            const g = parseInt(backgroundPreset.substring(3, 5), 16) / 255;
            const b = parseInt(backgroundPreset.substring(5, 7), 16) / 255;
            node.fills = [{ type: "SOLID", color: { r, g, b } }, updatedFgFill];
          }
        } else {
          // If no backgroundPreset was specified, keep all existing non-foreground fills intact
          const bgFills = fills.filter(f => f !== fgFill);
          node.fills = [...bgFills, updatedFgFill];
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

    case "persist-plan-status": {
      cachedPlanStatus = msg.payload;
      try {
        void figma.clientStorage.setAsync("removebg_plan_status", msg.payload);
      } catch {}
      break;
    }

    case "open-external": figma.openExternal(msg.payload as string); break;
    case "notify": figma.notify(msg.payload as string); break;
    case "close-plugin": figma.closePlugin(); break;
  }
};
