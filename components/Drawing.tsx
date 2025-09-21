import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { StateName } from '../types';

type Props = {
  stateName: StateName;
  onSubmit: (dataUrl: string) => void;
  isJudging?: boolean;
  error?: string | null;
  challengeProgress?: { current: number; total: number };
};

// A point stored as normalized coords (0..1) so we can resize and redraw cleanly
type NPoint = { x: number; y: number };
type Stroke = NPoint[];

const LINE_WIDTH = 4;        // px (logical, before devicePixelRatio scaling)
const LINE_CAP: CanvasLineCap = 'round';
const LINE_JOIN: CanvasLineJoin = 'round';
const INK_COLOR = '#000000';

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

  // Resize canvas to wrapper while preserving content (we redraw from strokes)
  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const cssW = Math.max(300, Math.floor(rect.width));
    const cssH = Math.max(240, Math.floor(rect.height));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssW, cssH);

    // Redraw all strokes
    drawAll(strokes, ctx, cssW, cssH);
  }, [strokes]);

  useEffect(() => {
    fitCanvas();
    const onResize = () => fitCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitCanvas]);

  // Helpers to convert normalized point to canvas pixels
  const n2p = (pt: NPoint, w: number, h: number) => ({ x: pt.x * w, y: pt.y * h });

  const drawStroke = (s: Stroke, ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (s.length === 0) return;
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

  // pointer helpers
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
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current) return;
    const next = getNorm(ev);
    // avoid adding tons of identical points
    const last = current[current.length - 1];
    if (last && Math.hypot(next.x - last.x, next.y - last.y) < 0.001) return;
    const updated = [...current, next];
    setCurrent(updated);

    // incremental draw for responsiveness
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    // redraw everything + the in-progress stroke
    drawAll(strokes, ctx, w, h);
    drawStroke(updated, ctx, w, h);
  };

  const endStroke = () => {
    if (!current) return;
    setStrokes((prev) => [...prev, current]);
    setCurrent(null);

    // final redraw
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    drawAll([...strokes, current], ctx, w, h);
  };

  const onPointerUp = () => endStroke();
  const onPointerCancel = () => endStroke();
  const onPointerLeave = () => endStroke();

  // Undo & Clear
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
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  };

  // Keyboard shortcuts: Z = undo, C = clear
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isJudging) return;
      if (e.key.toLowerCase() === 'z') handleUndo();
      if (e.key.toLowerCase() === 'c') handleClear();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isJudging, strokes]);

  // Submit → export with white background
  const handleSubmit = async () => {
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL('image/png');
    onSubmit(dataUrl);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-semibold">
          Draw: <span className="text-cyan-400">{stateName}</span>
          {challengeProgress && (
            <span className="ml-2 text-sm text-gray-400">
              ({challengeProgress.current}/{challengeProgress.total})
            </span>
          )}
        </div>
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
            disabled={isJudging || strokes.length === 0}
            title="Clear (C)"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="w-full bg-white rounded-md shadow-inner border border-gray-300"
        style={{ aspectRatio: '16 / 9' }} // keep a nice drawing area
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none rounded-md"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
        />
      </div>

      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          disabled={isJudging}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:opacity-50"
        >
          {isJudging ? 'Judging…' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

export default Drawing;
