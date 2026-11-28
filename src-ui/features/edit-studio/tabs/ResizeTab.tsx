import { useState, useRef, useEffect } from "react";
import { Link, Unlink } from "lucide-react";
import type { ResizeConfig, ResizePreset, ExportFormat, FitMode } from "../types";

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

  // Store the active aspect ratio so clearing input fields doesn't lose the ratio
  const ratioRef = useRef<number>(
    resize.height && resize.width
      ? resize.height / resize.width
      : resize.originalHeight && resize.originalWidth
      ? resize.originalHeight / resize.originalWidth
      : 1
  );

  // Update ratio whenever both dimensions are positive numbers
  useEffect(() => {
    if (resize.width > 0 && resize.height > 0) {
      ratioRef.current = resize.height / resize.width;
    }
  }, [resize.width, resize.height]);

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
      if (resize.originalWidth > 0 && resize.originalHeight > 0) {
        ratioRef.current = resize.originalHeight / resize.originalWidth;
      }
    } else {
      const match = PRESETS.find((p) => p.id === presetId);
      if (match) {
        updated = {
          ...resize,
          preset: presetId,
          width: match.width,
          height: match.height,
        };
        ratioRef.current = match.height / match.width;
      } else {
        updated = resize;
      }
    }
    onChange(updated);
    onCommit(updated);
  };

  const handleWidthChange = (w: number) => {
    if (w <= 0) {
      // Emptying width input
      onChange({
        ...resize,
        preset: "custom",
        width: 0,
      });
      return;
    }

    const currentRatio =
      ratioRef.current > 0
        ? ratioRef.current
        : resize.originalHeight && resize.originalWidth
        ? resize.originalHeight / resize.originalWidth
        : 1;

    if (resize.lockAspect) {
      const computedHeight = Math.max(1, Math.round(w * currentRatio));
      onChange({
        ...resize,
        preset: "custom",
        width: w,
        height: computedHeight,
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
    if (h <= 0) {
      // Emptying height input
      onChange({
        ...resize,
        preset: "custom",
        height: 0,
      });
      return;
    }

    const currentRatio =
      ratioRef.current > 0
        ? ratioRef.current
        : resize.originalHeight && resize.originalWidth
        ? resize.originalHeight / resize.originalWidth
        : 1;

    if (resize.lockAspect) {
      const computedWidth = Math.max(1, Math.round(h / currentRatio));
      onChange({
        ...resize,
        preset: "custom",
        height: h,
        width: computedWidth,
      });
    } else {
      onChange({
        ...resize,
        preset: "custom",
        height: h,
      });
    }
  };

  const handleWidthBlur = () => {
    if (!resize.width || resize.width < 32) {
      const currentRatio = ratioRef.current > 0 ? ratioRef.current : 1;
      const fallbackW =
        resize.height > 0
          ? Math.max(32, Math.round(resize.height / currentRatio))
          : resize.originalWidth || 800;
      const updated = {
        ...resize,
        width: fallbackW,
        height:
          resize.lockAspect && (!resize.height || resize.height < 32)
            ? Math.max(32, Math.round(fallbackW * currentRatio))
            : resize.height || resize.originalHeight || 800,
      };
      onChange(updated);
      onCommit(updated);
    } else {
      onCommit(resize);
    }
  };

  const handleHeightBlur = () => {
    if (!resize.height || resize.height < 32) {
      const currentRatio = ratioRef.current > 0 ? ratioRef.current : 1;
      const fallbackH =
        resize.width > 0
          ? Math.max(32, Math.round(resize.width * currentRatio))
          : resize.originalHeight || 800;
      const updated = {
        ...resize,
        height: fallbackH,
        width:
          resize.lockAspect && (!resize.width || resize.width < 32)
            ? Math.max(32, Math.round(fallbackH / currentRatio))
            : resize.width || resize.originalWidth || 800,
      };
      onChange(updated);
      onCommit(updated);
    } else {
      onCommit(resize);
    }
  };

  const handleToggleLock = () => {
    const nextLocked = !resize.lockAspect;
    if (nextLocked) {
      if (resize.width > 0 && resize.height > 0) {
        ratioRef.current = resize.height / resize.width;
      } else if (resize.originalWidth > 0 && resize.originalHeight > 0) {
        ratioRef.current = resize.originalHeight / resize.originalWidth;
      }
    }
    onChange({ ...resize, lockAspect: nextLocked });
  };

  const handleFormatChange = (format: ExportFormat) => {
    const updated = { ...resize, format };
    onChange(updated);
    onCommit(updated);
  };

  const handleFitModeChange = (fitMode: FitMode) => {
    const updated = { ...resize, fitMode };
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
                onBlur={handleWidthBlur}
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
                onBlur={handleHeightBlur}
              />
              <span>px</span>
            </div>
          </div>
        </div>
      )}

      {/* Shared: Output Options Row (Fitting & Format) */}
      <div className="edit-studio-resize-options-row">
        {/* Left: Fitting (Fill vs Fit) */}
        <div className="edit-studio-resize-option-group">
          <span className="edit-studio-format-label">Fitting</span>
          <div className="edit-studio-pill-segmented">
            <button
              type="button"
              className={`edit-studio-pill-option ${(resize.fitMode || "fill") === "fill" ? "active" : ""}`}
              onClick={() => handleFitModeChange("fill")}
            >
              <span>Fill</span>
            </button>
            <button
              type="button"
              className={`edit-studio-pill-option ${resize.fitMode === "fit" ? "active" : ""}`}
              onClick={() => handleFitModeChange("fit")}
            >
              <span>Fit</span>
            </button>
          </div>
        </div>

        {/* Right: Format Selector */}
        <div className="edit-studio-resize-option-group">
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
    </div>
  );
}
