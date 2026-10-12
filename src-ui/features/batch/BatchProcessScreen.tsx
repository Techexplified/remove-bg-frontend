import { useState, useCallback, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection } from "../../app/slices/uiSlice";
import { deductCredits } from "../../app/slices/statusSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import { BatchHeader } from "./components/BatchHeader";
import { BatchDropzone } from "./components/BatchDropzone";
import { BatchImageGrid } from "./components/BatchImageGrid";
import { BatchSettingsPanel } from "./components/BatchSettingsPanel";
import { BatchFooter } from "./components/BatchFooter";
import { exportBatchAsZip } from "./utils/zipExporter";
import { processBatchQueue } from "./utils/batchProcessor";
import type { BatchItem, BatchSettings } from "./types";
import "../../shared/styles/batch.css";

export function BatchProcessScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();

  const [items, setItems] = useState<BatchItem[]>([]);
  const [settings, setSettings] = useState<BatchSettings>({
    removeBackground: true,
    background: "transparent",
    resize: "original",
    exportFormat: "png",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");

  const planStatus = useAppSelector(s => s.status.data);
  const spendableCredits = !planStatus ? 0 : (planStatus.credits + (planStatus.plan === "pro" ? planStatus.topupCreditsPro : planStatus.topupCreditsStarter));

  // Clean up ObjectURLs when unmounting
  const itemsRef = useRef<BatchItem[]>([]);
  itemsRef.current = items;
  useEffect(() => {
    return () => {
      itemsRef.current.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.resultPreviewUrl) URL.revokeObjectURL(item.resultPreviewUrl);
      });
    };
  }, []);

  // ── Import from local files ──────────────────────────────────────────────
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newItems: BatchItem[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `file_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
        name: file.name,
        originalBytes: bytes,
        previewUrl,
        selected: true,
        status: "idle",
      });
    }
    setItems(prev => [...prev, ...newItems].slice(0, 50));
    bridge.notify(`Added ${newItems.length} images.`);
  }, [bridge]);

  // ── Import from Figma canvas selection ───────────────────────────────────
  const handleSelectFromCanvas = useCallback(async () => {
    try {
      const layers = await bridge.exportSelectionBatch();
      if (!layers || layers.length === 0) {
        bridge.notify("Select exportable layers on Figma canvas first.");
        return;
      }
      const newItems: BatchItem[] = layers.map(layer => {
        const blob = new Blob([layer.bytes as unknown as BlobPart], { type: "image/png" });
        const previewUrl = URL.createObjectURL(blob);
        return {
          id: `canvas_${layer.id}_${Date.now()}`,
          name: layer.name,
          originalBytes: layer.bytes,
          previewUrl,
          selected: true,
          status: "idle",
          width: layer.width,
          height: layer.height,
        };
      });
      setItems(prev => [...prev, ...newItems].slice(0, 50));
      bridge.notify(`Imported ${newItems.length} layers from canvas.`);
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : "Couldn't import from canvas.");
    }
  }, [bridge]);

  // ── Card actions ─────────────────────────────────────────────────────────
  const handleToggleSelect = useCallback((id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => {
      const target = prev.find(i => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.resultPreviewUrl) URL.revokeObjectURL(target.resultPreviewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const handleReset = useCallback(() => {
    items.forEach(i => {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
      if (i.resultPreviewUrl) URL.revokeObjectURL(i.resultPreviewUrl);
    });
    setItems([]);
  }, [items]);

  // ── Process & Output Actions ─────────────────────────────────────────────
  const selectedItems = items.filter(i => i.selected);
  const creditCost = settings.removeBackground ? selectedItems.length : 0;
  const hasCompletedResults = items.some(i => i.status === "done" && i.resultBytes);

  const handleProcess = async () => {
    if (selectedItems.length === 0) return;
    if (settings.removeBackground && spendableCredits < creditCost) {
      bridge.notify(`Not enough credits. You need ${creditCost} credits.`);
      return;
    }

    setIsProcessing(true);
    try {
      await processBatchQueue({
        items,
        settings,
        setItems,
        setProgressText,
        notify: bridge.notify,
        onCreditDeduct: () => {
          if (settings.removeBackground) {
            dispatch(deductCredits(1));
          }
        },
      });
    } catch (e) {
      bridge.notify(e instanceof Error ? e.message : "Batch processing error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const handlePlaceOnCanvas = () => {
    const completed = items.filter(i => i.status === "done" && i.resultBytes);
    if (completed.length === 0) return;
    bridge.insertBatchResultImages(completed.map(i => ({ name: i.name, bytes: i.resultBytes! })));
  };

  const handleDownloadZip = async () => {
    const completed = items.filter(i => i.status === "done" && i.resultBytes);
    if (completed.length === 0) return;
    await exportBatchAsZip(completed.map(i => ({ name: i.name, bytes: i.resultBytes!, format: settings.exportFormat })));
    bridge.notify(`Downloaded ${completed.length} images as ZIP.`);
  };

  return (
    <div className="batch-container">
      <BatchHeader
        onBack={() => dispatch(setSection("features"))}
        onHowItWorks={() => bridge.notify("Upload up to 50 images, customize settings, and process in bulk.")}
        creditsRemaining={spendableCredits}
      />

      <div className="batch-body">
        <BatchDropzone
          onFilesSelected={handleFilesSelected}
          onSelectFromCanvas={handleSelectFromCanvas}
        />

        <BatchImageGrid
          items={items}
          onToggleSelect={handleToggleSelect}
          onRemoveItem={handleRemoveItem}
          onClearAll={handleReset}
        />

        <BatchSettingsPanel
          settings={settings}
          onChangeSettings={setSettings}
        />
      </div>

      <BatchFooter
        selectedCount={selectedItems.length}
        creditCost={creditCost}
        isProcessing={isProcessing}
        progressText={progressText}
        hasCompletedResults={hasCompletedResults}
        onReset={handleReset}
        onProcess={handleProcess}
        onDownloadZip={handleDownloadZip}
        onPlaceOnCanvas={handlePlaceOnCanvas}
      />
    </div>
  );
}
