import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { StateName } from '../types';

type Props = {
  stateName: StateName;
  onSubmit: (dataUrl: string) => void;
  isJudging?: boolean;
  error?: string | null;
  challengeProgress?: { current: number; total: number };
};

type NPoint = { x: number; y: number };  // normalized 0..1
type Stroke = NPoint[];

const LINE_WIDTH = 4;
const LINE_CAP: CanvasLineCap = 'round';
const LINE_JOIN: CanvasLineJoin = 'round';
const INK_COLOR = '#000000';

const MAX_VH = 0.62;  // canvas size <= 62% of viewport height
const MIN_SIZE = 240; // don't go smaller than this

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

  // simple 60s timer (starts on first stroke)
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // ---------- drawing helpers ----------
  const n2p = (pt: NPoint, w: number, h: number) => ({ x: pt.x * w, y: pt.y * h });

  const drawStroke = (
    s: Stroke,
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
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

  const drawAll = (
    all: Stroke[],
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    for (const s of all) drawStroke(s, ctx, w, h);
  };

  // ---------- sizing / crisp scaling ----------
  const fitCanvas = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  // Square size: cap by viewport height and a sensible max width.
  // This does NOT depend on wrapper width, so it won't grow under the button column.
  const maxByWidth = Math.min(640, window.innerWidth - 48); // leave a little margin
  const maxByHeight = Math.floor(window.innerHeight * MAX_VH);
  const size = Math.max(MIN_SIZE, Math.min(maxByWidth, maxByHeight));

  // CSS size
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  // Backing pixels for crispness
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawAll(strokes, ctx, size, size);
}, [strokes]);


  useEffect(() => {
    fitCanvas();

    const ro = new ResizeObserver(() => fitCanvas());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    const onWinResize = () => fitCanvas();
    window.addEventListener('resize', onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [fitCanvas]);

  // ---------- timer ----------
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

  // ---------- pointer events ----------
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
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current) return;
    const next = getNorm(ev);
    const last = current[current.length - 1];
    if (last && Math.hypot(next.x - last.x, next.y - last.y) < 0.001) return;

    const updated = [...current, next];
    setCurrent(updated);

    // incremental redraw with CSS pixels (ctx already scaled for DPR)
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

  // ---------- actions ----------
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
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL('image/png');
    onSubmit(dataUrl);
    resetTimer();
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl grid gap-10 md:grid-cols-2 items-start">
        {/* LEFT PANEL */}
        <div className="order-2 md:order-1 flex flex-col items-center text-center mt-0 md:mt-0">
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

          {/* Submit under timer */}
          <button
            onClick={handleSubmit}
            disabled={isJudging}
            className="mt-16 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:opacity-50"
          >
            {isJudging ? 'Judging…' : 'Submit'}
          </button>

          {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
        </div>

        {/* RIGHT PANEL (unchanged grid position) */}
<div className="order-1 md:order-2">
  {/* Canvas and vertical buttons in a row so nothing overlaps the canvas */}
  <div className="flex items-start gap-6">
    {/* Canvas box: flex-none so it never grows under the buttons */}
    <div ref={wrapperRef} className="flex-none">
      <div className="bg-white rounded-md shadow-inner border border-gray-300">
        <canvas
          ref={canvasRef}
          className="block touch-none rounded-md"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
        />
      </div>
    </div>

    {/* Button column: also flex-none, with a fixed-width feel */}
    <div className="flex-none flex flex-col gap-3 pt-2">
      <button
        className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40"
        onClick={handleUndo}
        disabled={isJudging || strokes.length === 0}
        title="Undo (Z)"
      >
        Undo
      </button>
      <button
        className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40"
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
