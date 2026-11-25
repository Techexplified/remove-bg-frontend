import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Zap,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Download,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection, setPreviewReturnSection, addToast } from "../../app/slices/uiSlice";
import {
  setOriginalUrl,
  setPreviewUrl,
  setUploadedImage,
  updateBatchResultItemStatus,
  type BatchResultItem,
} from "../../app/slices/figmaSlice";
import { runFeature } from "../../shared/api/client";
import { removeBackgroundLocal } from "../../shared/utils/fallbackRemoval";
import { refundCredits } from "../../app/slices/statusSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import { exportBatchAsZip } from "./utils/zipExporter";
import "../../shared/styles/v2/batch_results.css";

export function BatchResultsScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();

  const status = useAppSelector((s) => s.status.data);
  const { batchResultItems } = useAppSelector((s) => s.figma);

  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Spendable credits calculation
  const plan = status?.plan ?? "free";
  const spendable = !status
    ? 3
    : status.credits + (plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter);

  // ── Concurrent Processing Worker Queue (Max 2 Parallel) ──
  const processingInitiatedRef = useRef(false);

  useEffect(() => {
    if (processingInitiatedRef.current) return;
    const itemsToProcess = batchResultItems.filter((i) => i.status === "waiting");
    if (itemsToProcess.length === 0) return;
    processingInitiatedRef.current = true;

    let cancelled = false;
    const CONCURRENCY = 2;
    let nextIndex = 0;

    async function processItem(item: BatchResultItem) {
      if (cancelled) return;

      dispatch(
        updateBatchResultItemStatus({
          id: item.id,
          status: "processing",
        })
      );

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

        if (cancelled) return;

        const blob = new Blob([cutoutBytes as unknown as BlobPart], { type: "image/png" });
        const resultUrl = URL.createObjectURL(blob);

        dispatch(
          updateBatchResultItemStatus({
            id: item.id,
            status: "done",
            resultUrl,
            resultBytes: cutoutBytes,
          })
        );
      } catch (err) {
        if (cancelled) return;
        console.error(`Error processing batch item ${item.name}:`, err);
        // Refund credit for this failed item
        dispatch(refundCredits(1));
        dispatch(
          updateBatchResultItemStatus({
            id: item.id,
            status: "error",
            errorMessage: err instanceof Error ? err.message : "Processing failed",
          })
        );
      }
    }

    async function worker() {
      while (nextIndex < itemsToProcess.length && !cancelled) {
        const item = itemsToProcess[nextIndex++];
        await processItem(item);
      }
    }

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, itemsToProcess.length) },
      () => worker()
    );

    Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [batchResultItems, dispatch, status]);

  const totalCount = batchResultItems.length;
  const isAllComplete =
    totalCount > 0 &&
    batchResultItems.every((item) => item.status === "done" || item.status === "error");
  const doneCount = batchResultItems.filter((i) => i.status === "done").length;

  // ── Navigation: Back to Home ──
  const handleBackToHome = () => {
    dispatch(setSection("features"));
  };

  // ── Navigation: Drill-down to Individual Image Preview ──
  const handleInspectItem = (item: BatchResultItem) => {
    // Generate fresh dedicated object URLs from bytes to guarantee validity across navigations
    let previewBlobUrl = item.resultUrl || item.previewUrl;
    let originalBlobUrl = item.previewUrl;

    if (item.resultBytes && item.resultBytes.length > 0) {
      previewBlobUrl = URL.createObjectURL(
        new Blob([item.resultBytes as unknown as BlobPart], { type: "image/png" })
      );
    } else if (item.bytes && item.bytes.length > 0) {
      previewBlobUrl = URL.createObjectURL(
        new Blob([item.bytes as unknown as BlobPart], { type: "image/png" })
      );
    }

    if (item.bytes && item.bytes.length > 0) {
      originalBlobUrl = URL.createObjectURL(
        new Blob([item.bytes as unknown as BlobPart], { type: "image/png" })
      );
    }

    dispatch(setOriginalUrl(originalBlobUrl));
    dispatch(setPreviewUrl(previewBlobUrl));
    dispatch(
      setUploadedImage({
        name: item.name,
        previewUrl: previewBlobUrl,
        bytes: item.resultBytes || item.bytes,
        width: item.width,
        height: item.height,
        originalPreviewUrl: originalBlobUrl,
        originalBytes: item.bytes,
        source: item.source,
        nodeId: item.nodeId,
      })
    );
    dispatch(setPreviewReturnSection("batch_results"));
    dispatch(setSection("preview"));
  };

  // ── Download All Processed Images as ZIP ──
  const handleDownloadZip = async () => {
    if (!isAllComplete || isDownloading) return;
    setIsDownloading(true);

    try {
      const itemsToZip = batchResultItems
        .filter((item) => item.status === "done" && (item.resultBytes || item.bytes))
        .map((item) => ({
          name: item.name,
          bytes: (item.resultBytes || item.bytes) as Uint8Array,
          format: "png",
        }));

      if (itemsToZip.length === 0) {
        throw new Error("No processed images available to download");
      }

      await exportBatchAsZip(itemsToZip);

      dispatch(
        addToast({
          id: `toast_zip_${Date.now()}`,
          kind: "success",
          title: "ZIP downloaded",
          message: `Exported ${itemsToZip.length} cutouts as a zip file.`,
        })
      );
    } catch (err) {
      console.warn("Failed to generate zip", err);
      dispatch(
        addToast({
          id: `toast_zip_err_${Date.now()}`,
          kind: "error",
          title: "Download failed",
          message: "Failed to download batch cutouts as ZIP.",
        })
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Apply All Processed Images onto Figma Canvas ──
  const handleApplyAll = async () => {
    if (!isAllComplete || isApplyingAll) return;
    setIsApplyingAll(true);

    try {
      const validItems = batchResultItems
        .filter((item) => item.status === "done" && (item.resultBytes || item.bytes))
        .map((item) => ({
          name: item.name,
          bytes: (item.resultBytes || item.bytes) as Uint8Array,
        }));

      if (validItems.length === 0) {
        throw new Error("No processed cutouts to place on canvas");
      }

      bridge.insertBatchResultImages(validItems);

      dispatch(
        addToast({
          id: `toast_batch_apply_${Date.now()}`,
          kind: "success",
          title: "Added to Figma",
          message: `Placed ${validItems.length} cutouts on your canvas.`,
        })
      );
    } catch (err) {
      console.warn("Failed to insert batch images", err);
      dispatch(
        addToast({
          id: `toast_batch_err_${Date.now()}`,
          kind: "error",
          title: "Failed to apply",
          message: "Could not apply batch images to Figma canvas.",
        })
      );
    } finally {
      setIsApplyingAll(false);
    }
  };

  return (
    <div className="v2-batch-screen">
      {/* ── Top Header ── */}
      <header className="v2-batch-header">
        <div className="v2-batch-header-left">
          <button
            type="button"
            className="v2-back-icon-btn"
            onClick={handleBackToHome}
            title="Back to home"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>
          <h1 className="v2-batch-title">{totalCount} images</h1>
        </div>

        <div className="v2-batch-credits-pill" title={`${spendable} credits available`}>
          <Zap size={13} className="v2-batch-credits-icon" />
          <span>{spendable}</span>
        </div>
      </header>

      {/* ── Subtitle ── */}
      <div className="v2-batch-subtitle-wrap">
        <p className="v2-batch-subtitle">
          You selected {totalCount} {totalCount === 1 ? "layer" : "layers"}. Each one gets its own preview.
        </p>
      </div>

      {/* ── Main List of Batch Cards ── */}
      <main className="v2-batch-card-list">
        {batchResultItems.map((item) => {
          const isDone = item.status === "done";
          const isWorking = item.status === "processing";
          const isWaiting = item.status === "waiting";
          const isError = item.status === "error";

          return (
            <div
              key={item.id}
              className={`v2-batch-card ${isDone ? "is-clickable" : ""}`}
              onClick={() => isDone && handleInspectItem(item)}
              role={isDone ? "button" : undefined}
              tabIndex={isDone ? 0 : undefined}
              onKeyDown={(e) => {
                if (isDone && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleInspectItem(item);
                }
              }}
            >
              {/* Thumbnail Display */}
              <div className="v2-batch-thumb-wrap">
                <img
                  src={item.resultUrl || item.previewUrl}
                  alt={item.name}
                  className={`v2-batch-thumb-img ${isWorking ? "is-scanning" : ""}`}
                />
              </div>

              {/* Name Info */}
              <div className="v2-batch-info-wrap">
                <span className="v2-batch-item-name" title={item.name}>
                  {item.name}
                </span>
                {item.width && item.height && (
                  <span className="v2-batch-item-dims">
                    {item.width} × {item.height}
                  </span>
                )}
              </div>

              {/* Status Badge & Arrow */}
              <div className="v2-batch-status-wrap">
                {isDone && (
                  <span className="v2-batch-badge badge-done">
                    <Check size={12} strokeWidth={2.8} />
                    <span>Done</span>
                  </span>
                )}

                {isWorking && (
                  <span className="v2-batch-badge badge-working">
                    <Loader2 size={12} className="v2-spin-icon" />
                    <span>Processing…</span>
                  </span>
                )}

                {isWaiting && (
                  <span className="v2-batch-badge badge-waiting">
                    <span>Waiting</span>
                  </span>
                )}

                {isError && (
                  <span className="v2-batch-badge badge-error">
                    <AlertCircle size={12} />
                    <span>Failed</span>
                  </span>
                )}

                {/* Individual Drill-down Arrow */}
                {isDone && (
                  <button
                    type="button"
                    className="v2-batch-arrow-btn"
                    title={`Inspect ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInspectItem(item);
                    }}
                  >
                    <ChevronRight size={16} strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* ── Bottom Action Footer (50/50 Equal Widths) ── */}
      <footer className="v2-batch-footer">
        {/* Download ZIP button */}
        <button
          type="button"
          className="v2-batch-download-btn"
          disabled={!isAllComplete || isDownloading || doneCount === 0}
          title={
            !isAllComplete
              ? "Available once all images finish processing"
              : "Download all cutouts as a ZIP archive"
          }
          onClick={handleDownloadZip}
        >
          <Download size={15} />
          <span>{isDownloading ? "Zipping…" : "Download zip"}</span>
        </button>

        {/* Apply All CTA */}
        <button
          type="button"
          className="v2-batch-apply-all-btn"
          disabled={!isAllComplete || isApplyingAll || doneCount === 0}
          onClick={handleApplyAll}
        >
          <Check size={15} strokeWidth={2.4} />
          <span>{isApplyingAll ? "Applying…" : "Apply all"}</span>
        </button>
      </footer>
    </div>
  );
}
