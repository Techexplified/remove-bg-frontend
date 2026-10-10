import { Check, X, Loader2 } from "lucide-react";
import type { BatchItem } from "../types";

interface Props {
  items: BatchItem[];
  onToggleSelect: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export function BatchImageGrid({ items, onToggleSelect, onRemoveItem, onClearAll }: Props) {
  if (items.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div className="batch-section-header">
        <span className="batch-section-title">
          Selected Images ({items.length})
        </span>
        <button className="batch-clear-btn" onClick={onClearAll}>
          Clear All
        </button>
      </div>

      <div className="batch-grid">
        {items.map(item => (
          <div
            key={item.id}
            className={`batch-card ${!item.selected ? "deselected" : ""}`}
            title={item.name}
          >
            {/* Checkerboard background */}
            <div className="batch-card-checker" />

            {/* Selection Checkbox */}
            <div
              className={`batch-card-check ${item.selected ? "active" : ""}`}
              onClick={e => {
                e.stopPropagation();
                onToggleSelect(item.id);
              }}
              title={item.selected ? "Deselect image" : "Select image"}
            >
              {item.selected && <Check size={11} strokeWidth={3} />}
            </div>

            {/* Remove / Delete Button */}
            <button
              className="batch-card-delete"
              onClick={e => {
                e.stopPropagation();
                onRemoveItem(item.id);
              }}
              title="Remove image"
            >
              <X size={10} strokeWidth={2.5} />
            </button>

            {/* Image Thumbnail */}
            <img
              src={item.resultPreviewUrl ?? item.previewUrl}
              alt={item.name}
              className="batch-card-img"
            />

            {/* Processing / Status Badge */}
            {item.status === "processing" && (
              <div className="batch-card-status">
                <Loader2 size={10} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: "3px" }} />
                Processing
              </div>
            )}
            {item.status === "done" && (
              <div className="batch-card-status done">Done ✓</div>
            )}
            {item.status === "error" && (
              <div className="batch-card-status error" title={item.error ?? "Failed"}>
                Failed
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
