import { useState, useEffect, useRef, useCallback } from "react";
import { Image as ImageIcon, AlertCircle, Loader, CheckCircle2, ZoomIn, ZoomOut, Download, Sparkles, Expand } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection } from "../../app/slices/uiSlice";
import type { SelectionNodeRef } from "../../shared/types/messages";
import { ImageViewerModal } from "../../shared/components/modals/ImageViewerModal";
import { ToolboxNavTabs, ToolboxTabId } from "./tabs/ToolboxNavTabs";
import { BackgroundTab } from "./tabs/BackgroundTab";
import { AdjustTab } from "./tabs/AdjustTab";
import { SizeTab } from "./tabs/SizeTab";
import { InfoTab } from "./tabs/InfoTab";
import { checkImageHasTransparency, detectTransparencyFromUrl } from "../../shared/utils/transparency";

interface Props {
  onApplyAdjustments: (
    b: number, c: number, s: number,
    opacity?: number,
    backgroundPreset?: string,
    imageFilterPreset?: string,
    customBgBytes?: Uint8Array
  ) => void;
  onResize?: (w: number, h: number) => void;
  listSelection?: () => Promise<SelectionNodeRef[]>;
  exportNode?: (id: string) => Promise<Uint8Array>;
  insertResultImage?: (bytes: Uint8Array) => void;
  notify: (msg: string) => void;
  onRemoveBackground?: () => Promise<boolean>;
}

type PresetId =
  | "transparent" | "white" | "sand" | "gradient" | "steel"
  | "shadow" | "wood" | "sky" | "lavender" | "mint" | string;

type ImageFilterId =
  | "normal" | "grayscale" | "sepia" | "vivid" | "cool" | "warm";

// ── Image filter definitions ──────────────────────────────────────────────────
interface ImageFilterDef {
  id: ImageFilterId;
  label: string;
  /** CSS filter applied to the preview <img> for instant visual feedback */
  css: string;
}

const IMAGE_FILTERS: ImageFilterDef[] = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "grayscale", label: "B&W", css: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", css: "sepia(80%)" },
  { id: "vivid", label: "Vivid", css: "saturate(180%) contrast(1.1)" },
  { id: "cool", label: "Cool", css: "hue-rotate(200deg) saturate(120%)" },
  { id: "warm", label: "Warm", css: "sepia(30%) saturate(130%)" },
];

