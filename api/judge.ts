// /api/judge.ts  (Edge Function)
export const config = { runtime: 'edge' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export default async function handler(req: Request) {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    // Parse body safely
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    // Accept both names for the image field
    const { imageDataUrl, drawingDataUrl, stateName } = body || {};
    const img = imageDataUrl || drawingDataUrl;
    if (!img || !stateName) {
      return json({ error: 'Missing imageDataUrl or stateName' }, 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'Server misconfigured: GEMINI_API_KEY missing' }, 500);

    // Accept "data:image/png;base64,..." or raw base64
    const base64 = img.includes(',') ? img.split(',')[1] : img;

    // Tight rubric + JSON mode for stable, parseable output
    const rubric = `
Grade how closely the user's black-on-white line drawing matches the US state: ${stateName}.
Rules:
- Score is an integer 0–100 (100 = excellent match).
- Consider overall outline shape, angles, aspect ratio, and orientation.
- Ignore small wobbles; reward a correct silhouette even if lines aren't perfectly straight.
- For rectangle-like states (e.g., Colorado, Wyoming), a correctly oriented rectangle with roughly correct proportions should score ≥85.
Return ONLY strict JSON: {"score": number, "explanation": string}. No extra text.`;

    // Use the higher-quality model for better judging; JSON mode enabled
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: rubric }] },
            { parts: [{ inline_data: { mime_type: 'image/png', data: base64 } }] }
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.1,
            topK: 32,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    // Ensure upstream is JSON
    const ct = upstream.headers.get('content-type') || '';
    const rawBody = await upstream.text(); // read once
    if (!ct.includes('application/json')) {
      return json(
        { error: 'Upstream non-JSON', status: upstream.status, body: rawBody.slice(0, 200) },
        upstream.status || 502
      );
    }

    let data: any = {};
    try {
      data = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Failed to parse upstream JSON', body: rawBody.slice(0, 200) }, 502);
    }

    // Pull model text and parse JSON payload
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const modelText = parts.map((p: any) => p?.text || '').join('');
    let parsed: any;
    try {
      parsed = JSON.parse(modelText);
    } catch {
      const m = modelText.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* fall through */ }
      }
    }

    if (!parsed || typeof parsed.score !== 'number') {
      return json({ score: 0, explanation: 'Model returned unexpected format', raw: modelText });
    }

    const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    return json({ score, explanation: String(parsed.explanation ?? '') });
  } catch (err: any) {
    return json({ error: err?.message || 'Unexpected server error' }, 500);
  }
}
