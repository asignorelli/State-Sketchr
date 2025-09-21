// /api/judge.ts (Edge Function)
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

    // ---- parse request body ----
    let body: any;
    try { body = await req.json(); }
    catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { imageDataUrl, drawingDataUrl, stateName } = body || {};
    const img = imageDataUrl || drawingDataUrl;
    if (!img || !stateName) return json({ error: 'Missing imageDataUrl or stateName' }, 400);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'Server misconfigured: GEMINI_API_KEY missing' }, 500);

    // strip "data:image/png;base64,..." prefix if present
    const base64 = img.includes(',') ? img.split(',')[1] : img;

    // ---- prompt / rubric ----
    const rubric = `
Grade how closely the user's black-on-white line drawing matches the US state: ${stateName}.
Rules:
- Score is an integer 0–100 (100 = excellent match).
- Consider overall outline shape, angles, aspect ratio, and orientation.
- Ignore small wobbles; reward a correct silhouette even if not perfectly neat.
- Rectangle-ish states (Colorado, Wyoming): correct rectangle with right orientation ≳ 85.
Return ONLY strict JSON: {"score": number, "explanation": string}. No extra text.`;

    // ---- call Gemini (REST) ----
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: rubric },
                { inline_data: { mime_type: 'image/png', data: base64 } }
              ]
            }
          ],
          // IMPORTANT: camelCase for REST
          generationConfig: {
            temperature: 0.2,
            topP: 0.1,
            topK: 32,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const ct = upstream.headers.get('content-type') || '';
    const rawEnvelope = await upstream.text(); // read once

    if (!ct.includes('application/json')) {
      return json({ error: 'Upstream non-JSON', status: upstream.status, body: rawEnvelope.slice(0, 400) }, upstream.status || 502);
    }

    let envelope: any = {};
    try { envelope = JSON.parse(rawEnvelope); }
    catch { return json({ error: 'Failed to parse upstream JSON', body: rawEnvelope.slice(0, 400) }, 502); }

    // safety block?
    const block = envelope?.promptFeedback?.blockReason || envelope?.prompt_feedback?.block_reason;
    if (block) return json({ score: 0, explanation: `Model blocked: ${block}` });

    // ---- extract model JSON text robustly ----
    const candidates = envelope?.candidates ?? [];
    const parts = candidates[0]?.content?.parts ?? [];

    let modelText = '';
    for (const p of parts) {
      if (typeof p?.text === 'string') modelText += p.text;
      if (p?.json && typeof p.json === 'object') modelText += JSON.stringify(p.json);
    }

    // fallback: try to find the first {...} anywhere in the envelope string
    if (!modelText) {
      const m = rawEnvelope.match(/\{[\s\S]*\}/);
      if (m) modelText = m[0];
    }

    // ---- parse the JSON payload ----
    let parsed: any;
    try {
      parsed = JSON.parse(modelText);
    } catch {
      const m2 = modelText.match(/\{[\s\S]*\}/);
      if (m2) {
        try { parsed = JSON.parse(m2[0]); } catch { /* ignore */ }
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
