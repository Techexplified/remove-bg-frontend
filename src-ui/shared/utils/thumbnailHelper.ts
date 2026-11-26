/**
 * Synchronous and safe utility to convert binary Uint8Array into a data URL.
 * Never hangs, uses chunking to prevent stack overflow, and handles transparent PNGs.
 */
export function uint8ArrayToDataUrl(bytes: Uint8Array, mimeType = "image/png"): string {
  try {
    if (!bytes || bytes.byteLength === 0) return "";
    let binary = "";
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
  } catch (err) {
    console.warn("Failed to convert Uint8Array to data URL:", err);
    return "";
  }
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  try {
    const parts = dataUrl.split(",");
    const base64 = parts[1] || parts[0];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn("Failed to convert data URL to Uint8Array:", err);
    return new Uint8Array();
  }
}

/**
 * Creates a lightweight ~150px thumbnail data URL for persistent clientStorage.
 * Storing ~15KB per item ensures 20 history items use < 350KB total,
 * fitting comfortably under Figma's 5MB clientStorage limit.
 */
export async function generateThumbnailDataUrl(bytes: Uint8Array, maxDim = 150): Promise<string> {
  if (!bytes || bytes.byteLength === 0) return "";

  // 1. Hardware-accelerated createImageBitmap (fastest, no DOM overhead)
  if (typeof createImageBitmap !== "undefined") {
    try {
      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png");
        bitmap.close();
        return dataUrl;
      }
      bitmap.close();
    } catch {
      // Fall through to Image element fallback
    }
  }

  // 2. Fallback via HTMLImageElement
  if (typeof Image !== "undefined" && typeof document !== "undefined") {
    try {
      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        return canvas.toDataURL("image/png");
      }
      URL.revokeObjectURL(url);
    } catch {
      // Fall through
    }
  }

  // 3. Direct base64 fallback
  return uint8ArrayToDataUrl(bytes);
}

/**
 * Compresses cutout into a crisp high-resolution version (max 1200px, ~150-200 KB).
 * This ensures even across computer restarts, cutouts placed onto canvas or opened in
 * Edit Studio have 100% sharp high quality without bloating clientStorage.
 */
export async function compressHighResCutout(bytes: Uint8Array, maxDim = 1200): Promise<Uint8Array> {
  if (!bytes || bytes.byteLength === 0) return bytes;
  // If already under 200KB, it's already compact enough
  if (bytes.byteLength <= 200 * 1024) return bytes;

  if (typeof createImageBitmap !== "undefined") {
    try {
      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
      const bitmap = await createImageBitmap(blob);
      if (bitmap.width <= maxDim && bitmap.height <= maxDim && bytes.byteLength <= 350 * 1024) {
        bitmap.close();
        return bytes;
      }

      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        const dataUrl = canvas.toDataURL("image/png");
        return dataUrlToUint8Array(dataUrl);
      }
      bitmap.close();
    } catch {
      // Fall through to Image element
    }
  }

  if (typeof Image !== "undefined" && typeof document !== "undefined") {
    try {
      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });

      if (img.width <= maxDim && img.height <= maxDim && bytes.byteLength <= 350 * 1024) {
        URL.revokeObjectURL(url);
        return bytes;
      }

      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/png");
        return dataUrlToUint8Array(dataUrl);
      }
      URL.revokeObjectURL(url);
    } catch {
      // Fall through
    }
  }

  return bytes;
}
