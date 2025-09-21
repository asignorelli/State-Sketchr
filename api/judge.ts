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
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { imageDataUrl, stateName } = body || {};
    if (!imageDataUrl || !stateName) {
      return json({ error: 'Missing imageDataUrl or stateName' }, 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'Server misconfigured: GEMINI_API_KEY missing' }, 500);
    }

    // Accept "data:image/png;base64,..." or raw base64
    const base64 = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;

    const prompt = `You are grading how closely the user's drawing matches the outline of ${stateName}.
Return ONLY strict JSON: {"score": number, "explanation": string}. Score is 0–100.`;

    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/png', data: base64 } }
              ]
            }
          ]
        })
      }
    );

    const ct = upstream.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = await upstream.text().catch(() => '');
      return json({ error: 'Upstream non-JSON', status: upstream.status, body: text.slice(0, 200) }, upstream.status || 502);
    }

    const data = await upstream.json();

    // Pull candidate text and parse JSON
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const modelText = parts.map((p: any) => p?.text || '').join('');
    let parsed: any;
    try {
      parsed = JSON.parse(modelText);
    } catch {
      const m = modelText.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
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
