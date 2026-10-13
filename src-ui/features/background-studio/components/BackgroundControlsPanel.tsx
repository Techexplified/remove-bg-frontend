import { useRef } from "react";
import {
  Palette,
  Layers,
  Image as ImageIcon,
  Upload,
  Plus,
  ChevronRight,
  Sun,
  Droplets,
  CircleDot,
  Contrast,
} from "lucide-react";
import type {
  BackgroundTab,
  GradientConfig,
  AdjustmentsState,
  StudioFilter,
  RecentBackgroundItem,
} from "../types";

interface Props {
  activeTab: BackgroundTab;
  onTabChange: (tab: BackgroundTab) => void;

  // Solid Color
  solidColor: string;
  onSolidColorChange: (color: string) => void;

  // Gradient
  gradient: GradientConfig;
  onGradientChange: (gradient: GradientConfig) => void;

  // Image Backdrop
  backdropFileName: string | null;
  onBackdropUpload: (file: File) => void;

  // Recently Used
  recentItems: RecentBackgroundItem[];
  onSelectRecent: (item: RecentBackgroundItem) => void;

  // Adjustments
  adjustments: AdjustmentsState;
  onAdjustmentsChange: (adjustments: AdjustmentsState) => void;

  // Filters
  filter: StudioFilter;
  onFilterChange: (filter: StudioFilter) => void;
}

const SOLID_PALETTE_1 = ["#ffffff", "#121214", "#f1f5f9", "#475569", "#f5e6d3", "#38bdf8"];
const SOLID_PALETTE_2 = ["#f87171", "#fb923c", "#a855f7", "#3b82f6", "#10b981"];

const CURATED_GRADIENTS_ROW: Array<{ angle: number; stops: [string, string] }> = [
  { angle: 135, stops: ["#ec4899", "#8b5cf6"] },
  { angle: 135, stops: ["#6366f1", "#06b6d4"] },
  { angle: 135, stops: ["#f97316", "#ec4899"] },
  { angle: 135, stops: ["#14b8a6", "#3b82f6"] },
  { angle: 135, stops: ["#06b6d4", "#a855f7"] },
];

interface FilterDef {
  id: StudioFilter;
  label: string;
  css: string;
}

const IMAGE_FILTERS: FilterDef[] = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "bw", label: "B&W", css: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", css: "sepia(80%)" },
  { id: "vivid", label: "Vivid", css: "saturate(180%) contrast(1.1)" },
  { id: "cool", label: "Cool", css: "hue-rotate(200deg) saturate(120%)" },
  { id: "warm", label: "Warm", css: "sepia(30%) saturate(130%)" },
];

