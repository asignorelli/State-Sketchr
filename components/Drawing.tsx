import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { StateName } from '../types';

type Props = {
  stateName: StateName;
  onSubmit: (dataUrl: string) => void;
  isJudging?: boolean;
  error?: string | null;
  challengeProgress?: { current: number; total: number };
};

// normalized points (0..1) so redraws are easy when the canvas resizes
type NPoint = { x: number; y: number };
type Stroke = NPoint[];

const LINE_WIDTH = 4;
const LINE_CAP: CanvasLineCap = 'round';
const LINE_JOIN: CanvasLineJoin = 'round';
const INK_COLOR = '#000000';

// square canvas + viewport cap so it always fits
const MAX_VH = 0.62;   // canvas size <= 62% of viewport height
const MIN_SIZE = 240;  // minimum square size

const Drawing: React.FC<Props> = ({
  stateName,
  onSubmit,
  isJudging = false,
  error,
  challengeProgress
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // simple 60s timer (starts on first stroke)
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // ===== drawing helpers =====
  const n2p = (pt: NPoint, w: number, h: number) => ({ x: pt.x * w, y: pt.y * h });

  const drawStroke = (s: Stroke, ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!s.length) return;
    ctx.strokeStyle = INK_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = LINE_CAP;
    ctx.lineJoin = LINE_JOIN;
    ctx.beginPath();
    const p0 = n2p(s[0], w, h);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < s.length; i++) {
      const p = n2p(s[i], w, h);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  };

  const drawAll = (all: Stroke[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    for (const s of all) drawStroke(s, ctx, w, h);
  };

  // ===== sizing / crisp scaling =====
  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const maxByWidth = Math.floor(wrapper.clientWidth);
    const maxByHeight = Math.floor(window.innerHeight * MAX_VH);
    const size = Math.max(MIN_SIZE, Math.min(maxByWidth, maxByHeight)); // square

    // CSS size seen by the user
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    // backing pixels
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAll(strokes, ctx, size, size);
  }, [strokes]);

  useEffect(() => {
    fitCanvas();

    const ro = new ResizeObserver(() => fitCanvas());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    window.addEventListener('resize', fitCanvas);
    const id = window.setTimeout(fitCanvas, 0);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fitCanvas);
      window.clearTimeout(id);
    };
  }, [fitCanvas]);

  // ===== timer =====
  useEffect(() => {
    if (!timerRunning) return;
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, secondsLeft]);

  const startTimerIfNeeded = () => {
    if (!timerRunning) setTimerRunning(true);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setSecondsLeft(60);
  };

  // ===== pointer events =====
  const getNorm = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (isJudging) return;
    (ev.target as Element).setPointerCapture(ev.pointerId);
    const start = getNorm(ev);
    setCurrent([start]);
    startTimerIfNeeded();
    // clear any local error when user starts drawing
    if (localError) setLocalError(null);
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current) return;
    const next = getNorm(ev);
    const last = current[current.length - 1];
    if (last && Math.hypot(next.x - last.x, next.y - last.y) < 0.001) return;

    const updated = [...current, next];
    setCurrent(updated);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    drawAll(strokes, ctx, w, h);
    drawStroke(updated, ctx, w, h);
  };

  const endStroke = () => {
    if (!current) return;
    setStrokes((prev) => [...prev, current]);
    setCurrent(null);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    drawAll([...strokes, current], ctx, w, h);
  };

  const onPointerUp = () => endStroke();
  const onPointerCancel = () => endStroke();
  const onPointerLeave = () => endStroke();

  // ===== actions =====
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const next = strokes.slice(0, -1);
    setStrokes(next);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    drawAll(next, ctx, canvas.clientWidth, canvas.clientHeight);
  };

  const handleClear = () => {
    setStrokes([]);
    resetTimer();
    setLocalError(null);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  };

  // keyboard shortcuts: Z undo, C clear
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isJudging) return;
      const k = e.key.toLowerCase();
      if (k === 'z') handleUndo();
      if (k === 'c') handleClear();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isJudging, strokes]);

  const handleSubmit = () => {
    // Client-side guard: require some minimal stroke content before submitting.
    // Compute total normalized path length (coords are in 0..1) and point count.
    const totalNormLength = strokes.reduce((acc, s) => {
      for (let i = 1; i < s.length; i++) {
        const dx = s[i].x - s[i - 1].x;
        const dy = s[i].y - s[i - 1].y;
        acc += Math.hypot(dx, dy);
      }
      return acc;
    }, 0);
    const totalPoints = strokes.reduce((acc, s) => acc + s.length, 0) + (current ? current.length : 0);

    const MIN_NORM_LENGTH = 0.02; // ~2% of canvas diagonal
    const MIN_POINTS = 6;
    if (strokes.length === 0 && !current) {
      // nothing drawn - just return (Submit is disabled when there are no strokes)
      return;
    }
    if (totalNormLength < MIN_NORM_LENGTH || totalPoints < MIN_POINTS) {
      setLocalError('Drawing too small — draw thicker or add more strokes before submitting.');
      return;
    }

    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL('image/png');
    onSubmit(dataUrl);
    resetTimer();
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="w-full">
      {/* two-column layout: left = title/timer, right = canvas + buttons */}
      <div className="mx-auto w-full max-w-6xl grid gap-10 md:grid-cols-2 items-start">
        {/* LEFT PANEL */}
        {/* LEFT PANEL */}
<div className="order-2 md:order-1 flex flex-col items-center text-center mt-8 md:mt-16">
  <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight">
    Draw:
  </h2>

  <div className="mt-2 text-5xl md:text-6xl font-extrabold text-cyan-400">
    {stateName}
  </div>

  {challengeProgress && (
    <div className="mt-1 text-base md:text-lg text-gray-400">
      ({challengeProgress.current}/{challengeProgress.total})
    </div>
  )}

  <div className="mt-8 text-2xl md:text-3xl font-mono text-white/90 flex items-center justify-center gap-3">
    <span role="img" aria-label="timer">⏱</span> {mm}:{ss}
  </div>

  {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
  {localError && <p className="mt-4 text-red-400 text-sm">{localError}</p>}
</div>


        {/* RIGHT PANEL */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          {/* measure width only; canvas is the visible white square */}
          <div ref={wrapperRef} className="w-full max-w-[640px] mx-auto">
            <canvas
              ref={canvasRef}
              className="block touch-none bg-white rounded-md border border-gray-300 shadow-inner"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerLeave={onPointerLeave}
            />
          </div>

          {/* buttons under canvas */}
          <div className="mt-6 w-full max-w-[640px] flex items-center justify-between">
            <button
              onClick={handleSubmit}
              disabled={isJudging || (strokes.length === 0 && !current)}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:opacity-50"
            >
              {isJudging ? 'Judging…' : 'Submit'}
            </button>

            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40"
                onClick={handleUndo}
                disabled={isJudging || strokes.length === 0}
                title="Undo (Z)"
              >
                Undo
              </button>
              <button
                className="px-3 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40"
                onClick={handleClear}
                disabled={isJudging || (strokes.length === 0 && !current)}
                title="Clear (C)"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Drawing;
