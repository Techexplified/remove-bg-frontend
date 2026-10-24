/**
 * Fast client-side image transparency inspection utility.
 * Checks whether an image has transparent or semi-transparent pixels (i.e. background is removed / cutout).
 */

export function checkImageHasTransparency(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    // Use a small 48x48 sample for instant sub-millisecond evaluation
    const w = Math.min(img.naturalWidth || 48, 48);
    const h = Math.min(img.naturalHeight || 48, 48);
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Check alpha channel (every 4th byte). If alpha < 240, transparency is present.
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 240) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks transparency asynchronously from an image URL (Blob URL, Data URL, etc.)
 */
export function detectTransparencyFromUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve(checkImageHasTransparency(img));
    };
    img.onerror = () => {
      resolve(false);
    };
    img.src = url;
  });
}
