import { useRef } from "react";
import { Plus, RefreshCw } from "lucide-react";

interface Props {
  activePreset: string;
  onSelectPreset: (presetId: string) => void;
  activeColor: string | null;
  onSelectColor: (hex: string) => void;
  colors: string[];
  onRefreshColors: () => void;
  notify?: (msg: string) => void;
  customBgUrl: string|null;
  onCustomImageSelected: (url: string, bytes: Uint8Array) => void;
}

export function BackgroundTab({
  activePreset,
  onSelectPreset,
  activeColor,
  onSelectColor,
  colors,
  onRefreshColors,
  notify: _notify,
  customBgUrl,
  onCustomImageSelected
}: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;

    const url = URL.createObjectURL(file);

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    onCustomImageSelected(url, bytes);
    e.target.value = "";
  }

  const handleCustomColorChange = (hex: string) => {
    onSelectColor(hex);
  };

  const handleOpenColorPicker = () => {
    if (colorInputRef.current) {
      if (typeof colorInputRef.current.showPicker === "function") {
        try {
          colorInputRef.current.showPicker();
          return;
        } catch {
          // fallback
        }
      }
      colorInputRef.current.click();
    }
  };

  const handleImageCardClick = () => {
    if(customBgUrl){
      onSelectPreset("custom-image");
    }else{
      fileInputRef.current?.click();
    }
  };

  // Predefined quick palette swatches
  const DEFAULT_QUICK_PALETTE = [
    "#ffffff",
    "#000000",
    "#9ca3af",
    "#f5e6d3",
    "#ef4444",
    "#0ea5e9",
    "#8b5cf6",
    "#10b981",
  ];

  // Combine extracted colors with default quick palette (deduplicated)
  const allQuickColors = Array.from(new Set([...colors, ...DEFAULT_QUICK_PALETTE]));

  return (
    <div className="tab-pane-content background-tab">
      {/* ── 6 Background Type Cards ── */}
      <div className="bg-type-grid">
        {/* 1. Transparent */}
        <button
          type="button"
          className={`bg-type-card ${activePreset === "transparent" ? "active" : ""}`}
          onClick={() => onSelectPreset("transparent")}
        >
          <div className="bg-type-card-preview checkerboard-preview" />
          <span className="bg-type-card-label">Transparent</span>
        </button>

        {/* 2. White */}
        <button
          type="button"
          className={`bg-type-card ${activePreset === "white" || activeColor === "#ffffff" ? "active" : ""}`}
          onClick={() => onSelectPreset("white")}
        >
          <div className="bg-type-card-preview" style={{ backgroundColor: "#ffffff" }} />
          <span className="bg-type-card-label">White</span>
        </button>

        {/* 3. Black */}
        <button
          type="button"
          className={`bg-type-card ${activePreset === "#000000" || activeColor === "#000000" ? "active" : ""}`}
          onClick={() => onSelectColor("#000000")}
        >
          <div className="bg-type-card-preview" style={{ backgroundColor: "#000000" }} />
          <span className="bg-type-card-label">Black</span>
        </button>

        {/* 4. Color (Color Wheel / Native Picker) */}
        <button
          type="button"
          className={`bg-type-card ${activeColor && activeColor !== "#ffffff" && activeColor !== "#000000" ? "active" : ""}`}
          onClick={handleOpenColorPicker}
          title="Choose custom color"
        >
          <div
            className="bg-type-card-preview color-wheel-preview"
            style={
              activeColor && activeColor !== "#ffffff" && activeColor !== "#000000"
                ? { backgroundColor: activeColor, backgroundImage: "none" }
                : undefined
            }
          />
          <span className="bg-type-card-label">Color</span>
        </button>

        {/* 5. Gradient */}
        <button
          type="button"
          className={`bg-type-card ${activePreset === "gradient" ? "active" : ""}`}
          onClick={() => onSelectPreset("gradient")}
        >
          <div
            className="bg-type-card-preview"
            style={{ background: "linear-gradient(135deg, #6c47ff, #ec4899)" }}
          />
          <span className="bg-type-card-label">Gradient</span>
        </button>

        {/* 6. Image */}
        <button
          type="button"
          className={`bg-type-card ${activePreset === "custom-image" ? "active" : ""}`}
          onClick={handleImageCardClick}
          onDoubleClick={() => fileInputRef.current?.click()}
          title={customBgUrl ? "Click to use image (double click to replace)" : "Upload custom background"}
        >
          <div
            className="bg-type-card-preview image-placeholder-preview"
            style={
              customBgUrl
                ? {
                    backgroundImage: `url(${customBgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!customBgUrl && <span className="coming-soon-pill">Upload</span>}
          </div>
          <span className="bg-type-card-label">Image</span>
        </button>
      </div>

      {/* Hidden File Input for Image Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Native Color Input anchored below the preview canvas to prevent covering the image */}
      <input
        ref={colorInputRef}
        type="color"
        style={{
          position: "absolute",
          top: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
          border: "none",
          padding: 0,
          margin: 0,
        }}
        value={activeColor || "#6c47ff"}
        onChange={e => handleCustomColorChange(e.target.value)}
      />

      {/* ── Quick Colors Row ── */}
      <div className="quick-colors-section">
        <div className="section-subtitle-row">
          <span className="section-subtitle">Quick Colors</span>
          <button
            type="button"
            className="icon-subtle-btn"
            onClick={onRefreshColors}
            title="Re-extract colors from image"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        <div className="quick-colors-row">
          {/* Transparent swatch */}
          <button
            type="button"
            className={`quick-color-circle checkerboard-circle ${activePreset === "transparent" ? "active" : ""}`}
            onClick={() => onSelectPreset("transparent")}
            title="Transparent"
          />

          {/* Color swatches */}
          {allQuickColors.slice(0, 8).map(hex => (
            <button
              key={hex}
              type="button"
              className={`quick-color-circle ${activeColor === hex ? "active" : ""}`}
              style={{ backgroundColor: hex }}
              onClick={() => onSelectColor(hex)}
              title={hex}
            />
          ))}

          {/* Plus button to add / pick custom color */}
          <button
            type="button"
            className="quick-color-circle add-color-circle"
            onClick={handleOpenColorPicker}
            title="Pick custom color"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
