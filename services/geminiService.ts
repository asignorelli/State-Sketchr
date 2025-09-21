// services/geminiService.ts
import type { Score } from '../types';

// Turn "New York" -> "new-york"
function slugifyState(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type CompareOpts = {
  size?: number;           // working canvas size (square)
  angles?: number[];       // degrees to test for the user's drawing
  lineDilate?: number;     // how many pixels to "thicken" lines in masks
  drawThresh?: number;     // 0..255 luminance threshold for user's drawing
  outAlphaThresh?: number; // 0..255 alpha threshold for outline PNG
};

// Make defaults required so the merged config is fully typed
const DEFAULT_OPTS: Required<CompareOpts> = {
  size: 512,
  angles: [-12, -8, -4, 0, 4, 8, 12],
  lineDilate: 1,
  drawThresh: 220,
  outAlphaThresh: 32,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draw image onto a square canvas, preserving aspect ratio. Optional rotation (deg).
function rasterize(
  img: HTMLImageElement,
  size: number,
  rotationDeg = 0
): ImageData {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.save();
  ctx.clearRect(0, 0, size, size);

  const margin = 0.05 * size;
  const maxW = size - 2 * margin;
  const maxH = size - 2 * margin;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;

  const cx = size / 2;
  const cy = size / 2;

  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  return ctx.getImageData(0, 0, size, size);
}

// Produce a binary mask (Uint8Array of 0/1) from ImageData.
function imageDataToMask(
  data: ImageData,
  forOutline: boolean,
  drawThresh: number,
  outAlphaThresh: number
): Uint8Array {
  const { data: px, width: w, height: h } = data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
    const lum = (r + g + b) / 3;
    let on = 0;
    if (forOutline) {
      // outline pixels are usually opaque dark strokes on transparent bg
      on = (a > outAlphaThresh || lum < 200) ? 1 : 0;
    } else {
      // user drawing is dark ink on white bg
      on = lum < drawThresh ? 1 : 0;
    }
    mask[i / 4] = on;
  }
  return mask;
}

// Simple dilation to "thicken" thin lines by radius pixels.
function dilate(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  const out = new Uint8Array(mask);
  const r2 = radius * radius;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= r2) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
            }
          }
        }
      }
    }
  }
  return out;
}

// Compute overlap metrics between two masks of equal size
function overlapMetrics(a: Uint8Array, b: Uint8Array): { iou: number; covA: number; covB: number } {
  let inter = 0, cntA = 0, cntB = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    if (a[i]) cntA++;
    if (b[i]) cntB++;
    if (a[i] && b[i]) inter++;
  }
  const union = cntA + cntB - inter;
  const iou = union ? inter / union : 0;
  const covA = cntA ? inter / cntA : 0; // "how much of drawing overlaps outline"
  const covB = cntB ? inter / cntB : 0; // "how much of outline is covered by drawing"
  return { iou, covA, covB };
}

// Combine metrics into 0..100 score. Tune weights as desired.
function scoreFromMetrics(iou: number, covA: number, covB: number): number {
  const s = 0.4 * iou + 0.3 * covA + 0.3 * covB;
  return Math.round(100 * s);
}

// Public API: compare the user's drawing against the state outline PNG (no AI).
export async function judgeDrawing(drawingDataUrl: string, stateName: string, opts: CompareOpts = {}): Promise<Score> {
  // Merge opts into required config so nothing is undefined
  const cfg: Required<CompareOpts> = { ...DEFAULT_OPTS, ...opts };
  const { size, angles, lineDilate, drawThresh, outAlphaThresh } = cfg;

  const outlineUrl = `/outlines/${slugifyState(stateName)}.png`;

  // Load images
  const [userImg, outlineImg] = await Promise.all([
    loadImage(drawingDataUrl),
    loadImage(outlineUrl),
  ]);

  // Precompute the outline mask once
  const outlineID = rasterize(outlineImg, size);
  let outlineMask = imageDataToMask(outlineID, true, drawThresh, outAlphaThresh);
  outlineMask = dilate(outlineMask, size, size, lineDilate);

  // Try a few rotations of the user's drawing and keep the best score
  let best = { score: 0, iou: 0, covA: 0, covB: 0, angle: 0 };

  for (const deg of angles) {
    const userID = rasterize(userImg, size, deg);
    let userMask = imageDataToMask(userID, false, drawThresh, outAlphaThresh);
    userMask = dilate(userMask, size, size, lineDilate);

    const { iou, covA, covB } = overlapMetrics(userMask, outlineMask);
    const score = scoreFromMetrics(iou, covA, covB);
    if (score > best.score) best = { score, iou, covA, covB, angle: deg };
  }

  const critique =
    `Matched ${Math.round(100 * best.covB)}% of the outline, ` +
    `with ${Math.round(100 * best.covA)}% of your strokes overlapping. ` +
    (best.angle ? `Auto-rotated by ${best.angle}° for best match.` : 'Orientation looked good.');

  return { score: best.score, critique } as Score;
}
