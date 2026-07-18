import { useState, useEffect, useRef, useCallback } from "react";
import { Image as ImageIcon, Check, RefreshCw, AlertCircle, Loader } from "lucide-react";
import { useAppSelector } from "../../app/hooks";
import type { SelectionNodeRef } from "../../shared/types/messages";

interface Props {
  onApplyAdjustments: (
    b: number, c: number, s: number,
    opacity?: number,
    backgroundPreset?: string,
    imageFilterPreset?: string
  ) => void;
  onResize: (w: number, h: number) => void;
  listSelection: () => Promise<SelectionNodeRef[]>;
  exportNode: (id: string) => Promise<Uint8Array>;
  insertResultImage: (bytes: Uint8Array) => void;
  notify: (msg: string) => void;
}

type PresetId =
  | "transparent" | "white" | "sand" | "gradient" | "steel"
  | "shadow" | "wood" | "sky" | "lavender" | "mint" | string;

type ImageFilterId =
  | "normal" | "grayscale" | "sepia" | "vivid" | "cool"
  | "warm" | "fade" | "matte" | "dramatic" | "retro";

// ── Image filter definitions ──────────────────────────────────────────────────
interface ImageFilterDef {
  id: ImageFilterId;
  label: string;
  /** CSS filter applied to the preview <img> for instant visual feedback */
  css: string;
}

const IMAGE_FILTERS: ImageFilterDef[] = [
  { id: "normal",    label: "Normal",   css: "none" },
  { id: "grayscale", label: "B&W",      css: "grayscale(100%)" },
  { id: "sepia",     label: "Sepia",    css: "sepia(80%)" },
  { id: "vivid",     label: "Vivid",    css: "saturate(180%) contrast(1.1)" },
  { id: "cool",      label: "Cool",     css: "hue-rotate(200deg) saturate(120%)" },
  { id: "warm",      label: "Warm",     css: "sepia(30%) saturate(130%)" },
  { id: "fade",      label: "Fade",     css: "brightness(1.1) contrast(0.8) saturate(0.8)" },
  { id: "matte",     label: "Matte",    css: "contrast(0.85) brightness(1.05) saturate(0.8)" },
  { id: "dramatic",  label: "Dramatic", css: "contrast(1.4) saturate(1.2) brightness(0.9)" },
  { id: "retro",     label: "Retro",    css: "sepia(40%) contrast(1.1) brightness(0.95) hue-rotate(350deg)" },
];

// ── Background CSS helper ─────────────────────────────────────────────────────
function getPreviewBgStyle(preset: PresetId): React.CSSProperties {
  if (preset.startsWith("#")) return { background: preset };
  switch (preset) {
    case "transparent":
      return {
        backgroundImage: [
          "linear-gradient(45deg, #e5e7eb 25%, transparent 25%)",
          "linear-gradient(-45deg, #e5e7eb 25%, transparent 25%)",
          "linear-gradient(45deg, transparent 75%, #e5e7eb 75%)",
          "linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
        ].join(", "),
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        backgroundColor: "#ffffff",
      };
    case "white":    return { background: "#ffffff" };
    case "sand":     return { background: "#f5e6d3" };
    case "gradient": return { background: "linear-gradient(180deg, #6c47ff, #ec4899)" };
    case "steel":    return { background: "#9ca3af" };
    case "shadow":   return { background: "#ffffff" };
    case "wood":     return { background: "#8B5A2B" };
    case "sky":      return { background: "#87CEEB" };
    case "lavender": return { background: "#E6E6FA" };
    case "mint":     return { background: "#bdfcc9" };
    default:         return { background: "transparent" };
  }
}

