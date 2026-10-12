import { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WatermarkSettings, ResizeFitMode } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  targetWidth: number;
  targetHeight: number;
  originalWidth: number;
  originalHeight: number;
  activeView: "original" | "resized";
  watermark: WatermarkSettings;
  fitMode: ResizeFitMode;
}

export function ResizeFullscreenModal({
  isOpen,
  onClose,
  previewUrl,
  targetWidth,
  targetHeight,
  originalWidth,
  originalHeight,
  activeView,
  watermark,
  fitMode,
}: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !previewUrl) return null;

  const displayWidth = activeView === "resized" ? targetWidth : originalWidth;
  const displayHeight = activeView === "resized" ? targetHeight : originalHeight;
  const aspectRatio = targetWidth > 0 && targetHeight > 0 ? targetWidth / targetHeight : 1;

  return (
    <AnimatePresence>
      <motion.div
        className="re-fullscreen-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      >
        {/* Top Header */}
        <div
          className="re-fullscreen-header"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="re-fullscreen-title-wrap">
            <span className="re-fullscreen-title">Full Preview</span>
            <span className="re-fullscreen-dim-badge">
              {displayWidth} × {displayHeight} px ({activeView === "resized" ? "Resized" : "Original"})
            </span>
          </div>

          <button
            type="button"
            className="re-fullscreen-close-btn"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close Preview"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected Dimensions Viewport */}
        <motion.div
          className="re-fullscreen-viewport"
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="re-fullscreen-aspect-box"
            style={{
              aspectRatio: activeView === "resized" ? `${aspectRatio}` : undefined,
            }}
          >
            <img
              src={previewUrl}
              alt="Full Preview"
              className="re-fullscreen-img"
              style={{
                objectFit: activeView === "resized" ? fitMode : "contain",
              }}
              draggable={false}
            />

            {/* Live Watermark Overlay in Fullscreen */}
            {watermark.enabled && watermark.text && (
              <div
                className={`re-watermark-overlay ${watermark.position}`}
                style={{ opacity: watermark.opacity / 100 }}
              >
                {watermark.position === "diagonal" ? (
                  <div className="re-watermark-grid">
                    {Array.from({ length: 16 }).map((_, i) => (
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

            {/* Dimension Badge Pill */}
            <div className="re-dim-badge">
              {displayWidth} × {displayHeight}
            </div>
          </div>
        </motion.div>

        {/* Footer with Cancel button ONLY */}
        <div
          className="re-fullscreen-footer"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="re-fullscreen-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
