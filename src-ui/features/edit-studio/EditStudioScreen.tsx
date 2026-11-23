import { useState, useCallback, useRef, type ChangeEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection, addToast, openModal } from "../../app/slices/uiSlice";
import { setEditingImage } from "../../app/slices/figmaSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import { EditHeader } from "./components/EditHeader";
import { EditCanvas } from "./components/EditCanvas";
import { EditBottomTabs } from "./components/EditBottomTabs";
import { FreemiumBanner } from "./components/FreemiumBanner";
import { RefineTab } from "./tabs/RefineTab";
import { RemoveTab } from "./tabs/RemoveTab";
import { BackgroundTab } from "./tabs/BackgroundTab";
import { FiltersTab, getFilterCss } from "./tabs/FiltersTab";
import { ResizeTab } from "./tabs/ResizeTab";
import { useUndoRedo } from "./hooks/useUndoRedo";
import type {
  EditTab,
  RefineAdjustments,
  BackgroundConfig,
  FilterConfig,
  ResizeConfig,
  EditSnapshot,
  RemoveState,
} from "./types";
import "../../shared/styles/v2/edit-studio.css";

const DEFAULT_ADJUSTMENTS: RefineAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
};

const DEFAULT_BACKGROUND: BackgroundConfig = {
  kind: "color",
  color: "transparent",
  gradient: { angle: 135, start: "#ff7e5f", end: "#feb47b" },
  imageSrc: null,
};

const DEFAULT_FILTER: FilterConfig = {
  id: "original",
  strength: 100,
};

