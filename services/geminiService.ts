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
  outlineLumThresh: 110,
    // default tolerance in pixels for matching edges. Lower = stricter.
    tolerancePx: 1.5,
};

// Per-state tuning overrides to handle simple shapes like rectangles specially.
type StateOverride = {
  tolerancePx?: number;        // override tolerance
  lengthRampStart?: number;    // ratio at which lengthPenalty starts to ramp
  lengthRampWidth?: number;    // width of ramp (value that maps to full 1.0)
  minAcceptRatio?: number;     // final accept ratio guard
  scoreMultiplier?: number;    // final score multiplier for this state
  minUserEdgePixels?: number;  // lower minimum-ink guard for small states
};

const STATE_OVERRIDES: Record<string, StateOverride> = {
  Colorado: {
    tolerancePx: 5,
    lengthRampStart: 0.06,
    lengthRampWidth: 0.69, // end ~0.75
    minAcceptRatio: 0.005,
    scoreMultiplier: 1.25,
    minUserEdgePixels: 100,
  },
  Wyoming: {
    tolerancePx: 5,
    lengthRampStart: 0.06,
    lengthRampWidth: 0.69,
    minAcceptRatio: 0.005,
    scoreMultiplier: 1.25,
    minUserEdgePixels: 100,
  },
};

function fBeta(precision: number, recall: number, beta: number) {
  const b2 = beta * beta;
  const denom = b2 * precision + recall;
  if (denom === 0) return 0;
  return ((1 + b2) * precision * recall) / denom;
}


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

