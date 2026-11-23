import { StudioSlider } from "../components/StudioSlider";
import type { FilterConfig, FilterPresetId } from "../types";

interface Props {
  filter: FilterConfig;
  previewUrl: string | null;
  onChange: (filter: FilterConfig) => void;
  onCommit: (filter?: FilterConfig) => void;
}

export interface FilterDef {
  id: FilterPresetId;
  label: string;
}

export const FILTER_PRESETS: FilterDef[] = [
  { id: "original", label: "Original" },
  { id: "vivid", label: "Vivid" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "bright", label: "Bright" },
  { id: "dramatic", label: "Dramatic" },
  { id: "bw", label: "B&W" },
  { id: "vintage", label: "Vintage" },
  { id: "crisp", label: "Crisp" },
];

/**
 * Generates valid CSS filter string for Canvas 2D and HTML styles
 * scaled smoothly by strength (0 to 100).
 */
export function getFilterCss(id: FilterPresetId, strength: number = 100): string {
  if (id === "original") return "";
  const t = Math.max(0, Math.min(100, typeof strength === "number" ? strength : 100)) / 100;
  if (t <= 0) return "";

  switch (id) {
    case "vivid": {
      // Saturation 100% -> 200%, Contrast 100% -> 120%
      const s = Math.round(100 + 100 * t);
      const c = Math.round(100 + 20 * t);
      return `saturate(${s}%) contrast(${c}%)`;
    }
    case "warm": {
      // Golden sepia warmth + saturation boost
      const sep = Math.round(45 * t);
      const s = Math.round(100 + 40 * t);
      const b = Math.round(100 + 5 * t);
      return `sepia(${sep}%) saturate(${s}%) brightness(${b}%)`;
    }
    case "cool": {
      // Crisp blue / cool tint using hue-rotate + slight saturation
      const deg = Math.round(190 * t);
      const s = Math.round(100 + 30 * t);
      return `hue-rotate(${deg}deg) saturate(${s}%)`;
    }
    case "bright": {
      // High-key clean brightness boost
      const b = Math.round(100 + 35 * t);
      const c = Math.round(100 + 10 * t);
      return `brightness(${b}%) contrast(${c}%)`;
    }
    case "dramatic": {
      // Heavy cinematic contrast with deep shadows
      const c = Math.round(100 + 55 * t);
      const b = Math.round(100 - 10 * t);
      const s = Math.round(100 + 25 * t);
      return `contrast(${c}%) brightness(${b}%) saturate(${s}%)`;
    }
    case "bw": {
      // Black & White grayscale + contrast punch
      const g = Math.round(100 * t);
      const c = Math.round(100 + 15 * t);
      return `grayscale(${g}%) contrast(${c}%)`;
    }
    case "vintage": {
      // Nostalgic retro film tone
      const sep = Math.round(60 * t);
      const c = Math.round(100 - 12 * t);
      const b = Math.round(100 + 6 * t);
      return `sepia(${sep}%) contrast(${c}%) brightness(${b}%)`;
    }
    case "crisp": {
      // Sharpened clarity with contrast and saturation punch
      const c = Math.round(100 + 35 * t);
      const b = Math.round(100 + 5 * t);
      const s = Math.round(100 + 15 * t);
      return `contrast(${c}%) brightness(${b}%) saturate(${s}%)`;
    }
    default:
      return "";
  }
}

export function FiltersTab({ filter, previewUrl, onChange, onCommit }: Props) {
  const safeFilter: FilterConfig = {
    id: filter?.id || "original",
    strength: typeof filter?.strength === "number" ? filter.strength : 100,
  };

  const handleSelect = (id: FilterPresetId) => {
    const strength = id === "original" ? 100 : (safeFilter.strength === 0 ? 100 : safeFilter.strength);
    const updated = { id, strength };
    onChange(updated);
    onCommit(updated);
  };

  const handleStrengthChange = (strength: number) => {
    const updated = { ...safeFilter, strength };
    onChange(updated);
  };

  const handleStrengthCommit = (strength: number) => {
    const updated = { ...safeFilter, strength };
    onChange(updated);
    onCommit(updated);
  };

  return (
    <div className="edit-studio-tab-panel edit-studio-tab-panel-filters">
      {/* Horizontal Carousel of Filters */}
      <div className="edit-studio-filters-carousel">
        {FILTER_PRESETS.map((preset) => {
          const isSelected = safeFilter.id === preset.id;
          const thumbFilter = getFilterCss(preset.id, 100);
          return (
            <button
              key={preset.id}
              type="button"
              className={`edit-studio-filter-item ${isSelected ? "selected" : ""}`}
              onClick={() => handleSelect(preset.id)}
            >
              <div
                className="edit-studio-filter-thumb"
                style={{
                  backgroundImage: previewUrl ? `url(${previewUrl})` : undefined,
                  filter: thumbFilter || undefined,
                }}
              />
              <span className="edit-studio-filter-name">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Strength Slider */}
      {safeFilter.id !== "original" && (
        <div className="edit-studio-slider-row" style={{ marginTop: 2 }}>
          <div className="edit-studio-slider-label">
            <span>Strength</span>
            <span className="edit-studio-slider-value">{safeFilter.strength}%</span>
          </div>
          <StudioSlider
            min={0}
            max={100}
            value={safeFilter.strength}
            onChange={handleStrengthChange}
            onCommit={handleStrengthCommit}
            ariaLabel="Filter strength"
          />
        </div>
      )}
    </div>
  );
}
