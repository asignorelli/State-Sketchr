// services/geminiService.ts
import type { Score } from '../types';

// "New York" -> "new-york"
function slugifyState(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

type CompareOpts = {
  size?: number;           // working canvas size
  angles?: number[];       // rotations to try (deg)
  drawThresh?: number;     // user-ink threshold (0..255, lower = stricter)
  outlineLumThresh?: number; // outline stroke threshold (0..255, lower = stricter)
  tolerancePx?: number;    // distance band in px for "matches"
};

const DEFAULT_OPTS: Required<CompareOpts> = {
  size: 512,
  angles: [-10, -6, -3, 0, 3, 6, 10],
  drawThresh: 170,
  outlineLumThresh: 120,
  tolerancePx: 2,
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

// Binary mask of "ink" (1) vs background (0)
function maskFromImageData(
  id: ImageData,
  thresh: number,          // luminance threshold: darker than thresh => 1
): Uint8Array {
  const { data, width, height } = id;
  const out = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = (r + g + b) / 3;
    out[i / 4] = lum < thresh ? 1 : 0;
  }
  return out;
}

// 3x3 erosion (single iteration). Returns a thinner mask.
function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let keep = 1;
      for (let dy = -1; dy <= 1 && keep; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!mask[(y + dy) * w + (x + dx)]) { keep = 0; break; }
        }
      }
      out[y * w + x] = keep;
    }
  }
  return out;
}

// Edge = mask - erode(mask): a 1-ish px outline/skeleton
function edgeFromMask(mask: Uint8Array, w: number, h: number): Uint8Array {
  const er = erode(mask, w, h);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] && !er[i] ? 1 : 0;
  return out;
}

function count(mask: Uint8Array): number {
  let s = 0; for (let i = 0; i < mask.length; i++) s += mask[i]; return s;
}

// Approx. Euclidean distance transform (two-pass, 8-connected)
function distanceTransform(edge: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = edge[i] ? 0 : INF;

  // forward pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const di = d[i];
      // neighbors: (x-1,y), (x,y-1), (x-1,y-1), (x+1,y-1)
      if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1);
      if (y > 0) d[i] = Math.min(d[i], d[i - w] + 1);
      if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + Math.SQRT2);
      if (x + 1 < w && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + Math.SQRT2);
      // keep di compilers happy
      void di;
    }
  }
  // backward pass
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      // neighbors: (x+1,y), (x,y+1), (x+1,y+1), (x-1,y+1)
      if (x + 1 < w) d[i] = Math.min(d[i], d[i + 1] + 1);
      if (y + 1 < h) d[i] = Math.min(d[i], d[i + w] + 1);
      if (x + 1 < w && y + 1 < h) d[i] = Math.min(d[i], d[i + w + 1] + Math.SQRT2);
      if (x > 0 && y + 1 < h) d[i] = Math.min(d[i], d[i + w - 1] + Math.SQRT2);
    }
  }
  return d;
}

// Compute precision & recall using edge-to-edge distances
function precisionRecall(
  userEdge: Uint8Array,
  outlineEdge: Uint8Array,
  w: number,
  h: number,
  tol: number
) {
  const dUserToOutline = distanceTransform(outlineEdge, w, h); // distance FROM any pixel TO nearest outline edge
  const dOutlineToUser = distanceTransform(userEdge, w, h);    // distance FROM any pixel TO nearest user edge

  let userEdgeCount = 0, matchedUser = 0;
  for (let i = 0; i < userEdge.length; i++) {
    if (userEdge[i]) {
      userEdgeCount++;
      if (dUserToOutline[i] <= tol) matchedUser++;
    }
  }
  let outlineEdgeCount = 0, matchedOutline = 0;
  for (let i = 0; i < outlineEdge.length; i++) {
    if (outlineEdge[i]) {
      outlineEdgeCount++;
      if (dOutlineToUser[i] <= tol) matchedOutline++;
    }
  }

  const precision = userEdgeCount ? matchedUser / userEdgeCount : 0;
  const recall = outlineEdgeCount ? matchedOutline / outlineEdgeCount : 0;
  return { precision, recall };
}

export async function judgeDrawing(drawingDataUrl: string, stateName: string, opts: CompareOpts = {}): Promise<Score> {
  const cfg: Required<CompareOpts> = { ...DEFAULT_OPTS, ...opts };
  const { size, angles, drawThresh, outlineLumThresh, tolerancePx } = cfg;

  const outlineUrl = `/outlines/${slugifyState(stateName)}.png`;
  const [userImg, outlineImg] = await Promise.all([
    loadImage(drawingDataUrl),
    loadImage(outlineUrl),
  ]);

  // Edge (thin) for outline
  const outlineID = rasterize(outlineImg, size);
  const outlineMask = maskFromImageData(outlineID, outlineLumThresh); // only dark stroke counts
  const outlineEdge = edgeFromMask(outlineMask, size, size);

  let best = { score: 0, precision: 0, recall: 0, angle: 0 };

  for (const deg of angles) {
    const userID = rasterize(userImg, size, deg);
    const userMask = maskFromImageData(userID, drawThresh);
    const userEdge = edgeFromMask(userMask, size, size);

    const { precision, recall } = precisionRecall(userEdge, outlineEdge, size, size, tolerancePx);

    // F1-like score, with a tiny penalty for very low ink near outline
    const eps = 1e-9;
    const f1 = (2 * precision * recall) / (precision + recall + eps);
    const score = Math.round(100 * f1);

    if (score > best.score) best = { score, precision, recall, angle: deg };
  }

  const critique =
    `Matched ${Math.round(100 * best.recall)}% of the outline, ` +
    `with ${Math.round(100 * best.precision)}% of your strokes near the edge. ` +
    (best.angle ? `Auto-rotated ${best.angle}° for best match.` : 'Orientation looked good.');

  return { score: best.score, critique } as Score;
}
