import { useState } from "react";
import { Link, Unlink } from "lucide-react";
import type { ResizeConfig, ResizePreset, ExportFormat } from "../types";

interface Props {
  resize: ResizeConfig;
  onChange: (resize: ResizeConfig) => void;
  onCommit: (resize?: ResizeConfig) => void;
}

const PRESETS: { id: ResizePreset; label: string; width: number; height: number }[] = [
  { id: "square", label: "Square post", width: 1080, height: 1080 },
  { id: "story", label: "Story", width: 1080, height: 1920 },
  { id: "product", label: "Product page", width: 2000, height: 2000 },
];

export function ResizeTab({ resize, onChange, onCommit }: Props) {
  const [mode, setMode] = useState<"ready-made" | "custom">(() =>
    resize.preset === "custom" ? "custom" : "ready-made"
  );

  const handleModeChange = (newMode: "ready-made" | "custom") => {
    setMode(newMode);
    if (newMode === "ready-made" && resize.preset === "custom") {
      handlePresetSelect("original");
    } else if (newMode === "custom") {
      const updated = { ...resize, preset: "custom" as const };
      onChange(updated);
      onCommit(updated);
    }
  };

  const handlePresetSelect = (presetId: ResizePreset) => {
    let updated: ResizeConfig;
    if (presetId === "original") {
      updated = {
        ...resize,
        preset: "original",
        width: resize.originalWidth,
        height: resize.originalHeight,
      };
    } else {
      const match = PRESETS.find((p) => p.id === presetId);
      if (match) {
        updated = {
          ...resize,
          preset: presetId,
          width: match.width,
          height: match.height,
        };
      } else {
        updated = resize;
      }
    }
    onChange(updated);
    onCommit(updated);
  };

  const handleWidthChange = (w: number) => {
    if (resize.lockAspect && resize.width > 0) {
      const ratio = resize.height / resize.width;
      onChange({
        ...resize,
        preset: "custom",
        width: w,
        height: Math.round(w * ratio),
      });
    } else {
      onChange({
        ...resize,
        preset: "custom",
        width: w,
      });
    }
  };

  const handleHeightChange = (h: number) => {
    if (resize.lockAspect && resize.height > 0) {
      const ratio = resize.width / resize.height;
      onChange({
        ...resize,
        preset: "custom",
        height: h,
        width: Math.round(h * ratio),
      });
    } else {
      onChange({
        ...resize,
        preset: "custom",
        height: h,
      });
    }
  };

  const handleToggleLock = () => {
    onChange({ ...resize, lockAspect: !resize.lockAspect });
  };

  const handleFormatChange = (format: ExportFormat) => {
    const updated = { ...resize, format };
    onChange(updated);
    onCommit(updated);
  };

  return (
    <div className="edit-studio-tab-panel edit-studio-tab-panel-resize">
      {/* Top Segmented Mode Tabs: Ready-made | Custom */}
      <div className="edit-studio-segmented-tabs">
        <button
          type="button"
          className={`edit-studio-segmented-btn ${mode === "ready-made" ? "active" : ""}`}
          onClick={() => handleModeChange("ready-made")}
        >
          Ready-made
        </button>
        <button
          type="button"
          className={`edit-studio-segmented-btn ${mode === "custom" ? "active" : ""}`}
          onClick={() => handleModeChange("custom")}
        >
          Custom
        </button>
      </div>

      {/* Mode 1: Ready-made 2×2 Presets Grid */}
      {mode === "ready-made" && (
        <div className="edit-studio-presets-grid">
          {PRESETS.map((p) => {
            const isSelected = resize.preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`edit-studio-preset-card ${isSelected ? "selected" : ""}`}
                onClick={() => handlePresetSelect(p.id)}
              >
                <span className="edit-studio-preset-name">{p.label}</span>
                <span className="edit-studio-preset-dims">
                  {p.width} × {p.height}
                </span>
              </button>
            );
          })}

          {/* Original Preset */}
          <button
            type="button"
            className={`edit-studio-preset-card ${resize.preset === "original" ? "selected" : ""}`}
            onClick={() => handlePresetSelect("original")}
          >
            <span className="edit-studio-preset-name">Original</span>
            <span className="edit-studio-preset-dims">
              {resize.originalWidth} × {resize.originalHeight}
            </span>
          </button>
        </div>
      )}

      {/* Mode 2: Custom Width & Height with Aspect Lock */}
      {mode === "custom" && (
        <div className="edit-studio-custom-dims-row">
          <div className="edit-studio-dim-field">
            <label>Width</label>
            <div className="edit-studio-dim-input-wrap">
              <input
                type="number"
                min={32}
                max={8000}
                value={resize.width || ""}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                onBlur={() => onCommit(resize)}
              />
              <span>px</span>
            </div>
          </div>

          <button
            type="button"
            className={`edit-studio-lock-btn ${resize.lockAspect ? "active" : ""}`}
            onClick={handleToggleLock}
            title={resize.lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
          >
            {resize.lockAspect ? <Link size={14} /> : <Unlink size={14} />}
          </button>

          <div className="edit-studio-dim-field">
            <label>Height</label>
            <div className="edit-studio-dim-input-wrap">
              <input
                type="number"
                min={32}
                max={8000}
                value={resize.height || ""}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                onBlur={() => onCommit(resize)}
              />
              <span>px</span>
            </div>
          </div>
        </div>
      )}

      {/* Shared: Format Selector */}
      <div className="edit-studio-format-selector-row">
        <span className="edit-studio-format-label">Format</span>
        <div className="edit-studio-pill-segmented">
          {(["png", "jpg", "webp"] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
              className={`edit-studio-pill-option ${resize.format === fmt ? "active" : ""}`}
              onClick={() => handleFormatChange(fmt)}
            >
              <span>{fmt.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