export async function judgeDrawing(
  drawingDataUrl: string,
  stateName: string,
  opts: CompareOpts = {}
): Promise<Score> {
  // stricter defaults
  const DEFAULTS: Required<CompareOpts> = {
    size: 512,
    angles: [-10, -6, -3, 0, 3, 6, 10],
    drawThresh: 170,
    outlineLumThresh: 110,
    tolerancePx: 3.0,
  };
  const cfg: Required<CompareOpts> = { ...DEFAULTS, ...opts };
  const { size, angles, drawThresh, outlineLumThresh, tolerancePx } = cfg;

  const outlineUrl = `/outlines/${slugifyState(stateName)}.png`;
  const [userImg, outlineImg] = await Promise.all([
    loadImage(drawingDataUrl),
    loadImage(outlineUrl),
  ]);

  // QUICK EMPTY-DRAWING GUARD:
  // Some PNGs (transparent backgrounds or anti-aliased artifacts) can
  // produce a small number of dark pixels that confuse the edge matcher.
  // Do a cheap check for any non-white pixels first and bail out if almost
  // none are present.
  try {
    const quickID = rasterize(userImg, size, 0);
    // threshold high (250) so any pixel not nearly-white counts as "ink"
    const quickMask = maskFromImageData(quickID, 250);
    const quickInk = count(quickMask);
    const MIN_QUICK_INK = Math.max(10, Math.round(size * 0.005)); // ~2-3 for 512
    if (quickInk < MIN_QUICK_INK) {
      return {
        score: 0,
        critique:
          "We couldn’t detect enough drawing. Try thicker, darker lines and trace along the edge.",
        precision: 0,
        recall: 0,
        ratio: 0,
        angle: 0,
      } as Score;
    }
  } catch (e) {
    // non-fatal: if rasterize/loadImage behave unexpectedly, continue to main path
    void e;
  }

  // Outline: thin edge
  const outlineID = rasterize(outlineImg, size);
  const outlineMask = maskFromImageData(outlineID, outlineLumThresh);
  const outlineEdge = edgeFromMask(outlineMask, size, size);
  const outlineEdgeCount = count(outlineEdge);
  const outlineMaskCount = count(outlineMask);

  // State-specific tolerance (rectangle states get a tiny bit more slack)
  const baseTol = tolerancePx;
  const override = STATE_OVERRIDES[stateName as string] || {};
  const tol = override.tolerancePx ?? baseTol;

  let best: { score: number; precision: number; recall: number; ratio?: number } = { score: 0, precision: 0, recall: 0 };

  // Minimum-ink guard (quick pre-check using the non-rotated submission)
  // This avoids unnecessary work and prevents empty/near-empty canvases from
  // ever entering the rotation/precision loop where tiny artifacts might
  // otherwise produce a non-zero score.
  // Lower the minimum required edge pixels so reasonable drawings aren't rejected.
  // For a 512 canvas, require at least ~10 pixels by default (override via STATE_OVERRIDES).
  const MIN_USER_EDGE_PIXELS = override.minUserEdgePixels ?? Math.max(10, Math.round(size * 0.005));
  const baseUserID = rasterize(userImg, size, 0);
  const baseUserMask = maskFromImageData(baseUserID, drawThresh);
  const baseUserEdge = edgeFromMask(baseUserMask, size, size);
  const baseUserEdgeCount = count(baseUserEdge);
  const baseUserMaskCount = count(baseUserMask);
  if (baseUserEdgeCount < MIN_USER_EDGE_PIXELS) {
    return {
      score: 0,
      critique:
        "We couldn’t detect enough drawing near the border. Try thicker, darker lines and trace along the edge.",
      precision: 0,
      recall: 0,
      ratio: baseUserMaskCount / Math.max(1, outlineMaskCount),
    } as Score;
  }

  for (const deg of angles) {
    // User: thin edge (for this rotation)
    const userID = rasterize(userImg, size, deg);
    const userMask = maskFromImageData(userID, drawThresh);
    const userEdge = edgeFromMask(userMask, size, size);
    const userEdgeCount = count(userEdge);

    // --- minimum-ink guard (prevents generous scores on blanks/tiny scribbles) ---
    // We already performed a non-rotated pre-check above; keep the per-rotation
    // continue as a safety for pathological cases.
    if (userEdgeCount < MIN_USER_EDGE_PIXELS) {
      continue; // treat as no drawing
    }

    // Edge-to-edge precision/recall with distance transform tolerance
    const { precision, recall } = precisionRecall(userEdge, outlineEdge, size, size, tol);

    // --- compute mask IoU and area counts ---
    const userMaskCount = count(userMask);
    let intersectMaskCount = 0;
    for (let i = 0; i < userMask.length; i++) if (userMask[i] && outlineMask[i]) intersectMaskCount++;
    const unionMaskCount = userMaskCount + outlineMaskCount - intersectMaskCount;
    const iou = unionMaskCount ? intersectMaskCount / unionMaskCount : 0;

      // Combine IoU and recall to prioritize closeness/coverage (lenient),
      // then apply a clutter multiplier to deduct points for extra stray strokes.
    // IoU captures area overlap; recall measures outline coverage.
  // Make IoU overwhelmingly dominant so area overlap is the primary signal.
  let baseOverlap = 0.95 * iou + 0.05 * recall;
  // Stronger positive bump for good IoU
  if (iou > 0.5) baseOverlap = Math.min(1, baseOverlap + 0.1);

    // Clutter detection: lower precision (= many off-outline strokes) reduces score.
    // Also penalize when the user's filled area is much larger than the outline.
    const areaRatio = outlineMaskCount ? userMaskCount / outlineMaskCount : 1;
    // areaPenalty reduces linearly once user area exceeds outline area, clamped.
    const areaPenalty = areaRatio <= 1 ? 1 : Math.max(0.3, 1 - 0.5 * (areaRatio - 1));

  // Combine precision and areaPenalty into a minor clutter multiplier in [0.8..1].
  // Make penalty small: precision has a small effect and area overfill only lightly reduces score.
  // Remove clutter penalty entirely for now to be generous: keep multiplier = 1.
  const clutterMultiplier = 1;

    const base = baseOverlap * clutterMultiplier;

  // Length penalty: favor coverage but make the ramp more generous and provide a
  // minimum floor so reasonable but slightly-short drawings still receive a score.
  // Use mask-area ratio (userMaskCount / outlineMaskCount) for robustness to stroke thickness.
  const maskRatio = (typeof userMaskCount !== 'undefined') ? userMaskCount / Math.max(1, outlineMaskCount) : userEdgeCount / Math.max(1, outlineEdgeCount);
  const rampStart = override.lengthRampStart ?? 0.06; // even earlier start -> more forgiving
  const rampWidth = override.lengthRampWidth ?? 0.55;
  const rawLength = (maskRatio - rampStart) / rampWidth;
  const lengthPenaltyUnclamped = Math.min(1, Math.max(0, rawLength));
  // Stronger floor: give most reasonable sketches a high score even if slightly short.
  const lengthPenalty = Math.max(0.9, lengthPenaltyUnclamped);

    const score = Math.round(100 * base * lengthPenalty);
    const r = maskRatio; // return mask-based coverage ratio consistently
  // apply optional per-state score multiplier
  const multiplier = override.scoreMultiplier ?? 1;
  const finalScore = Math.round(score * multiplier);
  if (finalScore > best.score) best = { score: finalScore, precision, recall, ratio: r };
  }

  if (best.score === 0) {
    return {
      score: 0,
      critique:
        "We couldn’t detect enough drawing near the border. Try thicker, darker lines and trace along the edge.",
      precision: best.precision,
      recall: best.recall,
      ratio: (best as any).ratio || 0,
    } as Score;
  }

  // FINAL SANITY GUARD: if the user's total edge length is tiny relative to the outline
  // (e.g., an almost-empty canvas that snuck past earlier checks), treat as no drawing.
  // Make this more permissive by default; per-state overrides can still be stricter/looser.
  const MIN_ACCEPT_RATIO = override.minAcceptRatio ?? 0.001;
  const bestRatio = (best as any).ratio || 0;
  if (bestRatio < MIN_ACCEPT_RATIO) {
    return {
      score: 0,
      critique:
        "We couldn’t detect enough drawing near the border. Try thicker, darker lines and trace along the edge.",
      precision: best.precision,
      recall: best.recall,
      ratio: bestRatio,
    } as Score;
  }

  const critique =
    `Matched ${Math.round(100 * best.recall)}% of the outline, ` +
    `with ${Math.round(100 * best.precision)}% of your strokes near the edge. ` +
    'Orientation looked good.';

  return { score: best.score, critique, precision: best.precision, recall: best.recall, ratio: (best as any).ratio } as Score;
}