export function EditStudioScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();

  const status = useAppSelector((s) => s.status.data);
  const editingImage = useAppSelector((s) => s.figma.editingImage);
  const selection = useAppSelector((s) => s.figma.selection);

  const isFreePlan = status?.plan === "free";

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<EditTab>("refine");

  // Remove Tab State (Brush selection & removal)
  const [removeState, setRemoveState] = useState<RemoveState>({
    hasSelection: false,
    brushSize: 30,
  });

  const [selectionMaskDataUrl, setSelectionMaskDataUrl] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Hidden file input for upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial State Snapshot
  const initialWidth = editingImage?.width || 800;
  const initialHeight = editingImage?.height || 800;

  const initialResize: ResizeConfig = {
    width: initialWidth,
    height: initialHeight,
    originalWidth: initialWidth,
    originalHeight: initialHeight,
    lockAspect: true,
    preset: "original",
    format: "png",
  };

  const initialSnapshot: EditSnapshot = {
    adjustments: DEFAULT_ADJUSTMENTS,
    background: DEFAULT_BACKGROUND,
    filter: DEFAULT_FILTER,
    resize: initialResize,
    maskDataUrl: null,
  };

  // Dual-Stack Undo / Redo Hook
  const { current, setCurrent, pushSnapshot, undo, redo, canUndo, canRedo } =
    useUndoRedo(initialSnapshot);

  // Auto-fit: Update dimensions immediately when natural image size is resolved
  const handleDimensionsResolved = useCallback(
    (width: number, height: number) => {
      setCurrent((prev) => ({
        ...prev,
        resize: {
          ...prev.resize,
          width,
          height,
          originalWidth: width,
          originalHeight: height,
        },
      }));
    },
    [setCurrent]
  );

  // ── Nav Handlers ──
  const handleBack = () => {
    dispatch(setSection("features"));
  };

  const handleUpgradeClick = () => {
    dispatch(openModal({ kind: "plan_picker" }));
  };

  // ── Switch / Clear Image (returns cleanly to empty state) ──
  const handleChangeImage = () => {
    dispatch(setEditingImage(null));
    setSelectionMaskDataUrl(null);
    setRemoveState({
      hasSelection: false,
      brushSize: 30,
    });
  };

  // ── Canvas Snapshot Commit ──
  const handleCommitSnapshot = (updates: Partial<EditSnapshot>) => {
    if (!updates || typeof updates !== "object" || "nativeEvent" in updates || updates instanceof Event) {
      return;
    }
    pushSnapshot({
      ...current,
      ...updates,
    });
  };

  const handleSelectionMaskChange = (maskDataUrl: string | null) => {
    setSelectionMaskDataUrl(maskDataUrl);
    setRemoveState((prev) => ({
      ...prev,
      hasSelection: Boolean(maskDataUrl),
    }));
  };

  const handleClearSelection = () => {
    setSelectionMaskDataUrl(null);
    setRemoveState((prev) => ({
      ...prev,
      hasSelection: false,
    }));
  };

  // ── Execute Removal: Erases highlighted selection area ──
  const handleExecuteRemove = async () => {
    if (!selectionMaskDataUrl) return;

    const targetW = current.resize.width || 800;
    const targetH = current.resize.height || 800;
    const mergeCanvas = document.createElement("canvas");
    mergeCanvas.width = targetW;
    mergeCanvas.height = targetH;
    const ctx = mergeCanvas.getContext("2d");
    if (!ctx) return;

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    try {
      if (current.maskDataUrl) {
        const img1 = await loadImage(current.maskDataUrl);
        ctx.drawImage(img1, 0, 0, targetW, targetH);
      }
      const img2 = await loadImage(selectionMaskDataUrl);
      ctx.drawImage(img2, 0, 0, targetW, targetH);

      const newMask = mergeCanvas.toDataURL();
      pushSnapshot({
        ...current,
        maskDataUrl: newMask,
      });
    } catch (e) {
      console.error("Failed to merge erase mask", e);
    }

    setRemoveState((prev) => ({
      ...prev,
      hasSelection: false,
    }));
    setSelectionMaskDataUrl(null);
  };

  // ── Composite Offscreen Canvas for Download or Apply ──
  const renderCompositedCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!editingImage?.previewUrl) return null;

    const outCanvas = document.createElement("canvas");
    const targetW = current.resize.width || 800;
    const targetH = current.resize.height || 800;
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return null;

    // 1. Draw Background Layer onto outCanvas
    if (current.background.kind === "color" && current.background.color !== "transparent") {
      ctx.fillStyle = current.background.color;
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (current.background.kind === "gradient") {
      const rad = (current.background.gradient.angle * Math.PI) / 180;
      const cx = targetW / 2;
      const cy = targetH / 2;
      const len = Math.hypot(targetW, targetH) / 2;
      const x0 = cx - Math.cos(rad) * len;
      const y0 = cy - Math.sin(rad) * len;
      const x1 = cx + Math.cos(rad) * len;
      const y1 = cy + Math.sin(rad) * len;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, current.background.gradient.start);
      grad.addColorStop(1, current.background.gradient.end);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (current.background.kind === "image" && current.background.imageSrc) {
      await new Promise<void>((resolve) => {
        const bgImg = new Image();
        bgImg.crossOrigin = "anonymous";
        bgImg.src = current.background.imageSrc!;
        bgImg.onload = () => {
          const bgW = bgImg.naturalWidth;
          const bgH = bgImg.naturalHeight;
          const bgRatio = bgW / bgH;
          const targetRatio = targetW / targetH;
          let sx = 0,
            sy = 0,
            sw = bgW,
            sh = bgH;
          if (bgRatio > targetRatio) {
            sw = bgH * targetRatio;
            sx = (bgW - sw) / 2;
          } else {
            sh = bgW / targetRatio;
            sy = (bgH - sh) / 2;
          }
          ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, targetW, targetH);
          resolve();
        };
        bgImg.onerror = () => resolve();
      });
    }

    // 2. Offscreen Foreground Canvas (isolates erase mask to foreground only)
    const fgCanvas = document.createElement("canvas");
    fgCanvas.width = targetW;
    fgCanvas.height = targetH;
    const fgCtx = fgCanvas.getContext("2d");
    if (!fgCtx) return outCanvas;

    // Filter & Tone Adjustments
    const filterCss = getFilterCss(current.filter.id, current.filter.strength);
    const b = typeof current.adjustments?.brightness === "number" ? current.adjustments.brightness : 100;
    const c = typeof current.adjustments?.contrast === "number" ? current.adjustments.contrast : 100;
    const s = typeof current.adjustments?.saturation === "number" ? current.adjustments.saturation : 100;
    const o = typeof current.adjustments?.opacity === "number" ? current.adjustments.opacity : 100;

    const adjParts: string[] = [];
    if (b !== 100) adjParts.push(`brightness(${b}%)`);
    if (c !== 100) adjParts.push(`contrast(${c}%)`);
    if (s !== 100) adjParts.push(`saturate(${s}%)`);
    if (o !== 100) adjParts.push(`opacity(${o}%)`);
    const adjCss = adjParts.join(" ");

    const combinedFilter =
      adjCss && filterCss
        ? `${adjCss} ${filterCss}`
        : adjCss || filterCss || "none";
    fgCtx.filter = combinedFilter;

    // 3. Draw Foreground Image onto fgCanvas
    await new Promise<void>((resolve) => {
      const fgImg = new Image();
      fgImg.crossOrigin = "anonymous";
      fgImg.src = editingImage.previewUrl;
      fgImg.onload = () => {
        fgCtx.save();
        const origW = fgImg.naturalWidth;
        const origH = fgImg.naturalHeight;
        const origRatio = origW / origH;
        const targetRatio = targetW / targetH;
        let sx = 0,
          sy = 0,
          sw = origW,
          sh = origH;
        if (Math.abs(origRatio - targetRatio) > 0.01) {
          if (targetRatio > origRatio) {
            sh = origW / targetRatio;
            sy = (origH - sh) / 2;
          } else {
            sw = origH * targetRatio;
            sx = (origW - sw) / 2;
          }
        }
        fgCtx.drawImage(fgImg, sx, sy, sw, sh, 0, 0, targetW, targetH);
        fgCtx.restore();
        resolve();
      };
      fgImg.onerror = () => resolve();
    });

    // 4. Draw Erase Mask on fgCanvas ONLY (erases foreground subject, NOT background)
    if (current.maskDataUrl) {
      await new Promise<void>((resolve) => {
        const maskImg = new Image();
        maskImg.src = current.maskDataUrl!;
        maskImg.onload = () => {
          fgCtx.save();
          fgCtx.globalCompositeOperation = "destination-out";
          const origW = maskImg.naturalWidth;
          const origH = maskImg.naturalHeight;
          const origRatio = origW / origH;
          const targetRatio = targetW / targetH;
          let sx = 0,
            sy = 0,
            sw = origW,
            sh = origH;
          if (Math.abs(origRatio - targetRatio) > 0.01) {
            if (targetRatio > origRatio) {
              sh = origW / targetRatio;
              sy = (origH - sh) / 2;
            } else {
              sw = origH * targetRatio;
              sx = (origW - sw) / 2;
            }
          }
          fgCtx.drawImage(maskImg, sx, sy, sw, sh, 0, 0, targetW, targetH);
          fgCtx.restore();
          resolve();
        };
        maskImg.onerror = () => resolve();
      });
    }

    // 5. Draw Foreground Layer on top of Background Layer on outCanvas
    ctx.drawImage(fgCanvas, 0, 0, targetW, targetH);

    return outCanvas;
  }, [editingImage, current]);

  // ── Download Handler ──
  const handleDownload = async () => {
    const canvas = await renderCompositedCanvas();
    if (!canvas) {
      dispatch(
        addToast({
          id: `toast_dl_none_${Date.now()}`,
          kind: "warning",
          title: "No image",
          message: "Please load an image before downloading.",
        })
      );
      return;
    }

    const format = current.resize.format;
    const mime =
      format === "webp" ? "image/webp" : format === "jpg" ? "image/jpeg" : "image/png";

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const baseName = editingImage?.name?.replace(/\.[^/.]+$/, "") || "cutout-edited";
        a.download = `${baseName}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        dispatch(
          addToast({
            id: `toast_dl_success_${Date.now()}`,
            kind: "success",
            title: "Download complete",
            message: `Saved ${baseName}.${format}`,
          })
        );
      },
      mime,
      0.95
    );
  };

  // ── Apply to Figma Canvas Handler ──
  const handleApply = async () => {
    const canvas = await renderCompositedCanvas();
    if (!canvas) return;

    setIsApplying(true);
    try {
      const format = current.resize.format === "jpg" ? "image/jpeg" : "image/png";

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsApplying(false);
            return;
          }
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);

          bridge.insertResultImage(bytes);

          setIsApplying(false);
          dispatch(
            addToast({
              id: `toast_applied_${Date.now()}`,
              kind: "success",
              title: "Inserted to Figma",
              message: "Your edited asset was added to the canvas.",
            })
          );
        },
        format,
        0.95
      );
    } catch (err) {
      console.error("Apply failed", err);
      setIsApplying(false);
      dispatch(
        addToast({
          id: `toast_apply_err_${Date.now()}`,
          kind: "error",
          title: "Apply failed",
          message: "Could not insert image to canvas.",
        })
      );
    }
  };

  // ── Canvas Insertion Handler ──
  const handleInsertFromCanvas = async () => {
    if (!selection.hasSelection || !selection.id) {
      dispatch(
        addToast({
          id: `toast_sel_warn_${Date.now()}`,
          kind: "warning",
          title: "No layer selected",
          message: "Select an image layer in Figma first.",
        })
      );
      return;
    }

    try {
      const bytes = await bridge.exportNode(selection.id);
      if (!bytes || bytes.length === 0) {
        throw new Error("No bytes returned from layer export");
      }

      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
      const previewUrl = URL.createObjectURL(blob);
      const layerName = selection.name || "Canvas Layer";
      const layerW = selection.width || 800;
      const layerH = selection.height || 800;

      dispatch(
        setEditingImage({
          id: `canvas_${selection.id}_${Date.now()}`,
          name: layerName,
          previewUrl,
          width: layerW,
          height: layerH,
          bytes,
        })
      );

      dispatch(
        addToast({
          id: `toast_sel_load_${Date.now()}`,
          kind: "success",
          title: "Layer loaded",
          message: `Editing "${layerName}"`,
        })
      );
    } catch (err) {
      console.error("Failed to load canvas selection", err);
      dispatch(
        addToast({
          id: `toast_err_export_${Date.now()}`,
          kind: "error",
          title: "Export failed",
          message: "Could not export selected layer from canvas.",
        })
      );
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      dispatch(
        setEditingImage({
          id: `upload_${Date.now()}`,
          name: file.name,
          previewUrl: url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      );
    };
  };

  const showFreemiumBanner =
    isFreePlan && (activeTab === "background" || activeTab === "resize");

  return (
    <div className="edit-studio-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {/* Top Header */}
      <EditHeader
        canUndo={canUndo}
        canRedo={canRedo}
        isApplying={isApplying}
        onBack={handleBack}
        onUndo={undo}
        onRedo={redo}
        onDownload={handleDownload}
        onApply={handleApply}
      />

      {/* Main Canvas Viewport */}
      <main className="edit-studio-main">
        <EditCanvas
          previewUrl={editingImage?.previewUrl || null}
          imageDimensions={{
            width: current.resize.originalWidth || editingImage?.width || 800,
            height: current.resize.originalHeight || editingImage?.height || 800,
          }}
          activeTab={activeTab}
          adjustments={current.adjustments}
          background={current.background}
          filter={current.filter}
          resize={current.resize}
          maskDataUrl={current.maskDataUrl}
          removeState={removeState}
          selectionMaskDataUrl={selectionMaskDataUrl}
          onDimensionsResolved={handleDimensionsResolved}
          onSelectionMaskChange={handleSelectionMaskChange}
          onChangeImage={handleChangeImage}
          onInsertFromCanvas={handleInsertFromCanvas}
          onUploadFile={handleUploadClick}
        />
      </main>

      {/* Bottom Tool Configuration Drawer */}
      <div className="edit-studio-bottom-panel-container">
        {activeTab === "refine" && (
          <RefineTab
            adjustments={current.adjustments}
            onChange={(adj) => setCurrent((prev) => ({ ...prev, adjustments: adj }))}
            onCommit={(adj) => {
              const safe = adj && !("nativeEvent" in adj) ? adj : current.adjustments;
              handleCommitSnapshot({ adjustments: safe });
            }}
          />
        )}

        {activeTab === "remove" && (
          <RemoveTab
            state={removeState}
            onStateChange={setRemoveState}
            onClearSelection={handleClearSelection}
            onExecuteRemove={handleExecuteRemove}
          />
        )}

        {activeTab === "background" && (
          <BackgroundTab
            background={current.background}
            onChange={(bg) => setCurrent((prev) => ({ ...prev, background: bg }))}
            onCommit={(bg) => {
              const safe = bg && !("nativeEvent" in bg) ? bg : current.background;
              handleCommitSnapshot({ background: safe });
            }}
          />
        )}

        {activeTab === "filters" && (
          <FiltersTab
            filter={current.filter}
            previewUrl={editingImage?.previewUrl || null}
            onChange={(flt) => setCurrent((prev) => ({ ...prev, filter: flt }))}
            onCommit={(flt) => {
              const safe = flt && !("nativeEvent" in flt) ? flt : current.filter;
              handleCommitSnapshot({ filter: safe });
            }}
          />
        )}

        {activeTab === "resize" && (
          <ResizeTab
            resize={current.resize}
            onChange={(res) => setCurrent((prev) => ({ ...prev, resize: res }))}
            onCommit={(res) => {
              const safe = res && !("nativeEvent" in res) ? res : current.resize;
              handleCommitSnapshot({ resize: safe });
            }}
          />
        )}

        {/* Freemium Banner */}
        {showFreemiumBanner && <FreemiumBanner onUpgradeClick={handleUpgradeClick} />}
      </div>

      {/* Bottom Tab Bar */}
      <footer className="edit-studio-footer">
        <EditBottomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isFreePlan={isFreePlan}
        />
      </footer>
    </div>
  );
}
