import { useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { addToast, setSection, setPreviewReturnSection, openModal } from "../../app/slices/uiSlice";
import { deductCredits, refundCredits } from "../../app/slices/statusSlice";
import { runFeature, ApiError } from "../../shared/api/client";
import { removeBackgroundLocal } from "../../shared/utils/fallbackRemoval";
import { generateThumbnailDataUrl } from "../../shared/utils/thumbnailHelper";
import type { HistoryMetaItem } from "../../shared/types/messages";
import {
  setEditingImage,
  setOriginalUrl,
  setPreviewUrl,
  setUploadedImage,
  setBatchResultItems,
} from "../../app/slices/figmaSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import { HomeHeader } from "./components/HomeHeader";
import { HomeEmptyState } from "./components/HomeEmptyState";
import { HomeSinglePreview } from "./components/HomeSinglePreview";
import { HomeMultiPreviewGrid } from "./components/HomeMultiPreviewGrid";
import { HomeActionBar } from "./components/HomeActionBar";
import { ProcessingModal } from "../preview/components/ProcessingModal";
import type { SelectedImageItem, HomeViewMode } from "./types";
import "../../shared/styles/v2/home.css";

const MAX_BATCH_ITEMS = 15;

export function HomeScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redux state
  const { selection } = useAppSelector((s) => s.figma);
  const status = useAppSelector((s) => s.status.data);

  // Spendable credits calculation
  const plan = status?.plan ?? "free";
  const spendable = !status
    ? 3
    : status.credits + (plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter);
  const isOutOfCredits = spendable === 0;

  // ── Unified Staging Tray (Aggregates Canvas + Local Uploads up to 15 items) ──
  const [stagedItems, setStagedItems] = useState<SelectedImageItem[]>([]);
  const stagedItemsRef = useRef(stagedItems);
  stagedItemsRef.current = stagedItems;

  // Processing state for single image simulation
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingThumb, setProcessingThumb] = useState<string | null>(null);

  // ── Explicit Insert From Figma Canvas ──
  // User selects layer(s) on canvas and clicks "Insert from canvas"
  const handleInsertFromCanvas = useCallback(() => {
    if (!selection.hasSelection || selection.count === 0) {
      dispatch(
        addToast({
          id: `toast_no_sel_${Date.now()}`,
          kind: "warning",
          title: "No layer selected",
          message: "Please select one or more image layers in Figma first.",
        })
      );
      return;
    }

    const currentCount = stagedItemsRef.current.length;
    if (currentCount >= MAX_BATCH_ITEMS) {
      dispatch(
        addToast({
          id: `toast_max_${Date.now()}`,
          kind: "warning",
          title: "Batch limit reached",
          message: `Maximum ${MAX_BATCH_ITEMS} images in batch.`,
        })
      );
      return;
    }

    // STRICT THRESHOLD BLOCKING:
    // If incoming count + currentCount > 15, block the ENTIRE action
    if (currentCount + selection.count > MAX_BATCH_ITEMS) {
      dispatch(
        addToast({
          id: `toast_exceed_limit_${Date.now()}`,
          kind: "warning",
          title: "Exceeds batch limit",
          message: `Cannot add ${selection.count} image${selection.count > 1 ? "s" : ""}. You have ${currentCount} selected (limit is ${MAX_BATCH_ITEMS}).`,
        })
      );
      return;
    }

    if (selection.count === 1 && selection.id) {
      const layerName = selection.name || "Canvas Layer";
      const layerW = selection.width;
      const layerH = selection.height;

      bridge
        .exportNode(selection.id)
        .then((bytes) => {
          const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
          const dedicatedUrl = URL.createObjectURL(blob);
          const canvasId = `canvas_${selection.id}_${Date.now()}`;

          setStagedItems((prev) => {
            if (prev.length >= MAX_BATCH_ITEMS) return prev;
            return [
              ...prev,
              {
                id: canvasId,
                nodeId: selection.id,
                name: layerName,
                previewUrl: dedicatedUrl,
                source: "canvas",
                width: layerW,
                height: layerH,
                bytes,
              },
            ];
          });

          dispatch(
            addToast({
              id: `toast_add_single_${Date.now()}`,
              kind: "success",
              title: "Layer added",
              message: `Added "${layerName}" from canvas.`,
            })
          );
        })
        .catch((err) => {
          console.warn("Failed to export single canvas node", err);
          dispatch(
            addToast({
              id: `toast_err_export_${Date.now()}`,
              kind: "error",
              title: "Export failed",
              message: "Could not export selected layer from Figma.",
            })
          );
        });
    } else if (selection.count > 1) {
      bridge
        .exportSelectionBatch()
        .then((batch) => {
          if (batch.length === 0) {
            dispatch(
              addToast({
                id: `toast_empty_batch_${Date.now()}`,
                kind: "warning",
                title: "No exportable layers",
                message: "Selected layers could not be exported.",
              })
            );
            return;
          }

          const newItems: SelectedImageItem[] = batch.map((b) => {
            const blob = new Blob([b.bytes as unknown as BlobPart], { type: "image/png" });
            return {
              id: `canvas_${b.id}_${Date.now()}`,
              nodeId: b.id,
              name: b.name,
              previewUrl: URL.createObjectURL(blob),
              source: "canvas",
              width: b.width,
              height: b.height,
              bytes: b.bytes,
            };
          });

          setStagedItems((prev) => [...prev, ...newItems]);

          dispatch(
            addToast({
              id: `toast_add_multi_${Date.now()}`,
              kind: "success",
              title: "Layers added",
              message: `Added ${newItems.length} layers from canvas.`,
            })
          );
        })
        .catch((err) => {
          console.warn("Failed to export batch selection", err);
          dispatch(
            addToast({
              id: `toast_err_batch_${Date.now()}`,
              kind: "error",
              title: "Export failed",
              message: "Failed to export layers from canvas.",
            })
          );
        });
    }
  }, [selection, bridge, dispatch]);

  // ── File Upload Handler (Supports multiple files from disk with Strict Blocking) ──
  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const validFiles = Array.from(fileList).filter((f) =>
        f.type.match(/^image\/(png|jpe?g|webp)$/)
      );

      if (validFiles.length === 0) {
        dispatch(
          addToast({
            id: `toast_invalid_format_${Date.now()}`,
            kind: "warning",
            title: "Unsupported format",
            message: "Please choose PNG, JPEG, or WebP images.",
          })
        );
        return;
      }

      const currentCount = stagedItemsRef.current.length;
      if (currentCount >= MAX_BATCH_ITEMS) {
        dispatch(
          addToast({
            id: `toast_max_${Date.now()}`,
            kind: "warning",
            title: "Batch limit reached",
            message: `Maximum ${MAX_BATCH_ITEMS} images allowed.`,
          })
        );
        return;
      }

      // STRICT THRESHOLD BLOCKING:
      if (currentCount + validFiles.length > MAX_BATCH_ITEMS) {
        dispatch(
          addToast({
            id: `toast_exceed_upload_${Date.now()}`,
            kind: "warning",
            title: "Exceeds batch limit",
            message: `Cannot upload ${validFiles.length} file${validFiles.length > 1 ? "s" : ""}. You have ${currentCount} selected (limit is ${MAX_BATCH_ITEMS}).`,
          })
        );
        return;
      }

      const newUploads: SelectedImageItem[] = [];
      for (const file of validFiles) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const blobUrl = URL.createObjectURL(file);
        newUploads.push({
          id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          previewUrl: blobUrl,
          source: "upload",
          bytes,
        });
      }

      setStagedItems((prev) => [...prev, ...newUploads]);
    },
    [dispatch]
  );

  // ── Remove single item from tray ──
  const handleRemoveItem = useCallback((id: string) => {
    setStagedItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target && target.previewUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  // ── Clear all items from tray ──
  const handleClearAll = useCallback(() => {
    setStagedItems((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(item.previewUrl);
          } catch {
            /* ignore */
          }
        }
      });
      return [];
    });
  }, []);

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  // ── Action Handlers ──
  const handleRemoveBgClick = () => {
    if (spendable < 1) {
      if (status?.plan === "free") {
        dispatch(openModal({ kind: "plan_picker", context: "out_of_credits" }));
      } else {
        dispatch(openModal({ kind: "topup" }));
      }
      return;
    }

    if (stagedItems.length === 0) return;

    if (stagedItems.length === 1) {
      const item = stagedItems[0];
      setProcessingThumb(item.previewUrl);
      setIsProcessing(true);

      // Optimistically deduct 1 credit immediately so UI reflects consumption without delay
      dispatch(deductCredits(1));

      (async () => {
        try {
          let inputBytes = item.bytes;
          if (!inputBytes || inputBytes.length === 0) {
            const resp = await fetch(item.previewUrl);
            inputBytes = new Uint8Array(await resp.arrayBuffer());
          }

          let cutoutBytes: Uint8Array;
          if (status?.credits && status.credits < 1 && status.plan === "pro") {
            cutoutBytes = await removeBackgroundLocal(inputBytes);
          } else {
            cutoutBytes = await runFeature("remove_bg_basic", inputBytes);
          }

          const blob = new Blob([cutoutBytes as unknown as BlobPart], { type: "image/png" });
          const cutoutUrl = URL.createObjectURL(blob);

          // Save cutout to history with compact thumbnail and in-memory full-res cache
          const thumbnailDataUrl = await generateThumbnailDataUrl(cutoutBytes);
          const histItem: HistoryMetaItem = {
            id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: item.name || "Cutout",
            timestamp: Date.now(),
            width: item.width,
            height: item.height,
            format: "PNG",
            source: item.source || "upload",
            nodeId: item.nodeId,
            thumbnailDataUrl,
          };
          bridge.saveHistoryItem(histItem, cutoutBytes);

          dispatch(setOriginalUrl(item.previewUrl));
          dispatch(setPreviewUrl(cutoutUrl));
          dispatch(setPreviewReturnSection("features"));
          dispatch(
            setUploadedImage({
              name: item.name,
              previewUrl: cutoutUrl,
              bytes: cutoutBytes,
              width: item.width,
              height: item.height,
              originalPreviewUrl: item.previewUrl,
              originalBytes: inputBytes,
              source: item.source || "upload",
              nodeId: item.nodeId,
            })
          );

          setIsProcessing(false);
          dispatch(setSection("preview"));
        } catch (err) {
          console.error("Background removal failed:", err);
          // Restore credit on failure
          dispatch(refundCredits(1));
          setIsProcessing(false);
          const msg =
            err instanceof ApiError ? err.message : "Failed to remove background. Please try again.";
          dispatch(
            addToast({
              id: `toast_err_rem_${Date.now()}`,
              kind: "error",
              title: "Removal Failed",
              message: msg,
            })
          );
        }
      })();
      return;
    }

    if (stagedItems.length >= 2) {
      if (spendable < stagedItems.length) {
        if (status?.plan === "free") {
          dispatch(openModal({ kind: "plan_picker", context: "out_of_credits" }));
        } else {
          dispatch(openModal({ kind: "topup" }));
        }
        dispatch(
          addToast({
            id: `toast_nocredits_batch_${Date.now()}`,
            kind: "warning",
            title: "Not enough credits",
            message: `You need ${stagedItems.length} credits to process this batch (you have ${spendable}).`,
          })
        );
        return;
      }

      // Optimistically deduct batch credits immediately so the header counter updates instantly
      dispatch(deductCredits(stagedItems.length));

      dispatch(
        setBatchResultItems(
          stagedItems.map((item) => ({
            id: item.id,
            nodeId: item.nodeId,
            name: item.name,
            previewUrl: item.previewUrl,
            bytes: item.bytes || new Uint8Array(),
            width: item.width,
            height: item.height,
            source: item.source || "upload",
            status: "waiting",
            resultUrl: undefined,
            resultBytes: undefined,
          }))
        )
      );
      dispatch(setSection("batch_results"));
      return;
    }
  };

  const handleEditClick = () => {
    if (stagedItems.length === 0) {
      dispatch(setEditingImage(null));
      dispatch(setSection("edit_studio"));
    } else if (stagedItems.length === 1) {
      const item = stagedItems[0];
      dispatch(
        setEditingImage({
          id: item.id,
          name: item.name,
          previewUrl: item.previewUrl,
          width: item.width,
          height: item.height,
          bytes: item.bytes,
        })
      );
      dispatch(setSection("edit_studio"));
    }
  };

  const handleHistoryClick = () => {
    dispatch(setSection("history"));
  };

  const handleProfileClick = () => {
    dispatch(setSection("settings"));
  };

  const handleCreditsClick = () => {
    if (status?.plan === "free") {
      dispatch(openModal({ kind: "plan_picker" }));
    } else {
      dispatch(openModal({ kind: "topup" }));
    }
  };

  const totalCount = stagedItems.length;
  const viewMode: HomeViewMode = totalCount === 0 ? "empty" : totalCount === 1 ? "single" : "multi";

  return (
    <div className="home-v2-container">
      {/* Hidden file input supporting multiple files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Top Header */}
      <HomeHeader
        creditsRemaining={spendable}
        onHistoryClick={handleHistoryClick}
        onProfileClick={handleProfileClick}
        onCreditsClick={handleCreditsClick}
      />

      {/* Title & Subtitle */}
      <div className="home-v2-titles-wrap">
        <h1 className="home-v2-main-title">Clean cutouts in one click</h1>
        <p className="home-v2-main-subtitle">
          Select one or more images in Figma, or drop them below.
        </p>
      </div>

      {/* Main Preview Area */}
      <main className="home-v2-content">
        {viewMode === "empty" && (
          <HomeEmptyState
            onUploadClick={handleOpenPicker}
            onInsertFromCanvas={handleInsertFromCanvas}
            onDropFiles={handleFiles}
          />
        )}

        {viewMode === "single" && (
          <HomeSinglePreview
            previewUrl={stagedItems[0].previewUrl}
            name={stagedItems[0].name}
            width={stagedItems[0].width}
            height={stagedItems[0].height}
            onRemove={() => handleRemoveItem(stagedItems[0].id)}
            onInsertFromCanvas={handleInsertFromCanvas}
            onUploadMore={handleOpenPicker}
          />
        )}

        {viewMode === "multi" && (
          <HomeMultiPreviewGrid
            items={stagedItems}
            onRemoveItem={handleRemoveItem}
            onClearAll={handleClearAll}
            onInsertFromCanvas={handleInsertFromCanvas}
            onUploadMore={handleOpenPicker}
          />
        )}
      </main>

      {/* Bottom Action Bar */}
      <footer className="home-v2-footer">
        <HomeActionBar
          count={totalCount}
          isOutOfCredits={isOutOfCredits}
          onRemoveBgClick={handleRemoveBgClick}
          onEditClick={handleEditClick}
        />
      </footer>

      {/* V2 Indeterminate Processing Modal Overlay */}
      <ProcessingModal
        isOpen={isProcessing}
        previewThumbUrl={processingThumb}
      />
    </div>
  );
}
