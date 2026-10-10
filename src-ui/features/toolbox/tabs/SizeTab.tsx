import { useState, useEffect } from "react";
import { Link2, Unlink } from "lucide-react";

interface Props {
  currentWidth: number;
  currentHeight: number;
  onResize?: (width: number, height: number) => void;
  notify?: (msg: string) => void;
}

export function SizeTab({ currentWidth, currentHeight, onResize, notify }: Props) {
  const [width, setWidth] = useState<number>(currentWidth || 1024);
  const [height, setHeight] = useState<number>(currentHeight || 1024);
  const [isLinked, setIsLinked] = useState<boolean>(true);

  // Sync state if current selection dimensions change
  useEffect(() => {
    if (currentWidth > 0) setWidth(currentWidth);
    if (currentHeight > 0) setHeight(currentHeight);
  }, [currentWidth, currentHeight]);

  const handleWidthChange = (val: number) => {
    const newWidth = Math.max(1, Math.round(val));
    setWidth(newWidth);
    if (isLinked && width > 0 && height > 0) {
      const ratio = height / width;
      setHeight(Math.max(1, Math.round(newWidth * ratio)));
    }
  };

  const handleHeightChange = (val: number) => {
    const newHeight = Math.max(1, Math.round(val));
    setHeight(newHeight);
    if (isLinked && width > 0 && height > 0) {
      const ratio = width / height;
      setWidth(Math.max(1, Math.round(newHeight * ratio)));
    }
  };

  const handleApplyResize = () => {
    if (onResize) {
      onResize(width, height);
    } else if (notify) {
      notify(`Resize requested: ${width} × ${height}px`);
    }
  };

  return (
    <div className="tab-pane-content size-tab">
      <div className="size-inputs-container">
        {/* Width input */}
        <div className="size-field-group">
          <label className="size-field-label">Width</label>
          <div className="size-input-wrapper">
            <input
              type="number"
              min={1}
              max={10000}
              className="size-number-input"
              value={width}
              onChange={e => handleWidthChange(Number(e.target.value))}
            />
            <span className="size-unit">px</span>
          </div>
        </div>

        {/* Link / Unlink Aspect Ratio Toggle */}
        <button
          type="button"
          className={`size-link-btn ${isLinked ? "linked" : "unlinked"}`}
          onClick={() => setIsLinked(!isLinked)}
          title={isLinked ? "Aspect ratio locked (click to unlink)" : "Aspect ratio unlocked (click to link)"}
          aria-label={isLinked ? "Unlink aspect ratio" : "Link aspect ratio"}
        >
          {isLinked ? <Link2 size={15} /> : <Unlink size={15} />}
        </button>

        {/* Height input */}
        <div className="size-field-group">
          <label className="size-field-label">Height</label>
          <div className="size-input-wrapper">
            <input
              type="number"
              min={1}
              max={10000}
              className="size-number-input"
              value={height}
              onChange={e => handleHeightChange(Number(e.target.value))}
            />
            <span className="size-unit">px</span>
          </div>
        </div>
      </div>

      {/* Apply Size Action */}
      <button
        type="button"
        className="size-apply-btn"
        onClick={handleApplyResize}
      >
        Resize Layer
      </button>
    </div>
  );
}
