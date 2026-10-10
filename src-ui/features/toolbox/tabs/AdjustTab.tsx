import { RotateCcw } from "lucide-react";

interface Props {
  opacity: number;
  setOpacity: (val: number) => void;
  brightness: number;
  setBrightness: (val: number) => void;
  saturation: number;
  setSaturation: (val: number) => void;
  contrast: number;
  setContrast: (val: number) => void;
  onReset: () => void;
}

export function AdjustTab({
  opacity,
  setOpacity,
  brightness,
  setBrightness,
  saturation,
  setSaturation,
  contrast,
  setContrast,
  onReset,
}: Props) {
  const ADJUSTMENT_CONTROLS = [
    { label: "Opacity", value: opacity, setter: setOpacity, min: 0, max: 100 },
    { label: "Brightness", value: brightness, setter: setBrightness, min: 0, max: 100 },
    { label: "Saturation", value: saturation, setter: setSaturation, min: 0, max: 100 },
    { label: "Contrast", value: contrast, setter: setContrast, min: 0, max: 100 },
  ];

  return (
    <div className="tab-pane-content adjust-tab">
      <div className="adjust-header-row">
        <span className="section-subtitle">Adjustments</span>
        <button
          type="button"
          className="reset-adjustments-btn"
          onClick={onReset}
          title="Reset adjustments to defaults"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      <div className="adjust-sliders-list">
        {ADJUSTMENT_CONTROLS.map(ctrl => (
          <div key={ctrl.label} className="slider-row">
            <span className="slider-label">{ctrl.label}</span>
            <input
              type="range"
              min={ctrl.min}
              max={ctrl.max}
              value={ctrl.value}
              className="slider-input"
              onChange={e => ctrl.setter(Number(e.target.value))}
            />
            <div className="slider-val-box">{ctrl.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
