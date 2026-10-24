import { Sparkles } from "lucide-react";
import type { BackgroundPreset } from "../types";

interface Props {
  presets: BackgroundPreset[];
  selectedPresetId: string | null;
  foregroundPreviewUrl: string | null;
  onSelectPreset: (preset: BackgroundPreset) => void;
  disabled?: boolean;
}

export function StudioPresetsGrid({
  presets,
  selectedPresetId,
  foregroundPreviewUrl,
  onSelectPreset,
  disabled = false,
}: Props) {
  return (
    <div className="presets-tray-section">
      <div className="presets-tray-header">
        <span className="presets-header-title">Background Presets</span>
        <span className="presets-view-all-link">{presets.length} presets</span>
      </div>

      {/* ── 2 rows × 4 columns Grid (disabled when background not removed) ── */}
      <div className={`presets-grid-2x4 ${disabled ? "presets-grid-disabled" : ""}`}>
        {presets.map((p) => {
          const isSelected = selectedPresetId === p.id;
          const bgCss = p.colors
            ? `linear-gradient(${p.angle ?? 135}deg, ${p.colors[0]} 0%, ${p.colors[1]} 100%)`
            : "#ffffff";

          return (
            <div
              key={p.id}
              className={`preset-tile-card ${isSelected ? "active" : ""}`}
              onClick={disabled ? undefined : () => onSelectPreset(p)}
            >
              <div
                className="preset-tile-thumb"
                style={{ background: bgCss }}
              >
                {/* Visual effect overlays */}
                {p.effect === "glow" && <div className="preset-thumb-glow-overlay" />}
                {p.effect === "vignette" && <div className="preset-thumb-vignette-overlay" />}

                {foregroundPreviewUrl && (
                  <div className="preset-thumb-subject-wrap">
                    <img
                      src={foregroundPreviewUrl}
                      alt={p.name}
                      className="preset-subject-preview-img"
                    />
                    {p.effect === "shadow" && (
                      <div className="preset-thumb-ground-shadow" />
                    )}
                  </div>
                )}
              </div>
              <span className="preset-tile-name" title={p.name}>
                {p.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Callout Banner ── */}
      <div className="looks-great-banner" style={disabled ? { opacity: 0.75, background: "#f8fafc", borderColor: "#e2e8f0" } : undefined}>
        <Sparkles size={18} className="banner-sparkle-icon" style={disabled ? { color: "#94a3b8" } : undefined} />
        <div className="banner-text-wrap">
          <span className="banner-title" style={disabled ? { color: "#64748b" } : undefined}>
            {disabled ? "Background presets available after cutout" : "Looks great! 🔥"}
          </span>
          <span className="banner-subtitle">
            {disabled
              ? "Once the background is removed, you can apply preset backdrops to your image."
              : "You can now apply this background to your image."}
          </span>
        </div>
      </div>
    </div>
  );
}
