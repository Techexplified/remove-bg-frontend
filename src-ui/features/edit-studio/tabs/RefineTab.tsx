import { useState, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { StudioSlider } from "../components/StudioSlider";
import type { RefineAdjustments } from "../types";

interface Props {
  adjustments: RefineAdjustments;
  onChange: (adjustments: RefineAdjustments) => void;
  onCommit: (adjustments?: RefineAdjustments) => void;
}

const DEFAULT_ADJUSTMENTS: RefineAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
};

function getSafeAdjustments(adj?: RefineAdjustments): RefineAdjustments {
  return {
    brightness: typeof adj?.brightness === "number" ? adj.brightness : 100,
    contrast: typeof adj?.contrast === "number" ? adj.contrast : 100,
    saturation: typeof adj?.saturation === "number" ? adj.saturation : 100,
    opacity: typeof adj?.opacity === "number" ? adj.opacity : 100,
  };
}

export function RefineTab({ adjustments, onChange, onCommit }: Props) {
  const [localValues, setLocalValues] = useState<RefineAdjustments>(() =>
    getSafeAdjustments(adjustments)
  );
  const isDraggingRef = useRef(false);

  // Sync from props only when not dragging (e.g. on Undo / Redo / Reset)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValues(getSafeAdjustments(adjustments));
    }
  }, [adjustments]);

  const handleChange = (key: keyof RefineAdjustments, value: number) => {
    isDraggingRef.current = true;
    const next = { ...localValues, [key]: value };
    setLocalValues(next);
    onChange(next);
  };

  const handleCommit = (key: keyof RefineAdjustments, value: number) => {
    isDraggingRef.current = false;
    const next = { ...localValues, [key]: value };
    setLocalValues(next);
    onChange(next);
    onCommit(next);
  };

  const handleReset = () => {
    isDraggingRef.current = false;
    setLocalValues(DEFAULT_ADJUSTMENTS);
    onChange(DEFAULT_ADJUSTMENTS);
    onCommit(DEFAULT_ADJUSTMENTS);
  };

  const isModified =
    localValues.brightness !== 100 ||
    localValues.contrast !== 100 ||
    localValues.saturation !== 100 ||
    localValues.opacity !== 100;

  return (
    <div className="edit-studio-tab-panel edit-studio-tab-panel-refine">
      <div className="edit-studio-panel-header">
        <span className="edit-studio-panel-title">Adjust cutout tone</span>
        {isModified && (
          <button
            type="button"
            className="edit-studio-reset-btn"
            onClick={handleReset}
            title="Reset to default"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="edit-studio-sliders-grid">
        {/* Brightness */}
        <div className="edit-studio-slider-row">
          <div className="edit-studio-slider-label">
            <span>Brightness</span>
            <span className="edit-studio-slider-value">{localValues.brightness}%</span>
          </div>
          <StudioSlider
            min={0}
            max={200}
            value={localValues.brightness}
            onChange={(val) => handleChange("brightness", val)}
            onCommit={(val) => handleCommit("brightness", val)}
            ariaLabel="Brightness"
          />
        </div>

        {/* Contrast */}
        <div className="edit-studio-slider-row">
          <div className="edit-studio-slider-label">
            <span>Contrast</span>
            <span className="edit-studio-slider-value">{localValues.contrast}%</span>
          </div>
          <StudioSlider
            min={0}
            max={200}
            value={localValues.contrast}
            onChange={(val) => handleChange("contrast", val)}
            onCommit={(val) => handleCommit("contrast", val)}
            ariaLabel="Contrast"
          />
        </div>

        {/* Saturation */}
        <div className="edit-studio-slider-row">
          <div className="edit-studio-slider-label">
            <span>Saturation</span>
            <span className="edit-studio-slider-value">{localValues.saturation}%</span>
          </div>
          <StudioSlider
            min={0}
            max={200}
            value={localValues.saturation}
            onChange={(val) => handleChange("saturation", val)}
            onCommit={(val) => handleCommit("saturation", val)}
            ariaLabel="Saturation"
          />
        </div>

        {/* Opacity */}
        <div className="edit-studio-slider-row">
          <div className="edit-studio-slider-label">
            <span>Opacity</span>
            <span className="edit-studio-slider-value">{localValues.opacity}%</span>
          </div>
          <StudioSlider
            min={0}
            max={100}
            value={localValues.opacity}
            onChange={(val) => handleChange("opacity", val)}
            onCommit={(val) => handleCommit("opacity", val)}
            ariaLabel="Opacity"
          />
        </div>
      </div>
    </div>
  );
}