// ── Background CSS helper ─────────────────────────────────────────────────────
function getPreviewBgStyle(preset: PresetId, customBgUrl?: string | null): React.CSSProperties {
  if (preset === "custom-image" && customBgUrl) {
    return {
      backgroundImage: `url(${customBgUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
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
    case "white": return { background: "#ffffff" };
    case "sand": return { background: "#f5e6d3" };
    case "gradient": return { background: "linear-gradient(180deg, #6c47ff, #ec4899)" };
    case "steel": return { background: "#9ca3af" };
    case "shadow": return { background: "#ffffff" };
    case "wood": return { background: "#8B5A2B" };
    case "sky": return { background: "#87CEEB" };
    case "lavender": return { background: "#E6E6FA" };
    case "mint": return { background: "#bdfcc9" };
    default: return { background: "transparent" };
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

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ── Canvas composite helper for Downloads & Upload insertions ─────────────────
async function compositeToolboxImage({
  imageUrl,
  width,
  height,
  preset,
  customBgUrl,
  brightness,
  contrast,
  saturation,
  opacity,
  filterCss,
}: {
  imageUrl: string;
  width?: number;
  height?: number;
  preset: PresetId;
  customBgUrl?: string | null;
  brightness: number;
  contrast: number;
  saturation: number;
  opacity: number;
  filterCss?: string;
}): Promise<{ dataUrl: string; bytes: Uint8Array }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const fgImg = new Image();
  fgImg.crossOrigin = "anonymous";
  fgImg.src = imageUrl;

  let bgImg: HTMLImageElement | null = null;
  if (preset === "custom-image" && customBgUrl) {
    bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.src = customBgUrl;
  }

  const loadPromises: Promise<unknown>[] = [
    new Promise((resolve, reject) => {
      if (fgImg.complete && fgImg.naturalWidth > 0) resolve(null);
      else { fgImg.onload = resolve; fgImg.onerror = reject; }
    }),
  ];
  if (bgImg) {
    loadPromises.push(
      new Promise((resolve, reject) => {
        if (bgImg!.complete && bgImg!.naturalWidth > 0) resolve(null);
        else { bgImg!.onload = resolve; bgImg!.onerror = reject; }
      })
    );
  }
  await Promise.all(loadPromises);

  const w = width || fgImg.naturalWidth || 1024;
  const h = height || fgImg.naturalHeight || 1024;
  canvas.width = w;
  canvas.height = h;

  // 1. Draw Background
  if (preset === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "black" || preset === "#000000") {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "sand") {
    ctx.fillStyle = "#f5e6d3";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "wood") {
    ctx.fillStyle = "#8B5A2B";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "sky") {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "lavender") {
    ctx.fillStyle = "#E6E6FA";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "mint") {
    ctx.fillStyle = "#bdfcc9";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "steel") {
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "gradient") {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#6c47ff");
    grad.addColorStop(1, "#ec4899");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "shadow") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "custom-image" && bgImg) {
    ctx.drawImage(bgImg, 0, 0, w, h);
  } else if (preset.startsWith("#")) {
    ctx.fillStyle = preset;
    ctx.fillRect(0, 0, w, h);
  }
  // If "transparent", do nothing (canvas remains transparent)

  // 2. Draw Foreground with adjustments
  ctx.save();
  ctx.globalAlpha = opacity / 100;

  const filterTokens: string[] = [];
  if (brightness !== 50) filterTokens.push(`brightness(${brightness / 50})`);
  if (contrast !== 50) filterTokens.push(`contrast(${contrast / 50})`);
  if (saturation !== 50) filterTokens.push(`saturate(${saturation / 50})`);
  if (filterCss && filterCss !== "none") filterTokens.push(filterCss);
  if (preset === "shadow") filterTokens.push("drop-shadow(0 12px 24px rgba(0,0,0,0.25))");

  if (filterTokens.length > 0) {
    ctx.filter = filterTokens.join(" ");
  }

  ctx.drawImage(fgImg, 0, 0, w, h);
  ctx.restore();

  const dataUrl = canvas.toDataURL("image/png");
  const base64Data = dataUrl.split(",")[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return { dataUrl, bytes };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ToolboxScreen({
  onApplyAdjustments,
  onResize,
  listSelection: _listSelection,
  exportNode: _exportNode,
  insertResultImage: _insertResultImage,
  notify,
  onRemoveBackground,
}: Props) {
  const dispatch = useAppDispatch();
  const { selection, previewUrl, originalUrl, imageFormat, uploadedImage, activeImageSource } = useAppSelector(s => s.figma);
  const currentUrl = (activeImageSource === "upload" && uploadedImage)
    ? uploadedImage.previewUrl
    : (activeImageSource === "canvas" && selection.hasSelection ? previewUrl : null);
  const currentOriginalUrl = (activeImageSource === "upload" && uploadedImage)
    ? (uploadedImage.originalPreviewUrl || uploadedImage.previewUrl)
    : (activeImageSource === "canvas" && selection.hasSelection ? (originalUrl || previewUrl) : null);

  const [activeTab, setActiveTab] = useState<ToolboxTabId>("background");
  const [activePreview, setActivePreview] = useState<"result" | "original">("result");
  const [activePreset, setActivePreset] = useState<PresetId>("transparent");
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [customBgBytes, setCustomBgBytes] = useState<Uint8Array | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);

  // Pan offset — only active when zoom > 100
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const [opacity, setOpacity] = useState(100);
  const [brightness, setBrightness] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [contrast, setContrast] = useState(50);

  const [activeFilter, setActiveFilter] = useState<ImageFilterId>("normal");

  const [isApplying, setIsApplying] = useState(false);
  const [hasTransparency, setHasTransparency] = useState<boolean>(true);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);

  const sessionOriginalRef = useRef<string | null>(null);

  // Deduplicated palette — starts as fallback, populated from image on load
  const [colors, setColors] = useState<string[]>(FALLBACK_COLORS.slice(0, 10));
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Credits calculation
  const planStatus = useAppSelector(s => s.status.data);
  const PLAN_LIMITS: Record<string, number> = { free: 3, starter: 50, pro: 200 };
  const plan = planStatus?.plan ?? "free";
  const totalAllotted = PLAN_LIMITS[plan] ?? 3;
  const spendable = !planStatus ? 0 : (planStatus.credits + (plan === "pro" ? planStatus.topupCreditsPro : planStatus.topupCreditsStarter));
  const creditsRemaining = spendable;
  const creditsUsed = Math.max(0, totalAllotted - spendable);

  // File size calculation
  const [fileSizeStr, setFileSizeStr] = useState<string>("—");

  useEffect(() => {
    let isMounted = true;
    const targetUrl = currentUrl || currentOriginalUrl;

    if (!targetUrl) {
      if (selection.hasSelection && selection.width && selection.height) {
        const est = Math.round(selection.width * selection.height * 0.4);
        setFileSizeStr(`~${formatBytes(est)}`);
      } else {
        setFileSizeStr("—");
      }
      return;
    }

    fetch(targetUrl)
      .then(res => res.blob())
      .then(blob => {
        if (isMounted) {
          setFileSizeStr(formatBytes(blob.size));
        }
      })
      .catch(() => {
        if (isMounted) {
          if (selection.hasSelection && selection.width && selection.height) {
            const est = Math.round(selection.width * selection.height * 0.4);
            setFileSizeStr(`~${formatBytes(est)}`);
          } else {
            setFileSizeStr("—");
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUrl, currentOriginalUrl, selection]);

  // Reset editor settings, zoom, pan & session original when selection or source changes
  useEffect(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
    sessionOriginalRef.current = null;
    setActivePreset("transparent");
    setActiveColor(null);
    setActivePreview("result");
    setOpacity(100);
    setBrightness(50);
    setSaturation(50);
    setContrast(50);
    setActiveFilter("normal");
    setActiveTab("background");
    if (customBgUrl) URL.revokeObjectURL(customBgUrl);
    setCustomBgUrl(null);
    setCustomBgBytes(null);
    if (!selection.hasSelection && !uploadedImage) {
      setHasTransparency(true);
    }
  }, [selection, activeImageSource, uploadedImage?.previewUrl]);

  // Reset pan when zoom snaps back to 100
  useEffect(() => {
    if (zoom === 100) setPan({ x: 0, y: 0 });
  }, [zoom]);

  // Clear applying flag when new currentUrl arrives
  useEffect(() => {
    if (currentUrl) setIsApplying(false);
  }, [currentUrl]);

  // Auto-capture session original on first currentUrl per selection
  useEffect(() => {
    if (currentUrl && !sessionOriginalRef.current) {
      sessionOriginalRef.current = currentUrl;
    } else if (!currentUrl) {
      sessionOriginalRef.current = null;
    }
  }, [currentUrl]);

  // Auto-detect transparency when currentUrl updates
  useEffect(() => {
    if (currentUrl) {
      let isMounted = true;
      detectTransparencyFromUrl(currentUrl).then(hasT => {
        if (isMounted) setHasTransparency(hasT);
      });
      return () => {
        isMounted = false;
      };
    } else {
      setHasTransparency(true);
    }
  }, [currentUrl]);

  // Extract & deduplicate colours and check transparency when image loads
  const runExtract = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    const extracted = extractDominantColors(img, 10);
    setColors(extracted);
    setActiveColor(null);
    try {
      const isTransparent = checkImageHasTransparency(img);
      setHasTransparency(isTransparent);
    } catch {
      // Don't arbitrarily force true if check fails
    }
  }, []);

  const handleRemoveBgInToolbox = async () => {
    if (!onRemoveBackground) return;
    setIsRemovingBg(true);
    try {
      const success = await onRemoveBackground();
      if (success) {
        notify("Background removed successfully!");
      }
    } catch {
      notify("Failed to remove background.");
    } finally {
      setIsRemovingBg(false);
    }
  };

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

  const canApply = selection.hasSelection || !!uploadedImage;

  async function handleApply() {
    if (!canApply) { notify("Select a layer first."); return; }
    setIsApplying(true);
    try {
      if (!selection.hasSelection && uploadedImage) {
        if (_insertResultImage && currentUrl) {
          const { bytes } = await compositeToolboxImage({
            imageUrl: currentUrl,
            width: uploadedImage.width,
            height: uploadedImage.height,
            preset: activePreset,
            customBgUrl,
            brightness,
            contrast,
            saturation,
            opacity,
            filterCss: namedFilterCss,
          });
          _insertResultImage(bytes);
          notify("Inserted image with adjustments onto Figma canvas.");
          setIsApplying(false);
          return;
        }
      }

      onApplyAdjustments(
        brightness, contrast, saturation, opacity, activePreset, activeFilter,
        activePreset === "custom-image" && customBgBytes ? customBgBytes : undefined
      );
    } catch {
      notify("Failed to apply adjustments.");
      setIsApplying(false);
    }
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

  const effectiveOriginalUrl = currentOriginalUrl ?? sessionOriginalRef.current ?? currentUrl;

  const currentFilter = IMAGE_FILTERS.find(f => f.id === activeFilter);
  const namedFilterCss = currentFilter?.css && currentFilter.css !== "none" ? currentFilter.css : "";

  // 50 is neutral (1.0 = 100%)
  const cssBrightness = brightness / 50;
  const cssContrast = contrast / 50;
  const cssSaturation = saturation / 50;
  const cssOpacity = opacity / 100;

  const filterTokens: string[] = [];
  if (brightness !== 50) filterTokens.push(`brightness(${cssBrightness})`);
  if (contrast !== 50) filterTokens.push(`contrast(${cssContrast})`);
  if (saturation !== 50) filterTokens.push(`saturate(${cssSaturation})`);
  if (namedFilterCss) filterTokens.push(namedFilterCss);
  if (activePreset === "shadow") filterTokens.push("drop-shadow(0 10px 20px rgba(0,0,0,0.22))");

  const combinedImgFilter = filterTokens.length > 0 ? filterTokens.join(" ") : "none";

  // Clamp pan so the image never fully leaves the viewport (based on zoom level)
  // Max sensible offset in each axis = container size × (scale − 1) / 2
  // We can't know exact container size here, so clamp loosely at ±600px
  const MAX_PAN = 600 * ((zoom / 100) - 1);
  const clampedPan = zoom > 100
    ? { x: Math.max(-MAX_PAN, Math.min(MAX_PAN, pan.x)), y: Math.max(-MAX_PAN, Math.min(MAX_PAN, pan.y)) }
    : { x: 0, y: 0 };

  // Instant Download
  const handleInstatDownlod = async () => {
    if (!currentUrl) {
      notify("No image available to download.");
      return;
    }
    const rawName = (activeImageSource === "upload" && uploadedImage) ? uploadedImage.name : (selection.hasSelection ? selection.name : "removed_background");
    const cleanName = rawName.replace(/[/\\?%*:|"<>]/g, "-").trim() || "removed_background";

    let downloadHref = currentUrl;

    try {
      const { dataUrl } = await compositeToolboxImage({
        imageUrl: currentUrl,
        preset: activePreset,
        customBgUrl,
        brightness,
        contrast,
        saturation,
        opacity,
        filterCss: namedFilterCss,
      });
      downloadHref = dataUrl;
    } catch {
      downloadHref = currentUrl;
    }

    const link = document.createElement("a");
    link.href = downloadHref;
    link.download = `${cleanName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify(`Saved as ${cleanName}.png`);
  };

  return (
    <>
      <div className="pane-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          onClick={() => dispatch(setSection("features"))}
          style={{ background: "none", border: "none", color: "var(--c-text)", cursor: "pointer", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center" }}
          title="Back to Home">
          ←
        </button>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--c-text)", margin: 0 }}>Remove Background</h2>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", margin: 0 }}>Preview and Refine your result</p>
        </div>
      </div>

      <div className="pane-body">

        {/* ── Editor Canvas ──────────────────────────────────── */}
        <div className="toolbox-preview" onDoubleClick={handlePreviewDoubleClick}>
          {currentUrl ? (
            <>
              {/* Background layer */}
              <div
                className="toolbox-preview-bg"
                style={getPreviewBgStyle(activePreview === "original" ? "transparent" : activePreset, customBgUrl)}
              />

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
                  src={(activePreview === "original"
                    ? (effectiveOriginalUrl ?? currentUrl)
                    : currentUrl) || undefined}
                  alt="Preview"
                  crossOrigin="anonymous"
                  draggable={false}
                  onLoad={e => runExtract(e.currentTarget)}
                  onError={() => {
                    if (activePreview === "original") {
                      setActivePreview("result");
                    }
                  }}
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
                    transition: isDragging ? "none" : "transform 0.2s, filter 0.1s, opacity 0.1s",
                    filter: activePreview === "result" ? combinedImgFilter : "none",
                    opacity: activePreview === "result" ? cssOpacity : 1,
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

              {/* Status tag — top-left */}
              <div
                className="toolbox-preview-status"
                style={
                  activePreview === "original" || !hasTransparency
                    ? {
                        background: "#fffbeb",
                        borderColor: "#fde68a",
                        color: "#d97706",
                      }
                    : undefined
                }
              >
                {activePreview === "result" && hasTransparency ? (
                  <>
                    <CheckCircle2 size={13} className="toolbox-status-icon" />
                    <span>Background Removed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} style={{ color: "#d97706" }} />
                    <span>Original Image</span>
                  </>
                )}
              </div>

              {/* Before / After toggle — top-right */}
              <div className="toolbox-preview-toggle">
                <button
                  className={`preview-toggle-btn ${activePreview === "original" ? "active" : ""}`}
                  onClick={() => setActivePreview("original")}
                >
                  Before
                </button>
                <button
                  className={`preview-toggle-btn ${activePreview === "result" ? "active" : ""}`}
                  onClick={() => setActivePreview("result")}
                >
                  After
                </button>
              </div>

              {/* Zoom bar — bottom-center */}
              <div className="toolbox-preview-zoom">
                <button
                  onClick={() => setZoom(z => Math.max(25, z - 10))}
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span
                  title="Click to reset zoom"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={handlePreviewDoubleClick}
                >
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(300, z + 10))}
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <div className="zoom-divider" />
                <button
                  type="button"
                  onClick={() => setIsFullViewOpen(true)}
                  title="Full View"
                  aria-label="Full View"
                >
                  <Expand size={13} />
                </button>
              </div>
            </>
          ) : (
            <div className="toolbox-preview-empty">
              <ImageIcon size={28} color="var(--c-text-4)" />
              <span>Preview renders here</span>
              {activeImageSource === "canvas" && !selection.hasSelection && (
                <span style={{ fontSize: "10px", color: "var(--c-text-4)" }}>Select a layer first</span>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation Tabs ──────────────────────────────── */}
        <ToolboxNavTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        {/* ── Tab Panes ─────────────────────────────────────── */}
        {activeTab === "background" && (
          <div style={{ position: "relative" }}>
            {!hasTransparency && !!currentUrl && (
              <div className="toolbox-unlock-bg-wrap">
                <button
                  type="button"
                  disabled={isRemovingBg}
                  onClick={handleRemoveBgInToolbox}
                  className="toolbox-unlock-bg-btn"
                >
                  {isRemovingBg ? (
                    <>
                      <Loader size={16} className="toolbox-applying-spinner" />
                      <span>Removing Background…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Remove Background (1 Credit)</span>
                    </>
                  )}
                </button>

                <div className="toolbox-unlock-bg-hint">
                  <AlertCircle size={14} style={{ color: "var(--brand, #6c47ff)", flexShrink: 0 }} />
                  <span>Remove the existing background first to unlock backdrops and colors.</span>
                </div>
              </div>
            )}

            <div
              style={
                !hasTransparency && !!currentUrl
                  ? {
                      opacity: 0.45,
                      pointerEvents: "none",
                      userSelect: "none",
                      filter: "grayscale(30%)",
                    }
                  : undefined
              }
            >
              <BackgroundTab
                activePreset={activePreset}
                onSelectPreset={handlePresetClick}
                activeColor={activeColor}
                onSelectColor={handleColorClick}
                colors={colors}
                onRefreshColors={handleRefreshColors}
                notify={notify}
                customBgUrl={customBgUrl}
                onCustomImageSelected={(url, bytes) => {
                  setCustomBgUrl(url);
                  setCustomBgBytes(bytes);
                  setActivePreset("custom-image");
                  setActiveColor(null);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === "adjust" && (
          <AdjustTab
            opacity={opacity}
            setOpacity={setOpacity}
            brightness={brightness}
            setBrightness={setBrightness}
            saturation={saturation}
            setSaturation={setSaturation}
            contrast={contrast}
            setContrast={setContrast}
            onReset={() => {
              setOpacity(100);
              setBrightness(50);
              setSaturation(50);
              setContrast(50);
            }}
          />
        )}

        {activeTab === "size" && (
          <SizeTab
            currentWidth={selection.hasSelection ? selection.width : (uploadedImage?.width || 1024)}
            currentHeight={selection.hasSelection ? selection.height : (uploadedImage?.height || 1024)}
            onResize={onResize}
            notify={notify}
          />
        )}

        {activeTab === "info" && (
          <InfoTab
            width={selection.hasSelection ? selection.width : (uploadedImage?.width || 1024)}
            height={selection.hasSelection ? selection.height : (uploadedImage?.height || 1024)}
            fileSize={fileSizeStr}
            format={imageFormat || "PNG"}
            creditsRemaining={creditsRemaining}
            creditsUsed={creditsUsed}
            plan={plan}
          />
        )}

        {/* ── Image Filters ─────────────────────────────────── */}
        {activeTab !== "info" && (
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
        )}

        {/* ── Apply button ──────────────────────────────────── */}
        <div className="toolbox-footer">
          {!canApply && (
            <div className="toolbox-no-selection-warn">
              <AlertCircle size={12} />
              <span>Select a layer to apply changes</span>
            </div>
          )}
          <div className="toolbox-footer-actions">
            <button
              type="button"
              className="btn-download"
              onClick={handleInstatDownlod}
              disabled={!currentUrl}
              title="Download transparent image"
            >
              <Download size={14} />
              <span>Download</span>
            </button>

            <button
              type="button"
              className="btn-apply-figma"
              onClick={handleApply}
              disabled={!canApply || isApplying}
            >
              {isApplying ? (
                <>
                  <Loader size={14} style={{ animation: "toolbox-spin 0.7s linear infinite" }} />
                  <span>Applying…</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{selection.hasSelection ? "Apply to Figma" : "Insert to Figma"}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      <ImageViewerModal
        isOpen={isFullViewOpen}
        onClose={() => setIsFullViewOpen(false)}
        imageUrl={activePreview === "original" ? (effectiveOriginalUrl ?? currentUrl) : currentUrl}
        bgStyle={getPreviewBgStyle(activePreset, customBgUrl)}
        filterCss={activePreview === "result" ? combinedImgFilter : "none"}
        opacity={activePreview === "result" ? cssOpacity : 1}
        onDownload={handleInstatDownlod}
      />
    </>
  );
}
