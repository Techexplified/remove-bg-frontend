import React, { useRef, useEffect, useState, useCallback } from "react";
import { Plus, Minus, Upload, Image as ImageIcon, X } from "lucide-react";
import type {
  RefineAdjustments,
  BackgroundConfig,
  FilterConfig,
  ResizeConfig,
  EditTab,
  RemoveState,
} from "../types";
import { getFilterCss } from "../tabs/FiltersTab";

interface Props {
  previewUrl: string | null;
  imageDimensions: { width: number; height: number };
  activeTab: EditTab;
  adjustments: RefineAdjustments;
  background: BackgroundConfig;
  filter: FilterConfig;
  resize: ResizeConfig;
  maskDataUrl?: string | null;
  removeState: RemoveState;
  selectionMaskDataUrl?: string | null;
  onDimensionsResolved: (width: number, height: number) => void;
  onSelectionMaskChange: (maskDataUrl: string | null) => void;
  onChangeImage: () => void;
  onInsertFromCanvas?: () => void;
  onUploadFile?: () => void;
}

export function EditCanvas({
  previewUrl,
  imageDimensions,
  activeTab,
  adjustments,
  background,
  filter,
  resize,
  maskDataUrl,
  removeState,
  selectionMaskDataUrl,
  onDimensionsResolved,
  onSelectionMaskChange,
  onChangeImage,
  onInsertFromCanvas,
  onUploadFile,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState<number>(100);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const maskImageRef = useRef<HTMLImageElement | null>(null);

  // Load source foreground image and resolve natural dimensions immediately
  useEffect(() => {
    if (!previewUrl) {
      sourceImageRef.current = null;
      maskImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = previewUrl;
    img.onload = () => {
      sourceImageRef.current = img;
      onDimensionsResolved(img.naturalWidth, img.naturalHeight);
      renderCanvas();
    };
  }, [previewUrl, onDimensionsResolved]);

  // Synchronize mask image ref when maskDataUrl is cleared
  useEffect(() => {
    if (!maskDataUrl) {
      maskImageRef.current = null;
    }
  }, [maskDataUrl]);

  // Render canvas composite
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImageRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = sourceImageRef.current;
    const w = imageDimensions.width || img.naturalWidth || 800;
    const h = imageDimensions.height || img.naturalHeight || 800;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Background Layer
    if (background.kind === "color" && background.color !== "transparent") {
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, w, h);
    } else if (background.kind === "gradient") {
      const rad = (background.gradient.angle * Math.PI) / 180;
      const cx = w / 2;
      const cy = h / 2;
      const len = Math.hypot(w, h) / 2;
      const x0 = cx - Math.cos(rad) * len;
      const y0 = cy - Math.sin(rad) * len;
      const x1 = cx + Math.cos(rad) * len;
      const y1 = cy + Math.sin(rad) * len;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, background.gradient.start);
      grad.addColorStop(1, background.gradient.end);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (background.kind === "image" && bgImageRef.current) {
      const bgImg = bgImageRef.current;
      const bgW = bgImg.naturalWidth;
      const bgH = bgImg.naturalHeight;
      const bgRatio = bgW / bgH;
      const canvasRatio = w / h;
      let sx = 0,
        sy = 0,
        sw = bgW,
        sh = bgH;
      if (bgRatio > canvasRatio) {
        sw = bgH * canvasRatio;
        sx = (bgW - sw) / 2;
      } else {
        sh = bgW / canvasRatio;
        sy = (bgH - sh) / 2;
      }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, w, h);
    }

    // 2. Compute Filter String
    const filterCss = getFilterCss(filter.id, filter.strength);
    const b = typeof adjustments?.brightness === "number" ? adjustments.brightness : 100;
    const c = typeof adjustments?.contrast === "number" ? adjustments.contrast : 100;
    const s = typeof adjustments?.saturation === "number" ? adjustments.saturation : 100;
    const o = typeof adjustments?.opacity === "number" ? adjustments.opacity : 100;

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

    // 2. Offscreen Foreground Canvas (isolates erase mask to foreground only)
    const fgCanvas = document.createElement("canvas");
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext("2d");
    if (!fgCtx) return;

    // 2a. Draw Foreground Image with Tone Adjustments & Filter
    fgCtx.save();
    fgCtx.filter = combinedFilter;
    fgCtx.drawImage(img, 0, 0, w, h);
    fgCtx.restore();

    // 2b. Apply Erase Mask to Foreground ONLY (erases subject pixels, NOT the background)
    if (maskDataUrl) {
      if (maskImageRef.current && maskImageRef.current.src === maskDataUrl) {
        fgCtx.save();
        fgCtx.globalCompositeOperation = "destination-out";
        fgCtx.drawImage(maskImageRef.current, 0, 0, w, h);
        fgCtx.restore();
        ctx.drawImage(fgCanvas, 0, 0, w, h);
      } else {
        const maskImg = new Image();
        maskImg.onload = () => {
          maskImageRef.current = maskImg;
          renderCanvas();
        };
        maskImg.src = maskDataUrl;
        ctx.drawImage(fgCanvas, 0, 0, w, h);
      }
    } else {
      ctx.drawImage(fgCanvas, 0, 0, w, h);
    }
  }, [imageDimensions, background, filter, adjustments, maskDataUrl]);

  // Load custom backdrop image when background.kind === "image"
  useEffect(() => {
    if (background.kind !== "image" || !background.imageSrc) {
      bgImageRef.current = null;
      renderCanvas();
      return;
    }
    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.onload = () => {
      bgImageRef.current = bgImg;
      renderCanvas();
    };
    bgImg.src = background.imageSrc;
  }, [background.kind, background.imageSrc, renderCanvas]);

  const renderCanvasRef = useRef(renderCanvas);
  renderCanvasRef.current = renderCanvas;

  useEffect(() => {
    let rafId: number;
    let scheduled = false;

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      rafId = requestAnimationFrame(() => {
        scheduled = false;
        renderCanvasRef.current();
      });
    };

    schedule();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [imageDimensions, background, filter, adjustments, maskDataUrl]);

  // Synchronize selection canvas dimensions
  useEffect(() => {
    const selCanvas = selectionCanvasRef.current;
    if (!selCanvas) return;
    const w = imageDimensions.width || 800;
    const h = imageDimensions.height || 800;
    if (selCanvas.width !== w || selCanvas.height !== h) {
      selCanvas.width = w;
      selCanvas.height = h;
    }
    const ctx = selCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    if (selectionMaskDataUrl) {
      const img = new Image();
      img.src = selectionMaskDataUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
      };
    }
  }, [imageDimensions, selectionMaskDataUrl]);

  // Brush is active ONLY when in Magic Brush tab
  const isRemoveBrushActive = activeTab === "magic_brush";

  const updateCursorPos = (e: React.MouseEvent) => {
    if (!isRemoveBrushActive) return;
    const container = containerRef.current;
    if (container) {
      const cRect = container.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - cRect.left,
        y: e.clientY - cRect.top,
      });
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = selectionCanvasRef.current || canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRemoveBrushActive) return;
    updateCursorPos(e);
    setIsDrawing(true);
    drawSelectionStroke(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCursorPos(e);
    if (!isDrawing || !isRemoveBrushActive) return;
    drawSelectionStroke(e);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const selCanvas = selectionCanvasRef.current;
    if (selCanvas) {
      onSelectionMaskChange(selCanvas.toDataURL());
    }
  };

  const drawSelectionStroke = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const selCanvas = selectionCanvasRef.current;
    if (!selCanvas) return;
    const ctx = selCanvas.getContext("2d");
    if (!ctx) return;

    // Scale brush size by canvas-to-viewport ratio so painted stroke matches the cursor circle identically
    const rect = selCanvas.getBoundingClientRect();
    const scaleX = selCanvas.width / rect.width;
    const canvasRadius = removeState.brushSize * scaleX;

    ctx.save();
    ctx.fillStyle = "rgba(244, 63, 94, 0.45)"; // Translucent coral/pink highlight
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, canvasRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handleZoomIn = () => setZoom((z) => Math.min(250, z + 25));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));

  // ── Empty State: Clean single-surface layout (NO double background) ──
  if (!previewUrl) {
    return (
      <div className="edit-studio-canvas-container empty">
        <div className="edit-studio-empty-dropzone">
          <div className="edit-studio-empty-icon">
            <ImageIcon size={30} strokeWidth={1.6} />
          </div>
          <h3 className="edit-studio-empty-title">Select an image to edit</h3>
          <p className="edit-studio-empty-sub">
            Pick an image from your canvas, or upload from your computer.
          </p>
          <div className="edit-studio-empty-actions">
            {onInsertFromCanvas && (
              <button
                type="button"
                className="edit-studio-canvas-insert-btn"
                onClick={onInsertFromCanvas}
              >
                <Plus size={14} />
                <span>Insert from canvas</span>
              </button>
            )}
            {onUploadFile && (
              <button
                type="button"
                className="edit-studio-canvas-upload-btn"
                onClick={onUploadFile}
              >
                <Upload size={14} />
                <span>Upload</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate natural aspect ratio for proper responsive fit
  const imgW = imageDimensions.width || 800;
  const imgH = imageDimensions.height || 800;

  return (
    <div
      ref={containerRef}
      className={`edit-studio-canvas-container ${isRemoveBrushActive ? "brush-mode" : ""}`}
      onMouseMove={updateCursorPos}
      onMouseLeave={() => {
        setIsDrawing(false);
        setCursorPos(null);
      }}
    >
      {/* Floating Change Image Button (Top Right of image/canvas) */}
      <button
        type="button"
        className="edit-studio-change-image-btn"
        onClick={onChangeImage}
        title="Change image (return to empty state)"
      >
        <X size={14} strokeWidth={2.4} />
      </button>

      {/* Interactive Responsive Canvas Viewport (Auto-fit without manual click) */}
      <div
        className="edit-studio-canvas-viewport checkerboard"
        style={{
          transform: `scale(${zoom / 100})`,
          aspectRatio: `${imgW} / ${imgH}`,
        }}
      >
        <canvas ref={canvasRef} className="edit-studio-main-canvas" />

        {/* Translucent Selection Highlight Canvas for Remove Tab */}
        <canvas
          ref={selectionCanvasRef}
          className="edit-studio-selection-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* Dashed crop frame when on Resize tab */}
        {activeTab === "resize" && (() => {
          const origW = imageDimensions.width || 800;
          const origH = imageDimensions.height || 800;
          const targetW = resize.width || origW;
          const targetH = resize.height || origH;
          const origRatio = origW / origH;
          const targetRatio = targetW / targetH;

          let cropStyle: React.CSSProperties = {
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          };

          if (resize.preset !== "original" && Math.abs(origRatio - targetRatio) > 0.01) {
            if (targetRatio > origRatio) {
              const heightPct = (origRatio / targetRatio) * 100;
              const topPct = (100 - heightPct) / 2;
              cropStyle = {
                top: `${topPct}%`,
                left: 0,
                width: "100%",
                height: `${heightPct}%`,
              };
            } else {
              const widthPct = (targetRatio / origRatio) * 100;
              const leftPct = (100 - widthPct) / 2;
              cropStyle = {
                top: 0,
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                height: "100%",
              };
            }
          }

          return (
            <div className="edit-studio-resize-crop-frame" style={cropStyle}>
              <span className="edit-studio-crop-dim-badge">
                {targetW} × {targetH}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Floating Brush Cursor Overlay when in Remove Tab */}
      {isRemoveBrushActive && cursorPos && (
        <div
          className="edit-studio-brush-cursor"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: removeState.brushSize * 2,
            height: removeState.brushSize * 2,
          }}
        />
      )}

      {/* Floating Zoom Controls (Bottom Right of Canvas) */}
      <div className="edit-studio-floating-zoom">
        <button
          type="button"
          className="edit-studio-zoom-btn"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <Minus size={12} strokeWidth={2.4} />
        </button>
        <span className="edit-studio-zoom-text">{zoom}%</span>
        <button
          type="button"
          className="edit-studio-zoom-btn"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <Plus size={12} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
