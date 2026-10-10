import type { BatchBackgroundType, BatchResizeRatio, BatchExportFormat } from "../types";

export interface CompositeOptions {
  background: BatchBackgroundType;
  resize: BatchResizeRatio;
  exportFormat: BatchExportFormat;
}

export async function compositeBatchItem(
  bytes: Uint8Array,
  options: CompositeOptions
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // 1. Calculate target dimensions based on aspect ratio
        let targetW = origW;
        let targetH = origH;

        if (options.resize !== "original") {
          let ratio = 1; // W / H
          switch (options.resize) {
            case "1:1": ratio = 1; break;
            case "4:3": ratio = 4 / 3; break;
            case "3:4": ratio = 3 / 4; break;
            case "16:9": ratio = 16 / 9; break;
            case "9:16": ratio = 9 / 16; break;
          }

          // Fit image inside target aspect ratio box by expanding container
          if (origW / origH > ratio) {
            targetW = origW;
            targetH = Math.round(origW / ratio);
          } else {
            targetH = origH;
            targetW = Math.round(origH * ratio);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas context");

        // 2. Draw background if not transparent
        if (options.background === "white") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
        } else if (options.background === "black") {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, targetW, targetH);
        }

        // 3. Center image in target dimensions
        const offsetX = Math.round((targetW - origW) / 2);
        const offsetY = Math.round((targetH - origH) / 2);
        ctx.drawImage(img, offsetX, offsetY, origW, origH);

        // 4. Export to requested MIME format
        let mime = "image/png";
        if (options.exportFormat === "jpg") mime = "image/jpeg";
        else if (options.exportFormat === "webp") mime = "image/webp";

        canvas.toBlob(blobResult => {
          if (!blobResult) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          blobResult.arrayBuffer().then(buf => {
            resolve(new Uint8Array(buf));
          }).catch(reject);
        }, mime, 0.95);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for composition"));
    };

    img.src = url;
  });
}
