import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Layers, Upload, Lock } from "lucide-react";
import type { SelectedImageItem } from "../types";

interface Props {
  items: SelectedImageItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onInsertFromCanvas: () => void;
  onUploadMore: () => void;
}

export function HomeMultiPreviewGrid({
  items,
  onRemoveItem,
  onClearAll,
  onInsertFromCanvas,
  onUploadMore,
}: Props) {
  const totalCount = items.length;
  const isMaxReached = totalCount >= 15;

  // 2 items: 2 columns
  // 3 to 15 items: 3-column matrix
  const gridClass = totalCount === 2 ? "grid-cols-2" : "grid-matrix-3";

  return (
    <div className="home-v2-multi-card">
      {/* Scrollable Matrix Area (clean internal scroll when exceeding 9 items) */}
      <div className={`home-v2-multi-scroll-area ${totalCount > 9 ? "is-scrollable" : ""}`}>
        <div className={`home-v2-matrix-grid ${gridClass}`}>
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.82 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="home-v2-grid-tile"
                title={item.name}
              >
                {/* Image Preview - Cleanly fitted inside tile without any cropping */}
                <div className="home-v2-tile-img-wrap">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="home-v2-tile-img"
                    draggable={false}
                  />
                </div>

                {/* Floating Top-Right (X) Cross Mark */}
                <button
                  type="button"
                  className="home-v2-tile-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  title={`Remove ${item.name}`}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Bar: Left is Clear All, Right is Canvas/Upload actions or Max Limit Badge */}
      <div className="home-v2-multi-footer">
        <button
          type="button"
          className="home-v2-clear-link"
          onClick={onClearAll}
          title="Clear all selected images"
        >
          <Trash2 size={12} />
          <span>Clear all</span>
        </button>

        <div className="home-v2-multi-footer-actions">
          {isMaxReached ? (
            <div
              className="home-v2-max-limit-badge"
              title="Maximum 15 images reached. Remove an image with (X) or Clear all to add new ones."
            >
              <Lock size={12} strokeWidth={2.5} />
              <span>Max limit reached (15/15)</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="home-v2-canvas-action-btn"
                onClick={onInsertFromCanvas}
                title="Insert selected layers from Figma canvas"
              >
                <Layers size={13} strokeWidth={2.2} />
                <span>Insert from canvas</span>
              </button>

              <button
                type="button"
                className="home-v2-add-more-btn"
                onClick={onUploadMore}
                title="Upload more images from your system"
              >
                <Upload size={13} strokeWidth={2.2} />
                <span>Upload more</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
