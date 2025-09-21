// services/geminiService.ts
import type { Score } from '../types';

export async function judgeDrawing(drawingDataUrl: string, stateName: string): Promise<Score> {
  // The server expects "imageDataUrl", so map your arg name here:
  const res = await fetch('/api/judge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl: drawingDataUrl, stateName })
  });

  // Read body once, then decide how to parse
  const text = await res.text();
  const ct = res.headers.get('content-type') || '';

  if (!ct.includes('application/json')) {
    // This is the case that produced "Unexpected token 'A'..." (an HTML error page)
    throw new Error(`Server returned non-JSON: ${text.slice(0, 200)}…`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Server returned invalid JSON.');
  }

  if (!res.ok) {
    throw new Error(data?.error || `Server error ${res.status}`);
  }

  if (typeof data.score !== 'number') {
    throw new Error('Malformed response from server (missing score).');
  }

  return data as Score;
}
