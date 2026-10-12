import { SlidersHorizontal, Droplets } from "lucide-react";
import type { ExportFormat, CompressionSettings, WatermarkSettings } from "../types";

interface Props {
  exportFormat?: ExportFormat;
  compression: CompressionSettings;
  watermark: WatermarkSettings;
  onChangeCompression: (updater: (prev: CompressionSettings) => CompressionSettings) => void;
  onChangeWatermark: (updater: (prev: WatermarkSettings) => WatermarkSettings) => void;
}

export function AdvancedOptionsPanel({
  exportFormat,
  compression,
  watermark,
  onChangeCompression,
  onChangeWatermark,
}: Props) {
  const handleToggleCompress = () => {
    onChangeCompression((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleToggleWatermark = () => {
    onChangeWatermark((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  return (
    <div className="re-advanced-options">
      <div className="re-section-title">Advanced Options</div>

      {/* ── 1. Compress Image Toggle ── */}
      <div className="re-option-card">
        <div className="re-option-header">
          <div className="re-option-left">
            <div className="re-option-icon-wrap">
              <SlidersHorizontal size={15} className="re-option-icon" />
            </div>
            <div>
              <span className="re-option-title">Compress Image</span>
              <p className="re-option-desc">Reduce file size for web & apps</p>
            </div>
          </div>
          <div
            className={`re-toggle ${compression.enabled ? "active" : ""}`}
            onClick={handleToggleCompress}
          >
            <div className="re-toggle-thumb" />
          </div>
        </div>

        {compression.enabled && (
          <div className="re-option-expanded">
            <div className="re-slider-row">
              <div className="re-slider-label">
                <span>Quality Level</span>
                <span className="re-slider-val">{Math.round(compression.level * 100)}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={Math.round(compression.level * 100)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChangeCompression((prev) => ({
                    ...prev,
                    level: val / 100,
                  }));
                }}
                className="re-range-input"
              />
            </div>
            {exportFormat === "png" && (
              <p className="re-lossless-hint">
                PNG uses lossless compression. Quality levels apply when exporting as JPG or WebP.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Add Watermark Toggle ── */}
      <div className="re-option-card">
        <div className="re-option-header">
          <div className="re-option-left">
            <div className="re-option-icon-wrap">
              <Droplets size={15} className="re-option-icon" />
            </div>
            <div>
              <span className="re-option-title">Add Watermark</span>
              <p className="re-option-desc">Protect client drafts and assets</p>
            </div>
          </div>
          <div
            className={`re-toggle ${watermark.enabled ? "active" : ""}`}
            onClick={handleToggleWatermark}
          >
            <div className="re-toggle-thumb" />
          </div>
        </div>

        {watermark.enabled && (
          <div className="re-option-expanded">
            <div className="re-watermark-input-wrap">
              <label className="re-input-label">Watermark Text</label>
              <input
                type="text"
                value={watermark.text}
                maxLength={40}
                placeholder="e.g. DRAFT or @brand"
                onChange={(e) =>
                  onChangeWatermark((prev) => ({ ...prev, text: e.target.value }))
                }
                className="re-text-input"
              />
            </div>

            <div className="re-chip-group">
              <button
                type="button"
                className={`re-chip ${watermark.position === "bottom_right" ? "active" : ""}`}
                onClick={() =>
                  onChangeWatermark((prev) => ({ ...prev, position: "bottom_right" }))
                }
              >
                <span>Bottom Right</span>
              </button>
              <button
                type="button"
                className={`re-chip ${watermark.position === "diagonal" ? "active" : ""}`}
                onClick={() =>
                  onChangeWatermark((prev) => ({ ...prev, position: "diagonal" }))
                }
              >
                <span>Diagonal Repeat</span>
              </button>
            </div>

            <div className="re-slider-row">
              <div className="re-slider-label">
                <span>Opacity</span>
                <span className="re-slider-val">{watermark.opacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={watermark.opacity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChangeWatermark((prev) => ({ ...prev, opacity: val }));
                }}
                className="re-range-input"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
