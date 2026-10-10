import React, { useEffect } from "react";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  bgStyle?: React.CSSProperties;
  filterCss?: string;
  onDownload?: () => void;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  bgStyle,
  filterCss = "none",
  onDownload,
}: Props) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && imageUrl && (
        <motion.div
          className="image-viewer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          {/* Top Bar with Title and Close button */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 2,
            }}
            onClick={e => e.stopPropagation()}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "0.2px",
              }}
            >
              Full Preview
            </span>

            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close Preview"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Main Image Container */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "100%",
              maxHeight: "75vh",
              width: "100%",
              flex: 1,
              margin: "16px 0",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              ...bgStyle,
            }}
          >
            <img
              src={imageUrl}
              alt="Full Preview"
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
                filter: filterCss,
                userSelect: "none",
              }}
            />
          </motion.div>

          {/* Bottom Bar with quick actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              zIndex: 2,
            }}
            onClick={e => e.stopPropagation()}
          >
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                style={{
                  height: "36px",
                  padding: "0 16px",
                  borderRadius: "100px",
                  backgroundColor: "#ffffff",
                  border: "none",
                  color: "#0f172a",
                  fontWeight: "600",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                }}
              >
                <Download size={13} />
                <span>Download</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                height: "36px",
                padding: "0 16px",
                borderRadius: "100px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
