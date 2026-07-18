export async function removeBackgroundLocal(imageBytes: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([imageBytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);

        const { width, height } = img;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas 2D context not available"));

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const bgColor = estimateBackgroundColor(data, width, height);
        const TOLERANCE = 30;
        const FEATHER = 20; // soft band beyond tolerance

        // Flood fill from all edge pixels that match bg color
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const tryEnqueue = (x: number, y: number) => {
          const idx = y * width + x;
          if (visited[idx]) return;
          const i = idx * 4;
          const dist = colorDistance([data[i], data[i + 1], data[i + 2]], bgColor);
          if (dist < TOLERANCE) {
            visited[idx] = 1;
            queue.push(idx);
          }
        };

        for (let x = 0; x < width; x++) {
          tryEnqueue(x, 0);
          tryEnqueue(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          tryEnqueue(0, y);
          tryEnqueue(width - 1, y);
        }

        while (queue.length) {
          const idx = queue.pop()!;
          const x = idx % width;
          const y = (idx / width) | 0;
          const neighbors = [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
          ];
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nIdx = ny * width + nx;
            if (visited[nIdx]) continue;
            const i = nIdx * 4;
            const dist = colorDistance([data[i], data[i + 1], data[i + 2]], bgColor);
            if (dist < TOLERANCE) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            } else if (dist < TOLERANCE + FEATHER) {
              // soft edge: partially transparent, don't propagate further
              const t = (dist - TOLERANCE) / FEATHER; // 0 (bg-like) -> 1 (subject-like)
              data[i + 3] = Math.round(data[i + 3] * t);
            }
          }
        }

        // Clear everything reached by the flood fill
        for (let idx = 0; idx < visited.length; idx++) {
          if (visited[idx]) data[idx * 4 + 3] = 0;
        }

        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((resBlob) => {
          if (!resBlob) return reject(new Error("Failed to create blob from canvas"));
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.onerror = () => reject(new Error("Failed to read blob"));
          reader.readAsArrayBuffer(resBlob);
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for fallback processing"));
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

function estimateBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number
): [number, number, number] {
  const samples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(width / 20));

  for (let x = 0; x < width; x += step) {
    samples.push(getPixel(data, width, x, 0));
    samples.push(getPixel(data, width, x, height - 1));
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 20))) {
    samples.push(getPixel(data, width, 0, y));
    samples.push(getPixel(data, width, width - 1, y));
  }

  // average of samples close to the median-ish cluster (simple mode approximation)
  let best = samples[0];
  let bestScore = -1;
  for (const s of samples) {
    let score = 0;
    for (const other of samples) {
      if (colorDistance(s, other) < 20) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}