export function BackgroundControlsPanel({
  activeTab,
  onTabChange,
  solidColor,
  onSolidColorChange,
  gradient,
  onGradientChange,
  backdropFileName,
  onBackdropUpload,
  recentItems,
  onSelectRecent,
  adjustments,
  onAdjustmentsChange,
  filter,
  onFilterChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const stop1PickerRef = useRef<HTMLInputElement>(null);
  const stop2PickerRef = useRef<HTMLInputElement>(null);

  const updateAdjustment = (key: keyof AdjustmentsState, value: number) => {
    onAdjustmentsChange({ ...adjustments, [key]: value });
  };

  return (
    <aside className="studio-controls-panel">
      {/* ── Section 1: BACKGROUND Category Cards ── */}
      <div>
        <div className="studio-section-label">Background</div>
        <div className="category-cards-grid">
          <button
            className={`category-card-btn ${activeTab === "color" ? "active" : ""}`}
            onClick={() => onTabChange("color")}
          >
            <Palette size={18} />
            <span>Color</span>
          </button>
          <button
            className={`category-card-btn ${activeTab === "gradient" ? "active" : ""}`}
            onClick={() => onTabChange("gradient")}
          >
            <Layers size={18} />
            <span>Gradient</span>
          </button>
          <button
            className={`category-card-btn ${activeTab === "image" ? "active" : ""}`}
            onClick={() => onTabChange("image")}
          >
            <ImageIcon size={18} />
            <span>Image</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content: Color (Only when Color tab is active) ── */}
      {activeTab === "color" && (
        <div>
          <div className="studio-subsection-title">Solid Colors</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Row 1 */}
            <div className="swatches-circles-grid">
              {SOLID_PALETTE_1.map((hex) => (
                <button
                  key={hex}
                  className={`color-circle-btn ${
                    solidColor.toLowerCase() === hex.toLowerCase() ? "active" : ""
                  }`}
                  style={{ backgroundColor: hex }}
                  onClick={() => onSolidColorChange(hex)}
                  title={hex}
                />
              ))}
            </div>

            {/* Row 2 */}
            <div className="swatches-circles-grid">
              {SOLID_PALETTE_2.map((hex) => (
                <button
                  key={hex}
                  className={`color-circle-btn ${
                    solidColor.toLowerCase() === hex.toLowerCase() ? "active" : ""
                  }`}
                  style={{ backgroundColor: hex }}
                  onClick={() => onSolidColorChange(hex)}
                  title={hex}
                />
              ))}

              {/* Custom Color Native Picker Button */}
              <button
                className="add-circle-btn"
                onClick={() => colorPickerRef.current?.click()}
                title="Pick Custom Color"
              >
                <Plus size={16} />
                <input
                  ref={colorPickerRef}
                  type="color"
                  style={{ display: "none" }}
                  value={solidColor}
                  onChange={(e) => onSolidColorChange(e.target.value)}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: Gradient (Only when Gradient tab is active) ── */}
      {activeTab === "gradient" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="studio-subsection-title">Gradients</div>
          <div className="gradient-pills-row">
            {CURATED_GRADIENTS_ROW.map((g, idx) => {
              const bgCss = `linear-gradient(${g.angle}deg, ${g.stops[0]} 0%, ${g.stops[1]} 100%)`;
              const isActive =
                gradient.stops[0].color.toLowerCase() === g.stops[0].toLowerCase() &&
                gradient.stops[1].color.toLowerCase() === g.stops[1].toLowerCase();

              return (
                <button
                  key={idx}
                  className={`gradient-pill-btn ${isActive ? "active" : ""}`}
                  style={{ background: bgCss }}
                  onClick={() => {
                    onGradientChange({
                      angle: g.angle,
                      stops: [
                        { color: g.stops[0], offset: 0 },
                        { color: g.stops[1], offset: 1 },
                      ],
                    });
                  }}
                  title={`Preset Gradient ${idx + 1}`}
                />
              );
            })}
          </div>

          {/* Custom Gradient Builder */}
          <div className="gradient-builder-card">
            <div className="studio-subsection-title" style={{ margin: 0 }}>
              <span>Custom Gradient</span>
              <span style={{ fontSize: "10.5px", color: "#64748b" }}>{gradient.angle}°</span>
            </div>

            {/* Angle Slider */}
            <div>
              <input
                type="range"
                min="0"
                max="360"
                value={gradient.angle}
                className="modern-slider"
                onChange={(e) =>
                  onGradientChange({ ...gradient, angle: parseInt(e.target.value, 10) })
                }
              />
            </div>

            {/* Stop 1 & Stop 2 Pickers */}
            <div className="gradient-stops-row">
              {/* Start Stop */}
              <div className="gradient-stop-item">
                <span className="gradient-stop-label">Start Color</span>
                <div
                  className="color-input-badge"
                  onClick={() => stop1PickerRef.current?.click()}
                >
                  <div
                    className="color-picker-dot"
                    style={{ background: gradient.stops[0].color }}
                  />
                  <input
                    type="text"
                    className="color-hex-text"
                    value={gradient.stops[0].color}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onGradientChange({
                        ...gradient,
                        stops: [
                          { ...gradient.stops[0], color: e.target.value },
                          gradient.stops[1],
                        ],
                      })
                    }
                  />
                  <input
                    ref={stop1PickerRef}
                    type="color"
                    style={{ display: "none" }}
                    value={gradient.stops[0].color}
                    onChange={(e) =>
                      onGradientChange({
                        ...gradient,
                        stops: [
                          { ...gradient.stops[0], color: e.target.value },
                          gradient.stops[1],
                        ],
                      })
                    }
                  />
                </div>
              </div>

              {/* End Stop */}
              <div className="gradient-stop-item">
                <span className="gradient-stop-label">End Color</span>
                <div
                  className="color-input-badge"
                  onClick={() => stop2PickerRef.current?.click()}
                >
                  <div
                    className="color-picker-dot"
                    style={{ background: gradient.stops[1].color }}
                  />
                  <input
                    type="text"
                    className="color-hex-text"
                    value={gradient.stops[1].color}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onGradientChange({
                        ...gradient,
                        stops: [
                          gradient.stops[0],
                          { ...gradient.stops[1], color: e.target.value },
                        ],
                      })
                    }
                  />
                  <input
                    ref={stop2PickerRef}
                    type="color"
                    style={{ display: "none" }}
                    value={gradient.stops[1].color}
                    onChange={(e) =>
                      onGradientChange({
                        ...gradient,
                        stops: [
                          gradient.stops[0],
                          { ...gradient.stops[1], color: e.target.value },
                        ],
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: Image (Only when Image tab is active) ── */}
      {activeTab === "image" && (
        <div>
          <div className="studio-section-label">Custom Image</div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onBackdropUpload(file);
              }
            }}
          />
          <div
            className="custom-upload-box"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon-circle">
              <Upload size={16} />
            </div>
            <div className="upload-box-title">
              {backdropFileName || "Upload Image"}
            </div>
            <div className="upload-box-subtitle">JPG, PNG, WebP (Max 10MB)</div>
          </div>
        </div>
      )}

      {/* ── Section: RECENTLY USED (Always visible) ── */}
      {recentItems.length > 0 && (
        <div>
          <div className="studio-section-label">Recently Used</div>
          <div className="recently-used-row">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="recent-swatch-box"
                style={{
                  background:
                    item.type === "image" ? `url(${item.value}) center/cover` : item.value,
                }}
                onClick={() => onSelectRecent(item)}
                title={`Recent ${item.type}`}
              />
            ))}
            <button className="recent-chevron-btn" title="Scroll">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Section: ADJUSTMENTS (Always visible) ── */}
      <div>
        <div className="studio-section-label">Adjustments</div>
        <div className="adjustments-list">
          {/* Opacity */}
          <div className="adjustment-row">
            <div className="adjustment-left-label">
              <CircleDot size={14} color="#64748b" />
              <span>Opacity</span>
            </div>
            <div className="adjustment-slider-wrap">
              <input
                type="range"
                min="0"
                max="100"
                value={adjustments.opacity}
                className="modern-slider"
                onChange={(e) => updateAdjustment("opacity", parseInt(e.target.value, 10))}
              />
            </div>
            <div className="adjustment-value-pill">{adjustments.opacity}</div>
          </div>

          {/* Brightness */}
          <div className="adjustment-row">
            <div className="adjustment-left-label">
              <Sun size={14} color="#64748b" />
              <span>Brightness</span>
            </div>
            <div className="adjustment-slider-wrap">
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.brightness}
                className="modern-slider"
                onChange={(e) => updateAdjustment("brightness", parseInt(e.target.value, 10))}
              />
            </div>
            <div className="adjustment-value-pill">{adjustments.brightness - 100}</div>
          </div>

          {/* Saturation */}
          <div className="adjustment-row">
            <div className="adjustment-left-label">
              <Droplets size={14} color="#64748b" />
              <span>Saturation</span>
            </div>
            <div className="adjustment-slider-wrap">
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.saturation}
                className="modern-slider"
                onChange={(e) => updateAdjustment("saturation", parseInt(e.target.value, 10))}
              />
            </div>
            <div className="adjustment-value-pill">{adjustments.saturation - 100}</div>
          </div>

          {/* Contrast */}
          <div className="adjustment-row">
            <div className="adjustment-left-label">
              <Contrast size={14} color="#64748b" />
              <span>Contrast</span>
            </div>
            <div className="adjustment-slider-wrap">
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.contrast}
                className="modern-slider"
                onChange={(e) => updateAdjustment("contrast", parseInt(e.target.value, 10))}
              />
            </div>
            <div className="adjustment-value-pill">{adjustments.contrast - 100}</div>
          </div>
        </div>
      </div>

      {/* ── Section: Image Filters (Matching Image 1) ── */}
      <div>
        <div className="studio-section-label">Image Filters</div>
        <div className="filters-cards-row">
          {IMAGE_FILTERS.map((f) => (
            <button
              type="button"
              key={f.id}
              className={`filter-chip-card ${filter === f.id ? "active" : ""}`}
              onClick={() => onFilterChange(f.id)}
              title={f.label}
            >
              <div
                className="filter-chip-swatch"
                style={{ filter: f.css === "none" ? undefined : f.css }}
              />
              <span className="filter-chip-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
