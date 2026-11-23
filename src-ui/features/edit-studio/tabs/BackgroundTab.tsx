import { useState, useRef, type ChangeEvent } from "react";
import { Upload, Check, ArrowLeftRight, RotateCcw, Plus, RefreshCw } from "lucide-react";
import { StudioSlider } from "../components/StudioSlider";
import type { BackgroundConfig, BackgroundKind, GradientConfig } from "../types";

interface Props {
  background: BackgroundConfig;
  onChange: (bg: BackgroundConfig) => void;
  onCommit: (bg?: BackgroundConfig) => void;
}

// 7 Curated solid colors (plus Slot 1 = Custom background)
const SOLID_COLORS = [
  { label: "Warm Beige", value: "#f5ebe1" },
  { label: "Tan Sand", value: "#e2b694" },
  { label: "Pure White", value: "#ffffff" },
  { label: "Midnight Navy", value: "#0f172a" },
  { label: "Pale Slate", value: "#e2e8f0" },
  { label: "Pale Sage", value: "#dcfce7" },
  { label: "Soft Lavender", value: "#ede9fe" },
];

// 7 Curated gradient presets (plus Slot 1 = Custom gradient)
const GRADIENT_PRESETS: { label: string; start: string; end: string; angle: number }[] = [
  { label: "Sunset", start: "#ff7e5f", end: "#feb47b", angle: 135 },
  { label: "Neon Dusk", start: "#845ec2", end: "#d65db1", angle: 135 },
  { label: "Ocean Deep", start: "#2b5876", end: "#4e4376", angle: 135 },
  { label: "Soft Aura", start: "#a18cd1", end: "#fbc2eb", angle: 135 },
  { label: "Midnight Glow", start: "#141e30", end: "#243b55", angle: 135 },
  { label: "Warm Peach", start: "#ff9a9e", end: "#fecfef", angle: 135 },
  { label: "Emerald Sun", start: "#11998e", end: "#38ef7d", angle: 135 },
];

