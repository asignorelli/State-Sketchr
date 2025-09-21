// services/geminiService.ts
import type { Score } from '../types';

// "New York" -> "new-york"
function slugifyState(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

type CompareOpts = {
  size?: number;           // working canvas size
  angles?: number[];       // rotations to try (deg)
  lineDilate?: number;     // extra thickening for very thin strokes
  drawThresh?: number;     // 0..255 (higher = more pixels count as ink)
  tolerancePx?: number;    // distance band around the outline for matching
};

const DEFAULT_OPTS: Required<CompareOpts> = {
  size: 512,
  angles: [-12, -8, -4, 0, 4, 8, 12],
  lineDilate: 0,          // don't thicken drawing by default
  drawThresh: 180,        // treat fairly dark pixels as ink
  tolerancePx: 3,         // how far from the outline counts as "on the edge"
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

// Draw image onto a square canvas, optional rotation
function rasterize(img: HTMLImageElement, size: number, rotationDeg = 0): ImageData {
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

  const cx = size / 2, cy = size / 2;
  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  return ctx.getImageData(0, 0, size, size);
}

// Binary mask (Uint8Array of 0/1)
// forOutline: only DARK pixels -> 1 (ignore alpha so white bg doesn't count)
// forDrawing: pixels darker than drawThresh -> 1
function imageDataToMask(
  data: ImageData,
  forOutline: boolean,
  drawThresh: number
): Uint8Array {
  const { data: px, width: w, height: h } = data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const lum = (r + g + b) / 3;
    // threshold for outline edges — tune 140..100 depending on how light your PNG stroke is
    const outlineLumThresh = 120;
    const on = forOutline ? (lum < outlineLumThresh ? 1 : 0) : (lum < drawThresh ? 1 : 0);
    mask[i / 4] = on;
  }
  return mask;
}

// Morphological dilation by 'radius' pixels
function dilate(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  const out = new Uint8Array(mask);
  const r2 = radius * radius;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
        }
      }
    }
  }
  return out;
}

function count(mask: Uint8Array): number {
  let s = 0; for (let i = 0; i < mask.length; i++) s += mask[i]; return s;
}
function overlapCount(a: Uint8Array, b: Uint8Array): number {
  let s = 0; for (let i = 0; i < a.length; i++) if (a[i] && b[i]) s++; return s;
}

// Final score from precision/recall
function scoreFromPR(precision: number, recall: number): number {
  // Weighted average (you can tweak weights)
  return Math.round(100 * (0.5 * precision + 0.5 * recall));
}

// Compare user's drawing to state outline PNG — NO AI.
export async function judgeDrawing(drawingDataUrl: string, stateName: string, opts: CompareOpts = {}): Promise<Score> {
  const cfg: Required<CompareOpts> = { ...DEFAULT_OPTS, ...opts };
  const { size, angles, lineDilate, drawThresh, tolerancePx } = cfg;

  const outlineUrl = `/outlines/${slugifyState(stateName)}.png`;
  const [userImg, outlineImg] = await Promise.all([
    loadImage(drawingDataUrl),
    loadImage(outlineUrl),
  ]);

  // Outline edge mask (just the dark stroke)
  const outlineID = rasterize(outlineImg, size);
  let outlineMask = imageDataToMask(outlineID, true, drawThresh);
  // Slightly fatten the outline so users don't need perfect pixel alignment
  outlineMask = dilate(outlineMask, size, size, 1);

  // A tolerance "band" around the outline that counts as a hit
  const outlineBand = dilate(outlineMask, size, size, tolerancePx);

  let best = { score: 0, precision: 0, recall: 0, angle: 0 };

  for (const deg of angles) {
    const userID = rasterize(userImg, size, deg);
    let userMask = imageDataToMask(userID, false, drawThresh);
    if (lineDilate > 0) userMask = dilate(userMask, size, size, lineDilate);

    // Precision: % of drawing pixels that land within 'tolerancePx' of the outline
    const goodInk = overlapCount(userMask, outlineBand);
    const inkTotal = count(userMask);
    const precision = inkTotal ? goodInk / inkTotal : 0;

    // Recall: % of outline pixels that have user ink within 'tolerancePx'
    const userBand = dilate(userMask, size, size, tolerancePx);
    const coveredOutline = overlapCount(outlineMask, userBand);
    const outlineTotal = count(outlineMask);
    const recall = outlineTotal ? coveredOutline / outlineTotal : 0;

    const score = scoreFromPR(precision, recall);
    if (score > best.score) best = { score, precision, recall, angle: deg };
  }

  const critique =
    `Matched ${Math.round(100 * best.recall)}% of the outline, ` +
    `with ${Math.round(100 * best.precision)}% of your strokes near the edge. ` +
    (best.angle ? `Auto-rotated ${best.angle}° for best match.` : 'Orientation looked good.');

  return { score: best.score, critique } as Score;
}
