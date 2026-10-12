import { Link, Unlink } from "lucide-react";
import type { CustomDimensions } from "../types";

interface Props {
  dimensions: CustomDimensions;
  originalAspectRatio: number; // width / height
  onChange: (updater: (prev: CustomDimensions) => CustomDimensions) => void;
}

export function CustomSizeBox({ dimensions, originalAspectRatio, onChange }: Props) {
  const handleWidthChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;
    onChange((prev) => {
      const newHeight = prev.locked && originalAspectRatio > 0
        ? Math.round(val / originalAspectRatio)
        : prev.height;
      return { ...prev, width: val, height: newHeight };
    });
  };

  const handleHeightChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;
    onChange((prev) => {
      const newWidth = prev.locked && originalAspectRatio > 0
        ? Math.round(val * originalAspectRatio)
        : prev.width;
      return { ...prev, height: val, width: newWidth };
    });
  };

  const toggleLock = () => {
    onChange((prev) => ({ ...prev, locked: !prev.locked }));
  };

  return (
    <div className="re-custom-box">
      <div className="re-section-title">Custom Size</div>
      <div className="re-custom-inputs-row">
        <div className="re-custom-input-group">
          <label className="re-input-label">Width</label>
          <input
            type="number"
            min="10"
            max="10000"
            value={dimensions.width || ""}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="re-custom-input"
          />
        </div>

        <button
          type="button"
          className={`re-lock-btn ${dimensions.locked ? "locked" : ""}`}
          onClick={toggleLock}
          title={dimensions.locked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
        >
          {dimensions.locked ? <Link size={14} /> : <Unlink size={14} />}
        </button>

        <div className="re-custom-input-group">
          <label className="re-input-label">Height</label>
          <input
            type="number"
            min="10"
            max="10000"
            value={dimensions.height || ""}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="re-custom-input"
          />
        </div>
      </div>
    </div>
  );
}