function isLightColor(hex: string): boolean {
  if (!hex || hex === "transparent") return true;
  if (hex.startsWith("#")) {
    const c = hex.slice(1);
    const r = parseInt(c.slice(0, 2), 16) || 0;
    const g = parseInt(c.slice(2, 4), 16) || 0;
    const b = parseInt(c.slice(4, 6), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  }
  return true;
}

export function BackgroundTab({ background, onChange, onCommit }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const startColorInputRef = useRef<HTMLInputElement>(null);
  const endColorInputRef = useRef<HTMLInputElement>(null);

  const [showCustomGradient, setShowCustomGradient] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  // Starts as null (grey with +) unless already using a non-curated custom color
  const [customColor, setCustomColor] = useState<string | null>(() => {
    if (background.kind === "color" && background.color !== "transparent") {
      const isCurated = SOLID_COLORS.some(
        (c) => c.value.toLowerCase() === background.color.toLowerCase()
      );
      return isCurated ? null : background.color;
    }
    return null;
  });

  // Explicit tracking prevents duplicate ticks between custom and curated colors
  const [colorSource, setColorSource] = useState<"custom" | "curated" | "original">(() => {
    if (background.kind !== "color" || background.color === "transparent") {
      return "original";
    }
    if (SOLID_COLORS.some((c) => c.value.toLowerCase() === background.color.toLowerCase())) {
      return "curated";
    }
    return "custom";
  });

  const [hasCustomGradient, setHasCustomGradient] = useState<boolean>(() => {
    if (background.kind === "gradient") {
      const isPreset = GRADIENT_PRESETS.some(
        (p) =>
          p.start.toLowerCase() === background.gradient.start.toLowerCase() &&
          p.end.toLowerCase() === background.gradient.end.toLowerCase() &&
          p.angle === background.gradient.angle
      );
      return !isPreset;
    }
    return false;
  });

  const [gradientSource, setGradientSource] = useState<"custom" | "preset">("preset");

  const handleKindChange = (kind: BackgroundKind) => {
    const updated = { ...background, kind };
    onChange(updated);
    onCommit(updated);
  };

  // ── Reset to Original Cutout (Transparent) ──
  const handleResetToOriginal = () => {
    setColorSource("original");
    setGradientSource("preset");
    setImageFileName(null);
    const updated: BackgroundConfig = {
      ...background,
      kind: "color",
      color: "transparent",
      imageSrc: null,
    };
    onChange(updated);
    onCommit(updated);
  };

  // ── Color Handlers ──
  const handleCustomColorPick = (color: string) => {
    setCustomColor(color);
    setColorSource("custom");
    const updated = { ...background, kind: "color" as const, color };
    onChange(updated);
    onCommit(updated);
  };

  const handleCustomSlotClick = () => {
    setColorSource("custom");
    const colorToApply = customColor || "#ffffff";
    if (!customColor) {
      setCustomColor(colorToApply);
    }
    const updated = { ...background, kind: "color" as const, color: colorToApply };
    onChange(updated);
    onCommit(updated);
    // Pop open the color picker modal to choose or adjust
    colorInputRef.current?.click();
  };

  const handleCuratedColorSelect = (color: string) => {
    setColorSource("curated");
    const updated = { ...background, kind: "color" as const, color };
    onChange(updated);
    onCommit(updated);
  };

  // ── Gradient Handlers ──
  const handleGradientPresetSelect = (preset: { start: string; end: string; angle: number }) => {
    setGradientSource("preset");
    const updated = {
      ...background,
      kind: "gradient" as const,
      gradient: {
        angle: preset.angle,
        start: preset.start,
        end: preset.end,
      },
    };
    onChange(updated);
    onCommit(updated);
  };

  const handleCustomGradientChange = (updates: Partial<GradientConfig>) => {
    setGradientSource("custom");
    setHasCustomGradient(true);
    const updatedGradient = {
      ...background.gradient,
      ...updates,
    };
    const updated = {
      ...background,
      kind: "gradient" as const,
      gradient: updatedGradient,
    };
    onChange(updated);
    onCommit(updated);
  };

  const handleSwapStops = () => {
    handleCustomGradientChange({
      start: background.gradient.end,
      end: background.gradient.start,
    });
  };

  // ── Image Handlers ──
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const url = URL.createObjectURL(file);
    const updated: BackgroundConfig = {
      ...background,
      kind: "image",
      imageSrc: url,
    };
    onChange(updated);
    onCommit(updated);
    e.target.value = "";
  };

  // Check if background has been modified from original clean cutout
  const hasActiveBackground =
    background.kind !== "color" || background.color !== "transparent";

  // Checkmark state (NO DUPLICATE TICKS)
  const isCustomColorSelected =
    background.kind === "color" && colorSource === "custom";

  const isCurrentGradientSelected =
    background.kind === "gradient" && gradientSource === "custom";

  const currentGradientCss = `linear-gradient(${background.gradient.angle}deg, ${background.gradient.start}, ${background.gradient.end})`;

  return (
    <div className="edit-studio-tab-panel edit-studio-tab-panel-background">
      {/* Segmented Top: Colour | Gradient | Image */}
      <div className="edit-studio-segmented-tabs">
        <button
          type="button"
          className={`edit-studio-segmented-btn ${background.kind === "color" ? "active" : ""}`}
          onClick={() => handleKindChange("color")}
        >
          Colour
        </button>
        <button
          type="button"
          className={`edit-studio-segmented-btn ${background.kind === "gradient" ? "active" : ""}`}
          onClick={() => handleKindChange("gradient")}
        >
          Gradient
        </button>
        <button
          type="button"
          className={`edit-studio-segmented-btn ${background.kind === "image" ? "active" : ""}`}
          onClick={() => handleKindChange("image")}
        >
          Image
        </button>
      </div>

      {/* ── Sub-Panel 1: Colour ── */}
      {background.kind === "color" && (
        <div className="edit-studio-subpanel">
          <div className="edit-studio-subpanel-header">
            <span className="edit-studio-subpanel-subtitle">Matched to your photo, plus classics</span>
            <div className="edit-studio-header-actions">
              {hasActiveBackground && (
                <button
                  type="button"
                  className="edit-studio-reset-btn"
                  onClick={handleResetToOriginal}
                  title="Revert to original transparent cutout"
                >
                  <RotateCcw size={11} strokeWidth={2.4} />
                  <span>Original</span>
                </button>
              )}
            </div>
            <input
              ref={colorInputRef}
              type="color"
              value={customColor || "#ffffff"}
              onChange={(e) => handleCustomColorPick(e.target.value)}
              className="edit-studio-native-color-input"
            />
          </div>

          <div className="edit-studio-swatches-grid-2x4">
            {/* Slot 1: Custom Color Slot with persistent Plus icon */}
            <button
              type="button"
              className={`edit-studio-swatch-rect edit-studio-custom-color-slot ${
                customColor ? "has-color" : ""
              } ${isCustomColorSelected ? "selected" : ""}`}
              style={customColor ? { backgroundColor: customColor } : undefined}
              onClick={handleCustomSlotClick}
              title={
                customColor
                  ? `Custom color (${customColor}) — click to change`
                  : "Add custom color"
              }
            >
              <Plus
                size={14}
                color={
                  customColor
                    ? isLightColor(customColor)
                      ? "#0f172a"
                      : "#ffffff"
                    : "#64748b"
                }
                strokeWidth={2.5}
              />
            </button>

            {/* Slots 2–8: 7 Curated Colors */}
            {SOLID_COLORS.map((col) => {
              const isSelected =
                background.kind === "color" &&
                colorSource === "curated" &&
                background.color.toLowerCase() === col.value.toLowerCase();
              return (
                <button
                  key={col.value}
                  type="button"
                  className={`edit-studio-swatch-rect ${isSelected ? "selected" : ""}`}
                  style={{ backgroundColor: col.value }}
                  onClick={() => handleCuratedColorSelect(col.value)}
                  title={col.label}
                >
                  {isSelected && (
                    <Check
                      size={14}
                      color={isLightColor(col.value) ? "#0f172a" : "#ffffff"}
                      strokeWidth={2.8}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sub-Panel 2: Gradient ── */}
      {background.kind === "gradient" && (
        <div className="edit-studio-subpanel">
          {showCustomGradient ? (
            /* Custom Gradient Editor with 0°–360° Angle Slider */
            <div className="edit-studio-custom-gradient-panel">
              <div className="edit-studio-custom-gradient-header">
                <span className="edit-studio-subpanel-subtitle">Custom gradient</span>
                <button
                  type="button"
                  className="edit-studio-done-btn"
                  onClick={() => setShowCustomGradient(false)}
                  title="Done editing custom gradient"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Done</span>
                </button>
              </div>

              {/* Color Stops Row */}
              <div className="edit-studio-gradient-stops-row">
                <div
                  className="edit-studio-stop-card"
                  onClick={() => startColorInputRef.current?.click()}
                  title="Change start color"
                >
                  <span className="edit-studio-stop-title">Start</span>
                  <div
                    className="edit-studio-stop-swatch"
                    style={{ backgroundColor: background.gradient.start }}
                  />
                  <span className="edit-studio-stop-hex">{background.gradient.start}</span>
                  <input
                    ref={startColorInputRef}
                    type="color"
                    value={background.gradient.start}
                    onChange={(e) => handleCustomGradientChange({ start: e.target.value })}
                    className="edit-studio-native-color-input"
                  />
                </div>

                <button
                  type="button"
                  className="edit-studio-swap-stops-btn"
                  onClick={handleSwapStops}
                  title="Swap gradient colors"
                >
                  <ArrowLeftRight size={13} />
                </button>

                <div
                  className="edit-studio-stop-card"
                  onClick={() => endColorInputRef.current?.click()}
                  title="Change end color"
                >
                  <span className="edit-studio-stop-title">End</span>
                  <div
                    className="edit-studio-stop-swatch"
                    style={{ backgroundColor: background.gradient.end }}
                  />
                  <span className="edit-studio-stop-hex">{background.gradient.end}</span>
                  <input
                    ref={endColorInputRef}
                    type="color"
                    value={background.gradient.end}
                    onChange={(e) => handleCustomGradientChange({ end: e.target.value })}
                    className="edit-studio-native-color-input"
                  />
                </div>
              </div>

              {/* Angle Slider without snap pills */}
              <div className="edit-studio-angle-control-group">
                <div className="edit-studio-angle-header">
                  <span className="edit-studio-angle-title">Angle</span>
                  <div className="edit-studio-angle-val-box">
                    <input
                      type="number"
                      min={0}
                      max={360}
                      value={background.gradient.angle}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(360, Number(e.target.value) || 0));
                        handleCustomGradientChange({ angle: val });
                      }}
                    />
                    <span>°</span>
                  </div>
                </div>

                <StudioSlider
                  min={0}
                  max={360}
                  step={1}
                  value={background.gradient.angle}
                  onChange={(angle) => handleCustomGradientChange({ angle })}
                  onCommit={(angle) =>
                    onCommit({ ...background, gradient: { ...background.gradient, angle } })
                  }
                />
              </div>
            </div>
          ) : (
            /* Curated Gradients 2×4 Grid matching Colour Tab */
            <>
              <div className="edit-studio-subpanel-header">
                <span className="edit-studio-subpanel-subtitle">Curated gradients</span>
                <div className="edit-studio-header-actions">
                  {hasActiveBackground && (
                    <button
                      type="button"
                      className="edit-studio-reset-btn"
                      onClick={handleResetToOriginal}
                      title="Revert to original transparent cutout"
                    >
                      <RotateCcw size={11} strokeWidth={2.4} />
                      <span>Original</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="edit-studio-swatches-grid-2x4">
                {/* Slot 1: Custom Gradient Slot with persistent Plus icon */}
                <button
                  type="button"
                  className={`edit-studio-swatch-rect edit-studio-custom-color-slot ${
                    hasCustomGradient ? "has-color" : ""
                  } ${isCurrentGradientSelected ? "selected" : ""}`}
                  style={hasCustomGradient ? { background: currentGradientCss } : undefined}
                  onClick={() => {
                    setGradientSource("custom");
                    setHasCustomGradient(true);
                    setShowCustomGradient(true);
                  }}
                  title={
                    hasCustomGradient
                      ? `Custom gradient (${background.gradient.angle}°) — click to edit`
                      : "Create custom gradient"
                  }
                >
                  <Plus
                    size={14}
                    color={hasCustomGradient ? "#ffffff" : "#64748b"}
                    strokeWidth={2.5}
                    style={
                      hasCustomGradient
                        ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }
                        : undefined
                    }
                  />
                </button>

                {/* Slots 2–8: 7 Curated Gradients */}
                {GRADIENT_PRESETS.map((preset) => {
                  const gradientCss = `linear-gradient(${preset.angle}deg, ${preset.start}, ${preset.end})`;
                  const isSelected =
                    background.kind === "gradient" &&
                    gradientSource === "preset" &&
                    background.gradient.start.toLowerCase() === preset.start.toLowerCase() &&
                    background.gradient.end.toLowerCase() === preset.end.toLowerCase() &&
                    background.gradient.angle === preset.angle;

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`edit-studio-swatch-rect ${isSelected ? "selected" : ""}`}
                      style={{ background: gradientCss }}
                      onClick={() => handleGradientPresetSelect(preset)}
                      title={preset.label}
                    >
                      {isSelected && <Check size={14} color="#ffffff" strokeWidth={2.8} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Sub-Panel 3: Image ── */}
      {background.kind === "image" && (
        <div className="edit-studio-subpanel">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />

          <div className="edit-studio-subpanel-header">
            <span className="edit-studio-subpanel-subtitle">Background image</span>
            {hasActiveBackground && (
              <button
                type="button"
                className="edit-studio-reset-btn"
                onClick={handleResetToOriginal}
                title="Revert to original transparent cutout"
              >
                <RotateCcw size={11} strokeWidth={2.4} />
                <span>Original</span>
              </button>
            )}
          </div>

          {!background.imageSrc ? (
            /* State 1: No Image Uploaded Yet (Clean Dashed Dropzone) */
            <div
              className="edit-studio-image-empty-dropzone"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload custom background image"
            >
              <div className="edit-studio-image-upload-icon-wrap">
                <Upload size={15} strokeWidth={2.4} />
              </div>
              <span className="edit-studio-image-upload-title">Upload background image</span>
              <span className="edit-studio-image-upload-subtitle">PNG, JPG, or WebP</span>
            </div>
          ) : (
            /* State 2: Active Image Preview Card with Change & Remove */
            <div className="edit-studio-image-active-card">
              <img
                src={background.imageSrc}
                alt="Backdrop preview"
                className="edit-studio-image-active-thumb"
              />

              <div className="edit-studio-image-active-info">
                <span
                  className="edit-studio-image-active-name"
                  title={imageFileName || "Custom backdrop"}
                >
                  {imageFileName || "Custom backdrop"}
                </span>
                <span className="edit-studio-image-active-status">Applied to canvas</span>
              </div>

              <div className="edit-studio-image-active-actions">
                <button
                  type="button"
                  className="edit-studio-image-change-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change background image"
                >
                  <RefreshCw size={11} strokeWidth={2.2} />
                  <span>Change</span>
                </button>
                <button
                  type="button"
                  className="edit-studio-image-remove-btn"
                  onClick={handleResetToOriginal}
                  title="Remove background image"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
