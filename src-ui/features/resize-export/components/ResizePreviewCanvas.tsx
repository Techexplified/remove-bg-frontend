import { useState } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { ResizeFullscreenModal } from "./ResizeFullscreenModal";
import type { WatermarkSettings, ResizeFitMode } from "../types";

interface Props {
  previewUrl: string | null;
  targetWidth: number;
  targetHeight: number;
  originalWidth: number;
  originalHeight: number;
  watermark: WatermarkSettings;
  fitMode: ResizeFitMode;
  onChangeFitMode: (mode: ResizeFitMode) => void;
}

export function ResizePreviewCanvas({
  previewUrl,
  targetWidth,
  targetHeight,
  originalWidth,
  originalHeight,
  watermark,
  fitMode,
  onChangeFitMode,
}: Props) {
  const [activeView, setActiveView] = useState<"original" | "resized">("resized");
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(250, prev + 25));
  const handleZoomOut = () => setZoom((prev) => Math.max(50, prev - 25));
  const handleResetZoom = () => setZoom(100);

  const displayWidth = activeView === "resized" ? targetWidth : originalWidth;
  const displayHeight = activeView === "resized" ? targetHeight : originalHeight;
  const aspectRatio = targetWidth > 0 && targetHeight > 0 ? targetWidth / targetHeight : 1;

  return (
    <div className="re-preview-container">
      {/* ── Top Header Bar ── */}
      <div className="re-preview-header">
        <span className="re-preview-title">Preview</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {activeView === "resized" && (
            <div className="re-view-toggle">
              <button
                type="button"
                className={`re-view-btn ${fitMode === "cover" ? "active" : ""}`}
                onClick={() => onChangeFitMode("cover")}
                title="Fill & crop to target frame"
              >
                Fill
              </button>
              <button
                type="button"
                className={`re-view-btn ${fitMode === "contain" ? "active" : ""}`}
                onClick={() => onChangeFitMode("contain")}
                title="Fit full image with margins"
              >
                Fit
              </button>
            </div>
          )}

          <div className="re-view-toggle">
            <button
              type="button"
              className={`re-view-btn ${activeView === "original" ? "active" : ""}`}
              onClick={() => setActiveView("original")}
            >
              Original
            </button>
            <button
              type="button"
              className={`re-view-btn ${activeView === "resized" ? "active" : ""}`}
              onClick={() => setActiveView("resized")}
            >
              Resized
            </button>
          </div>
        </div>
      </div>

      {/* ── Canvas Viewport ── */}
      <div className="re-canvas-viewport">
        <div
          className="re-canvas-aspect-box"
          style={{
            aspectRatio: activeView === "resized" ? `${aspectRatio}` : undefined,
            transform: `scale(${zoom / 100})`,
          }}
        >
          {previewUrl ? (
            <div className="re-canvas-content">
              <img
                src={previewUrl}
                alt="Preview"
                className="re-canvas-img"
                style={{
                  objectFit: activeView === "resized" ? fitMode : "contain",
                }}
                crossOrigin="anonymous"
                draggable={false}
              />

              {/* Live Watermark Overlay */}
              {watermark.enabled && watermark.text && (
                <div
                  className={`re-watermark-overlay ${watermark.position}`}
                  style={{ opacity: watermark.opacity / 100 }}
                >
                  {watermark.position === "diagonal" ? (
                    <div className="re-watermark-grid">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span key={i} className="re-watermark-diagonal-text">
                          {watermark.text}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="re-watermark-corner-text">{watermark.text}</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="re-canvas-placeholder">
              <span>Select an image to preview</span>
            </div>
          )}

          {/* Dimension Tag Badge */}
          <div className="re-dim-badge">
            {displayWidth} × {displayHeight}
          </div>
        </div>
      </div>

      {/* ── Bottom Zoom Control Bar ── */}
      <div className="re-zoom-bar">
        <button
          type="button"
          className="re-zoom-btn"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut size={13} />
        </button>
        <span
          className="re-zoom-text"
          onClick={handleResetZoom}
          title="Reset zoom to 100%"
          style={{ cursor: "pointer" }}
        >
          {zoom}%
        </span>
        <button
          type="button"
          className="re-zoom-btn"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          className="re-zoom-btn"
          onClick={() => setIsFullscreen(true)}
          title="Full Screen Preview"
        >
          <Maximize size={13} />
        </button>
      </div>

      <ResizeFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        previewUrl={previewUrl}
        targetWidth={targetWidth}
        targetHeight={targetHeight}
        originalWidth={originalWidth}
        originalHeight={originalHeight}
        activeView={activeView}
        watermark={watermark}
        fitMode={fitMode}
      />
    </div>
  );
}
