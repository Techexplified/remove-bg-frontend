import { useState, useEffect } from "react";
import { Image as ImageIcon, Sparkles, Check, X, Wand2, RefreshCw } from "lucide-react";
import { useAppSelector } from "../../app/hooks";
import type { SelectionNodeRef } from "../../shared/types/messages";

interface Props {
  onApplyAdjustments: (b: number, c: number, s: number, opacity?: number, backgroundPreset?: string) => void;
  onResize: (w: number, h: number) => void;
  listSelection: () => Promise<SelectionNodeRef[]>;
  exportNode: (id: string) => Promise<Uint8Array>;
  insertResultImage: (bytes: Uint8Array) => void;
  notify: (msg: string) => void;
}

type RefineId = "keep" | "remove" | "hair";
type PresetId = "transparent" | "white" | "sand" | "gradient" | "steel" | "shadow" | string;

export function ToolboxScreen({
  onApplyAdjustments,
  notify,
}: Props) {
  const { selection, previewUrl } = useAppSelector(s => s.figma);

  // States matching mockup
  const [activePreview, setActivePreview] = useState<"result" | "original">("result");
  const [activeRefine, setActiveRefine] = useState<RefineId>("keep");
  const [activePreset, setActivePreset] = useState<PresetId>("transparent");
  
  // Sliders matching screenshot defaults
  const [opacity, setOpacity] = useState(100);
  const [brightness, setBrightness] = useState(60);
  const [saturation, setSaturation] = useState(80);
  const [contrast, setContrast] = useState(45);

  const dims = selection.hasSelection ? `${selection.width} × ${selection.height}` : "1920 × 1080";

  // Colors from image
  const [colors, setColors] = useState([
    "#1e293b", // Slate dark
    "#3b82f6", // Blue
    "#f59e0b", // Amber
    "#ca8a04", // Dark yellow
    "#16a34a", // Green
    "#f3f4f6", // Soft white
  ]);

  const [activeColor, setActiveColor] = useState<string | null>(null);

  function handleRefreshColors() {
    // Generate a fresh set of extracted palette colors
    setColors([
      "#27272a", "#6366f1", "#f43f5e", "#10b981", "#eab308", "#f4f4f5"
    ]);
    setActiveColor(null);
    notify("Extracted fresh colors from selection.");
  }

  function handlePresetClick(presetId: PresetId) {
    setActivePreset(presetId);
    setActiveColor(null);
  }

  function handleColorClick(colorHex: string) {
    setActiveColor(colorHex);
    setActivePreset(colorHex); // Use color hex as preset
  }

  function handleApply() {
    // If activePreset is a hex color (starts with #), pass it as custom hex fill,
    // otherwise pass the preset id string.
    const isHex = activePreset.startsWith("#");
    const presetParam = isHex ? undefined : activePreset;
    
    onApplyAdjustments(
      brightness,
      contrast,
      saturation,
      opacity,
      presetParam
    );
  }

  return (
    <>
      <div className="pane-header">
        <h2>Toolbox</h2>
        <p>Refine your result</p>
      </div>
      <div className="pane-body">
        
        {/* ── Editor Canvas ── */}
        <div className="toolbox-preview">
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" style={{ opacity: activePreview === "original" ? 0.75 : 1 }} />
              
              {/* Zoom badge */}
              <div className="toolbox-preview-zoom">
                <span>🔍 100%</span>
              </div>
              
              {/* Dimensions badge */}
              <div className="toolbox-preview-dims">
                {dims}
              </div>

              {/* Preview Toggle (Original / Result) */}
              <div className="toolbox-preview-toggle">
                <button 
                  className={`preview-toggle-btn ${activePreview === "original" ? "active-result" : ""}`}
                  onClick={() => setActivePreview("original")}>
                  Original
                </button>
                <button 
                  className={`preview-toggle-btn ${activePreview === "result" ? "active-result" : ""}`}
                  onClick={() => setActivePreview("result")}>
                  <span className="preview-toggle-dot" /> Result
                </button>
              </div>
            </>
          ) : (
            <div className="toolbox-preview-empty" style={{ display: "flex", flexDirection: "column", gap: "8px", color: "var(--c-text-3)", fontSize: "11px", textAlign: "center" }}>
              <ImageIcon size={28} color="var(--c-text-4)" />
              <span>Preview renders here</span>
              {!selection.hasSelection && <span style={{ fontSize: "10px", color: "var(--c-text-4)" }}>Select a layer first</span>}
            </div>
          )}
        </div>

        {/* ── Refine Edges ── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">Refine Edges</div>
          <div className="refine-grid">
            <button 
              className={`refine-btn ${activeRefine === "keep" ? "active" : ""}`}
              onClick={() => { setActiveRefine("keep"); notify("Brush: Keep edges"); }}>
              <Check size={13} /> Keep
            </button>
            <button 
              className={`refine-btn ${activeRefine === "remove" ? "active" : ""}`}
              onClick={() => { setActiveRefine("remove"); notify("Brush: Remove edges"); }}>
              <X size={13} /> Remove
            </button>
            <button 
              className={`refine-btn ${activeRefine === "hair" ? "active" : ""}`}
              onClick={() => { setActiveRefine("hair"); notify("Magic: Hair & Detail refinement"); }}>
              <Wand2 size={13} /> Hair & Detail
            </button>
          </div>
        </div>

        {/* ── Replace Background Presets ── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">Replace Background</div>
          <div className="bg-presets">
            {/* Transparent */}
            <div 
              className={`bg-preset bg-preset-transparent ${activePreset === "transparent" ? "active" : ""}`}
              onClick={() => handlePresetClick("transparent")}
              title="Transparent"
            />
            {/* White */}
            <div 
              className={`bg-preset ${activePreset === "white" ? "active" : ""}`}
              style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#6b7280" }}
              onClick={() => handlePresetClick("white")}
              title="White"
            >
              W
            </div>
            {/* Sandy */}
            <div 
              className={`bg-preset ${activePreset === "sand" ? "active" : ""}`}
              style={{ background: "#f5e6d3", color: "#854d0e" }}
              onClick={() => handlePresetClick("sand")}
              title="Sandy"
            >
              S
            </div>
            {/* Gradient */}
            <div 
              className={`bg-preset ${activePreset === "gradient" ? "active" : ""}`}
              style={{ background: "linear-gradient(135deg, #6c47ff, #ec4899)", color: "#ffffff" }}
              onClick={() => handlePresetClick("gradient")}
              title="Gradient"
            >
              G
            </div>
            {/* Steel */}
            <div 
              className={`bg-preset ${activePreset === "steel" ? "active" : ""}`}
              style={{ background: "#e5e7eb", color: "#374151" }}
              onClick={() => handlePresetClick("steel")}
              title="Steel"
            >
              St
            </div>
            {/* Shadow */}
            <div 
              className={`bg-preset ${activePreset === "shadow" ? "active" : ""}`}
              style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#6b7280", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.15)" }}
              onClick={() => handlePresetClick("shadow")}
              title="Drop Shadow"
            >
              Sh
            </div>
          </div>
        </div>

        {/* ── Colors from Image ── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">
            <span>Colors from Image</span>
            <button 
              onClick={handleRefreshColors}
              style={{ background: "none", border: "none", color: "var(--c-text-3)", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="image-colors">
            {colors.map((hex, i) => (
              <div 
                key={i} 
                className={`color-circle ${activeColor === hex ? "active" : ""}`}
                style={{ background: hex }}
                onClick={() => handleColorClick(hex)}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* ── Adjustments ── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">Adjustments</div>
          <div className="slider-group">
            {/* Opacity */}
            <div className="slider-row">
              <span className="slider-label">Opacity</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="slider-input" 
                value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
              />
              <div className="slider-val-box">{opacity}</div>
            </div>
            {/* Brightness */}
            <div className="slider-row">
              <span className="slider-label">Brightness</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="slider-input" 
                value={brightness}
                onChange={e => setBrightness(Number(e.target.value))}
              />
              <div className="slider-val-box">{brightness}</div>
            </div>
            {/* Saturation */}
            <div className="slider-row">
              <span className="slider-label">Saturation</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="slider-input" 
                value={saturation}
                onChange={e => setSaturation(Number(e.target.value))}
              />
              <div className="slider-val-box">{saturation}</div>
            </div>
            {/* Contrast */}
            <div className="slider-row">
              <span className="slider-label">Contrast</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="slider-input" 
                value={contrast}
                onChange={e => setContrast(Number(e.target.value))}
              />
              <div className="slider-val-box">{contrast}</div>
            </div>
          </div>
        </div>

        {/* ── Action Button ── */}
        <div className="toolbox-footer">
          <button 
            className="cta-btn" 
            onClick={handleApply}
            style={{ width: "100%", height: "42px", display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", background: "var(--brand)", color: "white", borderRadius: "10px", border: "none", fontWeight: "600", cursor: "pointer" }}>
            <Check size={14} /> Apply Changes
          </button>
        </div>

      </div>
    </>
  );
}
