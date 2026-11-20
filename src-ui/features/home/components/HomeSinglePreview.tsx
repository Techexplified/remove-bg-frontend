import { Check, X, Layers, Upload, Trash2 } from "lucide-react";

interface Props {
  previewUrl: string;
  name: string;
  width?: number;
  height?: number;
  onRemove: () => void;
  onInsertFromCanvas: () => void;
  onUploadMore: () => void;
}

export function HomeSinglePreview({
  previewUrl,
  name,
  width,
  height,
  onRemove,
  onInsertFromCanvas,
  onUploadMore,
}: Props) {
  const dimensionStr = width && height ? `${Math.round(width)} × ${Math.round(height)}` : "";

  return (
    <div className="home-v2-single-card">
      {/* Image Preview Canvas */}
      <div className="home-v2-single-media-wrap">
        <img
          src={previewUrl}
          alt={name}
          className="home-v2-single-img"
          draggable={false}
        />

        {/* Floating Top-Left Status Badge */}
        <div className="home-v2-status-badge-green" title="Image ready">
          <Check size={12} strokeWidth={3} />
        </div>

        {/* Floating Top-Right Remove (X) Button */}
        <button
          type="button"
          className="home-v2-tile-remove-btn single-top-right"
          onClick={onRemove}
          title="Remove image"
        >
          <X size={12} strokeWidth={2.5} />
        </button>

        {/* Floating Bottom-Left File Name Pill */}
        <div className="home-v2-single-file-pill" title={name}>
          <span className="home-v2-file-name-text">{name}</span>
          {dimensionStr && <span className="home-v2-file-dim-text">{dimensionStr}</span>}
        </div>
      </div>

      {/* Card Footer Info Bar: Left is Clear All, Right is Canvas & Upload */}
      <div className="home-v2-multi-footer">
        <button
          type="button"
          className="home-v2-clear-link"
          onClick={onRemove}
          title="Clear image"
        >
          <Trash2 size={12} />
          <span>Clear all</span>
        </button>

        <div className="home-v2-multi-footer-actions">
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
        </div>
      </div>
    </div>
  );
}
