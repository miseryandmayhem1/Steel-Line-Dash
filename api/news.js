const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-6';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, name } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const prompt =
    `Search for the single most recent news headline about "${query}". ` +
    `Return ONLY this JSON, nothing else: ` +
    `{"headline":"headline text","date":"Mar 16 2026","source":"Source Name","url":"https://..."}`;

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
        max_tokens: 200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'Return only a single valid JSON object. No markdown, no explanation, nothing else.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const raw = await anthropicRes.text();
    if (!anthropicRes.ok) {
      return res.status(502).json({ error: `Anthropic ${anthropicRes.status}` });
    }

    const data       = JSON.parse(raw);
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    if (!textBlocks.length) return res.status(502).json({ error: 'No text block' });

    const txt    = textBlocks.map(b => b.text).join('');
    const clean  = txt.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