// ── Colour deduplication ──────────────────────────────────────────────────────
/** RGB distance between two hex colours. */
function colorDistance(a: string, b: string): number {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Remove colours that are perceptually too similar to any already-kept colour.
 *  Threshold ≈ 40 means colours must differ by at least ~16% across channels. */
function deduplicateColors(colors: string[], threshold = 40): string[] {
  const kept: string[] = [];
  for (const c of colors) {
    if (kept.every(k => colorDistance(c, k) >= threshold)) kept.push(c);
  }
  return kept;
}

// ── Colour extraction ─────────────────────────────────────────────────────────
const FALLBACK_COLORS = [
  "#1e293b", "#3b82f6", "#f59e0b", "#ca8a04", "#16a34a",
  "#f3f4f6", "#e11d48", "#0ea5e9", "#a855f7", "#22c55e",
];

function extractDominantColors(img: HTMLImageElement, count: number): string[] {
  try {
    const canvas = document.createElement("canvas");
    const SAMPLE = 120;
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
    const data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;

    const buckets: Record<number, { r: number; g: number; b: number; n: number }> = {};
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 32) continue;
      const r5 = data[i] >> 3;
      const g5 = data[i + 1] >> 3;
      const b5 = data[i + 2] >> 3;
      const key = (r5 << 10) | (g5 << 5) | b5;
      if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
      buckets[key].r += data[i];
      buckets[key].g += data[i + 1];
      buckets[key].b += data[i + 2];
      buckets[key].n++;
    }

    const raw = Object.values(buckets)
      .sort((a, b) => b.n - a.n)
      .slice(0, count * 4) // over-sample so dedup has enough candidates
      .map(({ r, g, b, n }) => {
        const rr = Math.round(r / n).toString(16).padStart(2, "0");
        const gg = Math.round(g / n).toString(16).padStart(2, "0");
        const bb = Math.round(b / n).toString(16).padStart(2, "0");
        return `#${rr}${gg}${bb}`;
      });

    if (raw.length === 0) throw new Error("empty");
    return deduplicateColors(raw, 40).slice(0, count);
  } catch {
    return FALLBACK_COLORS.slice(0, count);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ToolboxScreen({ onApplyAdjustments, notify }: Props) {
  const { selection, previewUrl, originalUrl } = useAppSelector(s => s.figma);

  const [activePreview, setActivePreview] = useState<"result" | "original">("result");
  const [activePreset, setActivePreset]   = useState<PresetId>("transparent");
  const [zoom, setZoom]                   = useState(100);

  // Pan offset — only active when zoom > 100
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const [opacity, setOpacity]       = useState(100);
  const [brightness, setBrightness] = useState(60);
  const [saturation, setSaturation] = useState(80);
  const [contrast, setContrast]     = useState(45);

  const [activeFilter, setActiveFilter] = useState<ImageFilterId>("normal");

  const [isApplying, setIsApplying] = useState(false);

  const sessionOriginalRef = useRef<string | null>(null);

  // Deduplicated palette — starts as fallback, populated from image on load
  const [colors, setColors] = useState<string[]>(FALLBACK_COLORS.slice(0, 10));
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const dims = selection.hasSelection
    ? `${selection.width} × ${selection.height}`
    : "–";

  // Reset zoom, pan & session original when selection changes
  useEffect(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
    sessionOriginalRef.current = null;
  }, [selection]);

  // Reset pan when zoom snaps back to 100
  useEffect(() => {
    if (zoom === 100) setPan({ x: 0, y: 0 });
  }, [zoom]);

  // Clear applying flag when new previewUrl arrives
  useEffect(() => {
    if (previewUrl) setIsApplying(false);
  }, [previewUrl]);

  // Auto-capture session original on first previewUrl per selection
  useEffect(() => {
    if (previewUrl && !sessionOriginalRef.current) {
      sessionOriginalRef.current = previewUrl;
    }
  }, [previewUrl]);

  // Extract & deduplicate colours when image loads
  const runExtract = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    const extracted = extractDominantColors(img, 10);
    setColors(extracted);
    setActiveColor(null);
  }, []);

  function handleRefreshColors() {
    if (imgRef.current) {
      const extracted = extractDominantColors(imgRef.current, 10);
      setColors(extracted);
      setActiveColor(null);
      notify("Extracted fresh colours from selection.");
    } else {
      notify("No image to sample — apply a change first.");
    }
  }

  function handlePresetClick(id: PresetId) {
    setActivePreset(id);
    setActiveColor(null);
  }

  function handleColorClick(hex: string) {
    setActiveColor(hex);
    setActivePreset(hex);
  }

  const canApply = selection.hasSelection;

  function handleApply() {
    if (!canApply) { notify("Select a layer first."); return; }
    onApplyAdjustments(brightness, contrast, saturation, opacity, activePreset, activeFilter);
    setIsApplying(true);
  }

  // ── Pan handlers (drag-to-pan when zoom > 100) ──────────────────────────────
  function handleWrapMouseDown(e: React.MouseEvent) {
    if (zoom <= 100) return;
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    setIsDragging(true);
  }
  function handleWrapMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
  }
  function handleWrapMouseUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
  }
  // Double-click preview → reset zoom + pan
  function handlePreviewDoubleClick() {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }

  const effectiveOriginalUrl = originalUrl ?? sessionOriginalRef.current ?? previewUrl;

  const currentFilter = IMAGE_FILTERS.find(f => f.id === activeFilter)!;
  const imgCssFilter  = currentFilter?.css ?? "none";

  // Clamp pan so the image never fully leaves the viewport (based on zoom level)
  // Max sensible offset in each axis = container size × (scale − 1) / 2
  // We can't know exact container size here, so clamp loosely at ±600px
  const MAX_PAN = 600 * ((zoom / 100) - 1);
  const clampedPan = zoom > 100
    ? { x: Math.max(-MAX_PAN, Math.min(MAX_PAN, pan.x)), y: Math.max(-MAX_PAN, Math.min(MAX_PAN, pan.y)) }
    : { x: 0, y: 0 };

  return (
    <>
      <div className="pane-header">
        <h2>Toolbox</h2>
        <p>Refine your result</p>
      </div>

      <div className="pane-body">

        {/* ── Editor Canvas ──────────────────────────────────── */}
        <div className="toolbox-preview" onDoubleClick={handlePreviewDoubleClick}>
          {previewUrl ? (
            <>
              {/* Background layer */}
              <div className="toolbox-preview-bg" style={getPreviewBgStyle(activePreset)} />

              {/* Image layer — drag-to-pan when zoom > 100 */}
              <div
                className="toolbox-preview-img-wrap"
                onMouseDown={handleWrapMouseDown}
                onMouseMove={handleWrapMouseMove}
                onMouseUp={handleWrapMouseUp}
                onMouseLeave={handleWrapMouseUp}
                style={{ cursor: zoom > 100 ? (isDragging ? "grabbing" : "grab") : "default" }}
              >
                <img
                  ref={imgRef}
                  src={activePreview === "original"
                    ? (effectiveOriginalUrl ?? previewUrl)
                    : previewUrl}
                  alt="Preview"
                  crossOrigin="anonymous"
                  draggable={false}
                  onLoad={e => runExtract(e.currentTarget)}
                  style={{
                    // Fill the full container — object-fit:contain letterboxes
                    // with background showing through, no black 10%/20% margins
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    userSelect: "none",
                    // Pan first (screen-space), then scale from centre
                    transform: `translate(${clampedPan.x}px, ${clampedPan.y}px) scale(${zoom / 100})`,
                    transformOrigin: "center center",
                    // Disable transition while dragging for instant response
                    transition: isDragging ? "none" : "transform 0.2s, filter 0.2s",
                    filter: activePreview === "result" ? imgCssFilter : "none",
                  }}
                />
              </div>

              {/* Applying overlay */}
              {isApplying && (
                <div className="toolbox-preview-applying">
                  <Loader size={20} style={{ animation: "toolbox-spin 0.7s linear infinite" }} />
                  <span>Applying…</span>
                </div>
              )}

              {/* Zoom — min 25%, max 300%; double-click hint */}
              <div className="toolbox-preview-zoom">
                <button onClick={() => setZoom(z => Math.max(25, z - 10))}>−</button>
                <span
                  title="Double-click preview to reset"
                  style={{ cursor: "pointer" }}
                  onClick={handlePreviewDoubleClick}
                >🔍 {zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(300, z + 10))}>+</button>
              </div>

              {/* Dims */}
              <div className="toolbox-preview-dims">{dims}</div>

              {/* Toggle */}
              <div className="toolbox-preview-toggle">
                <button
                  className={`preview-toggle-btn ${activePreview === "original" ? "active-result" : ""}`}
                  onClick={() => setActivePreview("original")}
                >Original</button>
                <button
                  className={`preview-toggle-btn ${activePreview === "result" ? "active-result" : ""}`}
                  onClick={() => setActivePreview("result")}
                >
                  <span className="preview-toggle-dot" /> Result
                </button>
              </div>
            </>
          ) : (
            <div className="toolbox-preview-empty">
              <ImageIcon size={28} color="var(--c-text-4)" />
              <span>Preview renders here</span>
              {!selection.hasSelection && (
                <span style={{ fontSize: "10px", color: "var(--c-text-4)" }}>Select a layer first</span>
              )}
            </div>
          )}
        </div>

        {/* ── Replace Background ────────────────────────────── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">Replace Background</div>
          <div className="bg-presets">
            {/* Transparent — checkerboard, no text */}
            <div
              className={`bg-preset bg-preset-transparent ${activePreset === "transparent" ? "active" : ""}`}
              onClick={() => handlePresetClick("transparent")}
              title="Transparent"
            />
            {/* All other presets — pure colour swatches, no text labels */}
            {[
              { id: "white",    bg: "#ffffff", border: "1px solid #e5e7eb" },
              { id: "sand",     bg: "#f5e6d3" },
              { id: "gradient", bg: "linear-gradient(180deg, #6c47ff, #ec4899)" },
              { id: "steel",    bg: "#9ca3af" },
              { id: "shadow",   bg: "#ffffff", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.15)" },
              { id: "wood",     bg: "#8B5A2B" },
              { id: "sky",      bg: "#87CEEB" },
              { id: "lavender", bg: "#E6E6FA", border: "1px solid #d6d6f5" },
              { id: "mint",     bg: "#bdfcc9", border: "1px solid #a0e8b0" },
            ].map(({ id, bg, border, boxShadow }) => (
              <div
                key={id}
                className={`bg-preset ${activePreset === id ? "active" : ""}`}
                style={{ background: bg, border: border ?? undefined, boxShadow: boxShadow ?? undefined }}
                onClick={() => handlePresetClick(id)}
                title={id.charAt(0).toUpperCase() + id.slice(1)}
              />
            ))}
          </div>
        </div>

        {/* ── Colors from Image ─────────────────────────────── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">
            <span>Colors from Image</span>
            <button
              onClick={handleRefreshColors}
              style={{ background: "none", border: "none", color: "var(--c-text-3)", cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Re-extract colors"
            >
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

        {/* ── Adjustments ───────────────────────────────────── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">Adjustments</div>
          <div className="slider-group">
            <div className="slider-row">
              <span className="slider-label">Opacity</span>
              <input type="range" min="0" max="100" className="slider-input" value={opacity}
                onChange={e => setOpacity(Number(e.target.value))} />
              <div className="slider-val-box">{opacity}</div>
            </div>
            <div className="slider-row">
              <span className="slider-label">Brightness</span>
              <input type="range" min="0" max="100" className="slider-input" value={brightness}
                onChange={e => setBrightness(Number(e.target.value))} />
              <div className="slider-val-box">{brightness}</div>
            </div>
            <div className="slider-row">
              <span className="slider-label">Saturation</span>
              <input type="range" min="0" max="100" className="slider-input" value={saturation}
                onChange={e => setSaturation(Number(e.target.value))} />
              <div className="slider-val-box">{saturation}</div>
            </div>
            <div className="slider-row">
              <span className="slider-label">Contrast</span>
              <input type="range" min="0" max="100" className="slider-input" value={contrast}
                onChange={e => setContrast(Number(e.target.value))} />
              <div className="slider-val-box">{contrast}</div>
            </div>
          </div>
        </div>

        {/* ── Image Filters ─────────────────────────────────── */}
        <div className="toolbox-section">
          <div className="toolbox-section-title">Image Filters</div>
          <div className="filter-row">
            {IMAGE_FILTERS.map(f => (
              <button
                key={f.id}
                className={`filter-chip ${activeFilter === f.id ? "active" : ""}`}
                onClick={() => setActiveFilter(f.id)}
                title={f.label}
              >
                {/* Mini colour preview strip to hint at the filter */}
                <div
                  className="filter-chip-swatch"
                  style={{ filter: f.css === "none" ? undefined : f.css }}
                />
                <span className="filter-chip-label">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Apply button ──────────────────────────────────── */}
        <div className="toolbox-footer">
          {!canApply && (
            <div className="toolbox-no-selection-warn">
              <AlertCircle size={12} />
              <span>Select a layer to apply changes</span>
            </div>
          )}
          <button
            className="cta-btn"
            onClick={handleApply}
            disabled={!canApply || isApplying}
            style={{
              width: "100%",
              height: "42px",
              display: "flex",
              gap: "6px",
              alignItems: "center",
              justifyContent: "center",
              background: canApply ? "var(--brand)" : "var(--c-border)",
              color: canApply ? "white" : "var(--c-text-3)",
              borderRadius: "10px",
              border: "none",
              fontWeight: "600",
              cursor: canApply ? "pointer" : "not-allowed",
              opacity: isApplying ? 0.7 : 1,
              transition: "all 0.15s",
            }}
          >
            {isApplying
              ? <><Loader size={14} style={{ animation: "toolbox-spin 0.7s linear infinite" }} /> Applying…</>
              : <><Check size={14} /> Apply Changes</>
            }
          </button>
        </div>

      </div>
    </>
  );
}
