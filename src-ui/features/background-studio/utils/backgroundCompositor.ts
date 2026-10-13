import type { CompositorParams, BackgroundPreset } from "../types";

function createGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angle: number,
  color1: string,
  color2: string
) {
  const radians = (angle * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;

  const length =
    Math.abs(width * Math.cos(radians)) +
    Math.abs(height * Math.sin(radians));

  const x1 = cx - (length / 2) * Math.cos(radians);
  const y1 = cy - (length / 2) * Math.sin(radians);
  const x2 = cx + (length / 2) * Math.cos(radians);
  const y2 = cy + (length / 2) * Math.sin(radians);

  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  return grad;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  canvas: HTMLCanvasElement
) {
  const scale = Math.max(
    canvas.width / img.width,
    canvas.height / img.height
  );

  const width = img.width * scale;
  const height = img.height * scale;

  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;

  ctx.drawImage(img, x, y, width, height);
}

function drawPresetBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: BackgroundPreset
) {
  const c1 = preset.colors?.[0] || "#ffffff";
  const c2 = preset.colors?.[1] || "#f1f5f9";
  const angle = preset.angle ?? 135;

  // 1. Base Gradient Fill
  const grad = createGradient(ctx, width, height, angle, c1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Preset Effects
  const cx = width / 2;
  const cy = height * 0.45;
  const maxDim = Math.max(width, height);

  if (preset.effect === "glow") {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.55);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    glow.addColorStop(0.45, "rgba(255, 255, 255, 0.15)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  } else if (preset.effect === "vignette") {
    const vig = ctx.createRadialGradient(cx, height / 2, maxDim * 0.25, cx, height / 2, maxDim * 0.72);
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Fast downscaled pixel scan to find subject footprint bounds
 */
function getSubjectBottomBounds(
  img: HTMLImageElement | ImageBitmap,
  targetWidth: number,
  targetHeight: number
): { baseX: number; baseY: number; footprintWidth: number } {
  try {
    const scanCanvas = document.createElement("canvas");
    const scanW = 160;
    const scanH = Math.max(20, Math.round((targetHeight / targetWidth) * 160)) || 160;
    scanCanvas.width = scanW;
    scanCanvas.height = scanH;
    const sCtx = scanCanvas.getContext("2d", { willReadFrequently: true });

    if (sCtx) {
      sCtx.drawImage(img, 0, 0, scanW, scanH);
      const imgData = sCtx.getImageData(0, 0, scanW, scanH);
      const data = imgData.data;

      let minX = scanW;
      let maxX = 0;
      let maxY = 0;
      let found = false;

      for (let y = 0; y < scanH; y++) {
        for (let x = 0; x < scanW; x++) {
          const alpha = data[(y * scanW + x) * 4 + 3];
          if (alpha > 30) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (found && maxX > minX) {
        const scaleX = targetWidth / scanW;
        const scaleY = targetHeight / scanH;
        const actualMinX = minX * scaleX;
        const actualMaxX = maxX * scaleX;
        const actualMaxY = maxY * scaleY;

        return {
          baseX: (actualMinX + actualMaxX) / 2,
          baseY: actualMaxY,
          footprintWidth: (actualMaxX - actualMinX) * 0.85,
        };
      }
    }
  } catch (err) {
    console.warn("Could not scan subject bounds:", err);
  }

  return {
    baseX: targetWidth * 0.5,
    baseY: targetHeight * 0.82,
    footprintWidth: targetWidth * 0.6,
  };
}

function drawGroundContactShadow(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  footprintWidth: number,
  shadowColor = "rgba(15, 23, 42, 0.4)",
  intensity = 0.75
) {
  ctx.save();

  // Tight core ambient occlusion
  const coreRadiusX = Math.max(12, footprintWidth * 0.44);
  const coreRadiusY = Math.max(3, coreRadiusX * 0.09);
  const coreGrad = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, coreRadiusX);
  coreGrad.addColorStop(0, `rgba(0, 0, 0, ${0.65 * intensity})`);
  coreGrad.addColorStop(0.45, `rgba(0, 0, 0, ${0.35 * intensity})`);
  coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.ellipse(baseX, baseY - coreRadiusY * 0.05, coreRadiusX, coreRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Directional soft shadow
  const midRadiusX = Math.max(18, footprintWidth * 0.68);
  const midRadiusY = Math.max(6, midRadiusX * 0.18);
  const midOffsetY = midRadiusY * 0.35;
  const midGrad = ctx.createRadialGradient(
    baseX,
    baseY + midOffsetY,
    0,
    baseX,
    baseY + midOffsetY,
    midRadiusX
  );
  midGrad.addColorStop(0, shadowColor);
  midGrad.addColorStop(0.55, `rgba(0, 0, 0, ${0.12 * intensity})`);
  midGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = midGrad;
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + midOffsetY, midRadiusX, midRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function buildFilterString(
  adjustments: CompositorParams["adjustments"],
  filter: CompositorParams["filter"]
): string {
  const parts: string[] = [];

  switch (filter) {
    case "bw":
      parts.push("grayscale(100%)");
      break;
    case "sepia":
      parts.push("sepia(80%)");
      break;
    case "vivid":
      parts.push("saturate(180%) contrast(1.1)");
      break;
    case "cool":
      parts.push("hue-rotate(200deg) saturate(120%)");
      break;
    case "warm":
      parts.push("sepia(30%) saturate(130%)");
      break;
    case "normal":
    default:
      break;
  }

  if (adjustments && adjustments.brightness !== 100) {
    parts.push(`brightness(${adjustments.brightness}%)`);
  }
  if (adjustments && adjustments.contrast !== 100) {
    parts.push(`contrast(${adjustments.contrast}%)`);
  }
  if (adjustments && adjustments.saturation !== 100) {
    parts.push(`saturate(${adjustments.saturation}%)`);
  }
  if (adjustments && adjustments.blur > 0) {
    parts.push(`blur(${adjustments.blur}px)`);
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

export async function compositeBackground(params: CompositorParams): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(params.width || 800));
  canvas.height = Math.max(1, Math.round(params.height || 800));
  const ctx = canvas.getContext("2d");

  if (!ctx) return new Uint8Array(0);

  // ── Step 1: Render Background ──
  ctx.save();
  if (params.bgType === "preset" && params.preset) {
    drawPresetBackground(ctx, canvas.width, canvas.height, params.preset);
  } else if (params.bgType === "color" && params.solidColor) {
    ctx.fillStyle = params.solidColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (params.bgType === "gradient" && params.gradient) {
    const c1 = params.gradient.stops[0]?.color || "#ffffff";
    const c2 = params.gradient.stops[1]?.color || "#f1f5f9";
    const grad = createGradient(ctx, canvas.width, canvas.height, params.gradient.angle, c1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (params.bgType === "image" && params.backdropImage) {
    drawImageCover(ctx, params.backdropImage, canvas);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  // ── Step 2: Ground Contact Shadow (if effect is shadow or shadow enabled) ──
  if (params.foregroundImage) {
    const isPresetShadow = params.bgType === "preset" && params.preset?.effect === "shadow";
    const isShadowEnabled = params.shadow && params.shadow.enabled;

    if (isPresetShadow || isShadowEnabled) {
      const bounds = getSubjectBottomBounds(params.foregroundImage, canvas.width, canvas.height);
      drawGroundContactShadow(
        ctx,
        bounds.baseX,
        bounds.baseY,
        bounds.footprintWidth,
        params.shadow?.color || "rgba(15, 23, 42, 0.4)",
        0.8
      );
    }
  }

  // ── Step 3: Draw Cutout with Filters & Opacity ──
  if (params.foregroundImage) {
    ctx.save();

    // Standard drop shadow if enabled and not in preset shadow mode
    if (params.shadow && params.shadow.enabled && params.preset?.effect !== "shadow") {
      ctx.shadowColor = params.shadow.color;
      ctx.shadowBlur = params.shadow.blur;
      ctx.shadowOffsetY = params.shadow.offsetY;
      ctx.shadowOffsetX = 0;
    }

    const filterStr = buildFilterString(params.adjustments, params.filter);
    if (filterStr !== "none") {
      ctx.filter = filterStr;
    }

    const opacity = params.adjustments?.opacity ?? 100;
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100));

    ctx.drawImage(params.foregroundImage, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // ── Step 4: Export to PNG bytes ──
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new Uint8Array(0));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.readAsArrayBuffer(blob);
    }, "image/png");
  });
}
