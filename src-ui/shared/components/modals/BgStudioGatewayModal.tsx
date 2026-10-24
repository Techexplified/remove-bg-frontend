import { X, Sparkles, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";

interface Props {
  onConfirm: () => void;
}

export function BgStudioGatewayModal({ onConfirm }: Props) {
  const dispatch = useAppDispatch();
  const { selection, previewUrl, uploadedImage, activeImageSource } = useAppSelector(s => s.figma);

  const displayUrl = (activeImageSource === "upload" && uploadedImage)
    ? uploadedImage.previewUrl
    : (previewUrl || (uploadedImage ? uploadedImage.previewUrl : null));

  const imageName = (activeImageSource === "upload" && uploadedImage)
    ? uploadedImage.name
    : (selection.hasSelection ? selection.name : "Selected Image");

  const handleConfirm = () => {
    dispatch(closeModal());
    onConfirm();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => dispatch(closeModal())}
        style={{ zIndex: 1000 }}
      >
        <motion.div
          className="modal"
          initial={{ scale: 0.94, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 8 }}
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: 340, borderRadius: "16px", overflow: "hidden" }}
        >
          {/* Header */}
          <div className="modal-head" style={{ alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--c-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #a855f7, #6c47ff)",
                  color: "white",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(108, 71, 255, 0.25)",
                }}
              >
                <Layers size={18} />
              </div>
              <div>
                <div className="modal-title" style={{ fontSize: "13.5px", fontWeight: "700" }}>
                  Cutout Required for Studio
                </div>
                <div className="modal-sub" style={{ fontSize: "11px", color: "var(--c-text-3)" }}>
                  Background Studio composites behind cutouts
                </div>
              </div>
            </div>
            <button
              className="modal-close"
              onClick={() => dispatch(closeModal())}
              style={{ color: "var(--c-text-3)", background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {displayUrl && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  background: "var(--c-bg-2)",
                  border: "1px solid var(--c-border)",
                }}
              >
                <img
                  src={displayUrl}
                  alt={imageName}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "8px",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--c-text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {imageName}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#f59e0b", fontWeight: "600", marginTop: "2px" }}>
                    ● Background not removed yet
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: "12px", color: "var(--c-text-2)", lineHeight: "1.5" }}>
              To place your subject against solid colors, gradients, and custom studio scenes, we first need to cleanly remove the existing background.
            </div>
          </div>

          {/* Footer Buttons */}
          <div
            className="modal-foot"
            style={{
              padding: "12px 18px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              background: "var(--c-bg-2)",
              borderTop: "1px solid var(--c-border)",
            }}
          >
            <button
              type="button"
              className="proc-btn proc-btn-secondary"
              onClick={() => dispatch(closeModal())}
              style={{ padding: "8px 14px", fontSize: "12px", fontWeight: "600" }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="proc-btn"
              onClick={handleConfirm}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #6c47ff, #9333ea)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(108, 71, 255, 0.3)",
              }}
            >
              <Sparkles size={13} />
              <span>Remove & Open Studio</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
