import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection } from "../../app/slices/uiSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import { ResizeExportHeader } from "./components/ResizeExportHeader";
import { PresetTabs } from "./components/PresetTabs";
import { PresetList } from "./components/PresetList";
import { CustomSizeBox } from "./components/CustomSizeBox";
import { AdvancedOptionsPanel } from "./components/AdvancedOptionsPanel";
import { ResizePreviewCanvas } from "./components/ResizePreviewCanvas";
import { ExportFormatCards } from "./components/ExportFormatCards";
import { ExportSummaryCard } from "./components/ExportSummaryCard";
import { ResizeExportFooter } from "./components/ResizeExportFooter";
import {
  SOCIAL_PRESETS,
  ECOMMERCE_PRESETS,
  DESIGN_PRESETS,
} from "./data/presetsData";
import { renderResizeExport } from "./utils/resizeExportEngine";
import type {
  PresetCategory,
  SizePreset,
  ExportFormat,
  CompressionSettings,
  WatermarkSettings,
  CustomDimensions,
  ResizeFitMode,
} from "./types";
import { UploadCloud } from "lucide-react";
import "../../shared/styles/resize-export.css";

export function ResizeExportScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Source Image State ──
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number>(1080);
  const [originalHeight, setOriginalHeight] = useState<number>(1080);

  // ── Configuration State ──
  const [category, setCategory] = useState<PresetCategory>("social");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>("ig_post");
  const [targetWidth, setTargetWidth] = useState<number>(1080);
  const [targetHeight, setTargetHeight] = useState<number>(1080);
  const [fitMode, setFitMode] = useState<ResizeFitMode>("cover");

  const [customDimensions, setCustomDimensions] = useState<CustomDimensions>({
    width: 1080,
    height: 1080,
    locked: true,
    unit: "px",
  });

  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [compression, setCompression] = useState<CompressionSettings>({
    enabled: false,
    level: 0.72,
    mode: "balanced",
  });

  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: false,
    text: "DRAFT",
    opacity: 45,
    position: "bottom_right",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const selection = useAppSelector((s) => s.figma.selection);
  const lastSelectionKeyRef = useRef<string>("");
  const blobUrlRef = useRef<string | null>(null);

  // Clean up ObjectURL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // ── Auto-resize plugin window for 2-column studio layout on mount ──
  useEffect(() => {
    bridge.resizeWindow(680, 740);
    bridge.requestSelection();
    return () => {
      bridge.resizeWindow(400, 700);
    };
  }, [bridge]);

  // ── Auto-load & dynamically sync selected layer whenever selection changes on canvas ──
  useEffect(() => {
    if (!selection.hasSelection || isProcessing) return;
    const key = `${selection.id || selection.name}:${selection.width}x${selection.height}:${selection.pixelCount}:${selection.count}`;
    if (key === lastSelectionKeyRef.current) return;
    lastSelectionKeyRef.current = key;

    let isMounted = true;
    (async () => {
      try {
        const bytes = await bridge.exportSelectedImage();
        if (bytes && bytes.length > 0 && isMounted) {
          setImageBytes(bytes);
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setPreviewUrl(url);

          // Read image native dimensions
          const img = new Image();
          img.onload = () => {
            if (isMounted) {
              const naturalW = img.naturalWidth || selection.width || 1080;
              const naturalH = img.naturalHeight || selection.height || 1080;
              setOriginalWidth(naturalW);
              setOriginalHeight(naturalH);
              setCustomDimensions((prev) => ({
                ...prev,
                width: naturalW,
                height: naturalH,
              }));
              if (category === "custom") {
                setTargetWidth(naturalW);
                setTargetHeight(naturalH);
              }
            }
          };
          img.src = url;
        }
      } catch {
        // Selection wasn't exportable
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selection, bridge, category, isProcessing]);

  // Handle local file upload fallback
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        setImageBytes(bytes);
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: file.type }));
        blobUrlRef.current = url;
        setPreviewUrl(url);

        const img = new Image();
        img.onload = () => {
          setOriginalWidth(img.naturalWidth || 1080);
          setOriginalHeight(img.naturalHeight || 1080);
          setCustomDimensions((prev) => ({
            ...prev,
            width: img.naturalWidth || 1080,
            height: img.naturalHeight || 1080,
          }));
        };
        img.src = url;
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // ── Preset Selection ──
  const handleSelectPreset = (preset: SizePreset) => {
    setSelectedPresetId(preset.id);
    setTargetWidth(preset.width);
    setTargetHeight(preset.height);
  };

  const handleSelectCategory = (newCat: PresetCategory) => {
    setCategory(newCat);
    if (newCat === "custom") {
      setTargetWidth(customDimensions.width);
      setTargetHeight(customDimensions.height);
    } else if (newCat === "social") {
      handleSelectPreset(SOCIAL_PRESETS[0]);
    } else if (newCat === "ecommerce") {
      handleSelectPreset(ECOMMERCE_PRESETS[0]);
    } else if (newCat === "design") {
      handleSelectPreset(DESIGN_PRESETS[0]);
    }
  };

  // Update target size when custom dimensions change
  useEffect(() => {
    if (category === "custom") {
      setTargetWidth(customDimensions.width);
      setTargetHeight(customDimensions.height);
    }
  }, [category, customDimensions]);

  // ── Reset Handler ──
  const handleReset = () => {
    setCategory("social");
    handleSelectPreset(SOCIAL_PRESETS[0]);
    setExportFormat("png");
    setFitMode("cover");
    setCompression({ enabled: false, level: 0.72, mode: "balanced" });
    setWatermark({ enabled: false, text: "DRAFT", opacity: 45, position: "bottom_right" });
    bridge.notify("Settings reset to default.");
  };

  // ── Download Handler ──
  const handleDownload = async () => {
    if (!imageBytes) {
      bridge.notify("Please select or upload an image first.");
      return;
    }

    setIsProcessing(true);
    try {
      const outputBytes = await renderResizeExport({
        imageBytes,
        targetWidth,
        targetHeight,
        format: exportFormat,
        compression,
        watermark,
        fitMode,
      });

      const mimeType =
        exportFormat === "jpg"
          ? "image/jpeg"
          : exportFormat === "webp"
          ? "image/webp"
          : "image/png";

      const blob = new Blob([outputBytes as unknown as BlobPart], { type: mimeType });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `resized_${targetWidth}x${targetHeight}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      bridge.notify(`Saved resized_${targetWidth}x${targetHeight}.${exportFormat}`);
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Apply to Figma Handler ──
  const handleApplyToFigma = async () => {
    if (exportFormat === "webp") {
      bridge.notify("Figma canvas does not support WebP. Please download or choose PNG/JPG.");
      return;
    }
    if (!imageBytes) {
      bridge.notify("Please select or upload an image first.");
      return;
    }

    setIsProcessing(true);
    try {
      const outputBytes = await renderResizeExport({
        imageBytes,
        targetWidth,
        targetHeight,
        format: exportFormat,
        compression,
        watermark,
        fitMode,
      });

      bridge.insertResultImage(outputBytes);
      bridge.notify(`Applied ${targetWidth}×${targetHeight} image to Figma canvas.`);
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : "Apply to Figma failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const activePresetsList =
    category === "social"
      ? SOCIAL_PRESETS
      : category === "ecommerce"
      ? ECOMMERCE_PRESETS
      : category === "design"
      ? DESIGN_PRESETS
      : [];

  const originalAspectRatio =
    originalWidth > 0 && originalHeight > 0 ? originalWidth / originalHeight : 1;

  return (
    <div className="re-container">
      <ResizeExportHeader
        onBack={() => {
          bridge.resizeWindow(400, 700);
          dispatch(setSection("features"));
        }}
        onHelp={() =>
          bridge.notify(
            "Select size presets or enter custom dimensions, adjust compression/watermark, and export."
          )
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="re-body">
        {/* Quick upload prompt with smooth collapsible transition */}
        <div className={`re-banner-collapsible ${imageBytes ? "collapsed" : "expanded"}`}>
          <div
            className="batch-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="batch-dropzone-icon">
              <UploadCloud size={24} />
            </div>
            <div className="batch-dropzone-title">Select a layer or upload an image</div>
            <div className="batch-dropzone-sub">
              Select an image layer on Figma canvas, or click to upload from computer
            </div>
          </div>
        </div>

        <div className="re-layout-grid">
          {/* ── Left Column: Presets & Controls ── */}
          <div className="re-left-col">
            <div className="re-section-title">Size Presets</div>
            <PresetTabs
              activeCategory={category}
              onSelectCategory={handleSelectCategory}
            />

            {/* If preset category: show preset cards */}
            {category !== "custom" && (
              <PresetList
                presets={activePresetsList}
                selectedPresetId={selectedPresetId}
                onSelectPreset={handleSelectPreset}
              />
            )}

            {/* If Custom category: show custom size box */}
            {category === "custom" && (
              <CustomSizeBox
                dimensions={customDimensions}
                originalAspectRatio={originalAspectRatio}
                onChange={setCustomDimensions}
              />
            )}

            <AdvancedOptionsPanel
              exportFormat={exportFormat}
              compression={compression}
              watermark={watermark}
              onChangeCompression={setCompression}
              onChangeWatermark={setWatermark}
            />
          </div>

          {/* ── Right Column: Preview & Output ── */}
          <div className="re-right-col">
            <ResizePreviewCanvas
              previewUrl={previewUrl}
              targetWidth={targetWidth}
              targetHeight={targetHeight}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              watermark={watermark}
              fitMode={fitMode}
              onChangeFitMode={setFitMode}
            />

            <ExportFormatCards
              selectedFormat={exportFormat}
              onSelectFormat={setExportFormat}
            />

            <ExportSummaryCard
              width={targetWidth}
              height={targetHeight}
              format={exportFormat}
              compression={compression}
              imageBytes={imageBytes}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
            />
          </div>
        </div>
      </div>

      <ResizeExportFooter
        isProcessing={isProcessing}
        isApplyDisabled={exportFormat === "webp"}
        applyDisabledReason="WebP is download-only (Figma canvas does not support WebP)"
        onReset={handleReset}
        onDownload={handleDownload}
        onApplyToFigma={handleApplyToFigma}
      />
    </div>
  );
}
