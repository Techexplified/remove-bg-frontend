import type { ExportFormat, CompressionSettings, WatermarkSettings, ResizeFitMode } from "../types";

export interface RenderResizeParams {
  imageBytes: Uint8Array;
  targetWidth: number;
  targetHeight: number;
  format: ExportFormat;
  compression: CompressionSettings;
  watermark: WatermarkSettings;
  fitMode?: ResizeFitMode; // "cover" (crops to fill target frame) | "contain" (letterboxes with margins)
}

/**
 * Loads a Uint8Array into an in-memory HTMLImageElement.
 */
function loadImage(bytes: Uint8Array): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!bytes || bytes.length === 0) {
      reject(new Error("No image data provided."));
      return;
    }
    const blob = new Blob([bytes as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image data into an image element."));
    };
    img.src = url;
  });
}

/**
 * Draws text watermark on the target canvas context.
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermark: WatermarkSettings
) {
  if (!watermark.enabled || !watermark.text.trim()) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.05, watermark.opacity / 100));

  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.04));
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = Math.max(4, Math.round(fontSize * 0.25));

  if (watermark.position === "bottom_right") {
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const margin = Math.max(16, Math.round(fontSize * 1.2));
    ctx.fillText(watermark.text, width - margin, height - margin);
  } else {
    // Diagonal repeated pattern across the whole canvas
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const stepX = Math.max(160, fontSize * 8);
    const stepY = Math.max(90, fontSize * 4.5);

    ctx.translate(width / 2, height / 2);
    ctx.rotate((-35 * Math.PI) / 180);

    const diag = Math.sqrt(width * width + height * height);
    for (let y = -diag; y <= diag; y += stepY) {
      for (let x = -diag; x <= diag; x += stepX) {
        ctx.fillText(watermark.text, x, y);
      }
    }
  }

  ctx.restore();
}

/**
 * renderResizeExport - Canvas rendering engine for resizing, watermarking,
 * and format compression.
 */
export async function renderResizeExport(params: RenderResizeParams): Promise<Uint8Array> {
  const {
    imageBytes,
    targetWidth: rawWidth,
    targetHeight: rawHeight,
    format,
    compression,
    watermark,
    fitMode = "cover",
  } = params;

  const targetWidth = Math.max(1, Math.round(rawWidth));
  const targetHeight = Math.max(1, Math.round(rawHeight));

  // 1. Load source image
  const img = await loadImage(imageBytes);
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  // 2. Setup destination canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create 2D canvas context for rendering.");
  }

  // Smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // If JPG, fill background with white (JPG does not support transparency)
  if (format === "jpg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // 3. Calculate destination coordinates based on fitMode ("cover" vs "contain")
  let drawWidth: number;
  let drawHeight: number;
  let dx: number;
  let dy: number;

  if (fitMode === "contain") {
    // Letterbox / Fit whole image inside target box without cropping
    const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
    drawWidth = Math.round(srcWidth * scale);
    drawHeight = Math.round(srcHeight * scale);
    dx = Math.round((targetWidth - drawWidth) / 2);
    dy = Math.round((targetHeight - drawHeight) / 2);
  } else {
    // "cover": Fill target box completely, cropping overflowing parts evenly
    const scale = Math.max(targetWidth / srcWidth, targetHeight / srcHeight);
    drawWidth = Math.round(srcWidth * scale);
    drawHeight = Math.round(srcHeight * scale);
    dx = Math.round((targetWidth - drawWidth) / 2);
    dy = Math.round((targetHeight - drawHeight) / 2);
  }

  // Draw scaled image
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

  // 4. Apply Watermark if enabled
  drawWatermark(ctx, targetWidth, targetHeight, watermark);

  // 5. Apply PNG color quantization if PNG compression is enabled
  if (format === "png" && compression.enabled && compression.level < 0.98) {
    const q = Math.min(1.0, Math.max(0.1, compression.level));
    // Determine quantization step based on compression level:
    // level 0.90 -> step ~2
    // level 0.70 -> step ~5
    // level 0.50 -> step ~8
    // level 0.10 -> step ~14
    const step = Math.max(1, Math.round(1 + (1 - q) * 14));
    if (step > 1) {
      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imgData.data;
      const len = data.length;
      for (let i = 0; i < len; i += 4) {
        // Skip fully transparent pixels
        if (data[i + 3] === 0) continue;
        // Quantize RGB channels, preserving full alpha transparency
        data[i] = Math.min(255, Math.round(data[i] / step) * step);
        data[i + 1] = Math.min(255, Math.round(data[i + 1] / step) * step);
        data[i + 2] = Math.min(255, Math.round(data[i + 2] / step) * step);
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }

  // 6. Encode canvas to target format and compression level
  const mimeType =
    format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";

  const quality =
    format === "png"
      ? undefined // PNG uses color quantization above; toBlob quality parameter is ignored by PNG spec
      : compression.enabled
      ? Math.min(1.0, Math.max(0.1, compression.level))
      : 0.92;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to encode canvas output into image blob."));
      },
      mimeType,
      quality
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
