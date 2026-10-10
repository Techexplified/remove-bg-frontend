import type { Dispatch, SetStateAction } from "react";
import type { BatchItem, BatchSettings } from "../types";
import { runFeature } from "../../../shared/api/client";
import { compositeBatchItem } from "./imageCompositor";

export interface ProcessBatchParams {
  items: BatchItem[];
  settings: BatchSettings;
  setItems: Dispatch<SetStateAction<BatchItem[]>>;
  setProgressText: Dispatch<SetStateAction<string>>;
  notify: (msg: string) => void;
  onItemSuccess?: (item: BatchItem) => void;
}

/**
 * processBatchQueue - Executes batch background removal and composition
 * with concurrency limit.
 *
 * (The logic for this function is ready for you to implement!)
 */
export async function processBatchQueue(params: ProcessBatchParams): Promise<void> {
  
  // get features
  let items = params.items;
  const settings = params.settings;
  const setItems = params.setItems;
  const setProgressText = params.setProgressText;
  const notify = params.notify;

  const targetItems : BatchItem[] = items.filter((item) => item.selected);

  if(targetItems.length === 0){
    notify("No items selected");
    return;
  }

  const CONCURRENCY = 2;
  let completedCount = 0;
  let currentIndex = 0;

  // MIME type based on selected export format
  const mimeType =
    settings.exportFormat === "jpg"
      ? "image/jpeg"
      : settings.exportFormat === "webp"
        ? "image/webp"
        : "image/png";

  /**
   * Worker function: continuously takes the next available item
   * from the shared queue until all items are processed.
   */
  async function worker(): Promise<void> {
    while (currentIndex < targetItems.length) {
      // 1. Grab next item atomically using the shared index
      const item = targetItems[currentIndex++];
      if (!item) break;

      // 2. Mark item as processing
      setItems((prev) =>
        prev.map((ci) => (ci.id === item.id ? { ...ci, status: "processing" } : ci))
      );

      try {
        // 3. Remove background if enabled
        let cutoutBytes: Uint8Array;
        if (settings.removeBackground) {
          cutoutBytes = await runFeature("remove_bg_basic", item.originalBytes);
        } else {
          cutoutBytes = item.originalBytes;
        }

        // 4. Composite background / resize
        let resultBytes: Uint8Array = cutoutBytes;
        if (cutoutBytes && cutoutBytes.length > 0) {
          resultBytes = await compositeBatchItem(cutoutBytes, {
            background: settings.background,
            resize: settings.resize,
            exportFormat: settings.exportFormat,
          });
        }

        // 5. Create preview URL
        const resultUrl = URL.createObjectURL(
          new Blob([resultBytes as unknown as BlobPart], { type: mimeType })
        );

        // 6. Mark item as done
        setItems((prev) =>
          prev.map((ci) =>
            ci.id === item.id
              ? { ...ci, status: "done", resultBytes, resultPreviewUrl: resultUrl }
              : ci
          )
        );

        params.onItemSuccess?.(item);
      } catch (error) {
        // Mark item as error
        setItems((prev) =>
          prev.map((ci) =>
            ci.id === item.id ? { ...ci, status: "error", error: String(error) } : ci
          )
        );
      } finally {
        // 7. Update progress counter regardless of success or error
        completedCount++;
        setProgressText(`${completedCount} / ${targetItems.length} completed`);
      }
    }
  }

  // Spawn up to CONCURRENCY workers running in parallel
  const workerCount = Math.min(CONCURRENCY, targetItems.length);
  const workers = Array.from({ length: workerCount }, () => worker());

  // Wait for all workers to finish their queue
  await Promise.all(workers);

  notify(`Batch complete! Processed ${completedCount} image${completedCount === 1 ? "" : "s"}.`);
}
