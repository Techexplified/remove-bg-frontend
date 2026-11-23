import { Sparkles, RotateCcw } from "lucide-react";
import { StudioSlider } from "../components/StudioSlider";
import type { RemoveState } from "../types";

interface Props {
  state: RemoveState;
  onStateChange: (state: RemoveState) => void;
  onClearSelection: () => void;
  onExecuteRemove: () => void;
}

export function RemoveTab({
  state,
  onStateChange,
  onClearSelection,
  onExecuteRemove,
}: Props) {
  const handleBrushSizeChange = (brushSize: number) => {
    onStateChange({ ...state, brushSize });
  };

  return (
    <div className="edit-studio-tab-panel edit-studio-tab-panel-remove">
      <div className="edit-studio-panel-header">
        <span className="edit-studio-panel-title">Brush over area to remove</span>
        {state.hasSelection && (
          <button
            type="button"
            className="edit-studio-reset-btn"
            onClick={onClearSelection}
            title="Clear painted selection"
          >
            <RotateCcw size={12} />
            <span>Clear selection</span>
          </button>
        )}
      </div>

      {/* Brush Size Slider */}
      <div className="edit-studio-slider-row">
        <div className="edit-studio-slider-label">
          <span>Brush size</span>
          <span className="edit-studio-slider-value">{state.brushSize}px</span>
        </div>
        <StudioSlider
          min={5}
          max={80}
          value={state.brushSize}
          onChange={handleBrushSizeChange}
          ariaLabel="Brush size"
        />
      </div>

      {/* Primary Action Button: Disabled if no area is painted */}
      <button
        type="button"
        className={`edit-studio-remove-cta-btn ${!state.hasSelection ? "disabled" : ""}`}
        disabled={!state.hasSelection}
        onClick={onExecuteRemove}
      >
        <Sparkles size={14} />
        <span>Remove selected area</span>
      </button>

      <p className="edit-studio-panel-caption">
        Drag your cursor over any unwanted object or shadow on the image, then click Remove.
      </p>
    </div>
  );
}
