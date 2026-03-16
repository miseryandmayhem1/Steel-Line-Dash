const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-6';

module.exports = async (req, res) => {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, name } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const prompt =
    `Search the web for the single most recent news story about "${query}" from the past 2 weeks. ` +
    `Return ONLY a valid JSON object, no markdown, no code fences, nothing else. ` +
    `Keys: {"headline":"one short headline under 12 words","summary":"one concise investor-focused sentence","date":"e.g. Mar 14 2026","source":"Publication Name","url":"article URL or #"}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 300,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'You are a financial intelligence assistant for a VC firm. Respond with a single valid JSON object and nothing else — no markdown, no code fences, no preamble.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const raw = await anthropicRes.text();

    if (!anthropicRes.ok) {
      console.error(`[${name}] Anthropic ${anthropicRes.status}:`, raw);
      return res.status(502).json({ error: `Anthropic returned ${anthropicRes.status}`, detail: raw.slice(0, 400) });
    }

    const data       = JSON.parse(raw);
    const textBlocks = (data.content || []).filter(b => b.type === 'text');

    if (!textBlocks.length) {
      console.error(`[${name}] No text block. stop_reason=${data.stop_reason}, content=`, JSON.stringify(data.content).slice(0, 400));
      return res.status(502).json({ error: 'No text block returned', stop_reason: data.stop_reason });
    }

    const txt   = textBlocks.map(b => b.text).join('');
    const clean = txt.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(pe) {
      console.error(`[${name}] JSON parse failed:`, clean.slice(0, 400));
      return res.status(502).json({ error: 'Response was not valid JSON', raw: clean.slice(0, 400) });
    }

    return res.status(200).json(parsed);

  } catch(e) {
    console.error(`[${name}] Exception:`, e.message);
    return res.status(500).json({ error: e.message });
  }
};
