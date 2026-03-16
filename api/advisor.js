const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-6';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { summaries } = req.body || {};
  if (!summaries) return res.status(400).json({ error: 'Missing summaries' });

  const prompt =
    `You are a sharp, direct VC portfolio advisor. Here are the latest headlines from our portfolio companies:\n\n${summaries}\n\n` +
    `Based on these headlines, give a concise portfolio-level briefing in 3 short paragraphs:\n` +
    `1. Overall portfolio momentum — what's the general sentiment and trajectory?\n` +
    `2. Standout moves — which companies are making the most significant progress and why it matters?\n` +
    `3. Watch items — any concerns, gaps, or companies that need attention?\n\n` +
    `Be direct, specific, and write like a senior partner at a VC firm. No fluff.`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 500,
        system: 'You are a senior VC portfolio advisor. Be direct, specific, and concise.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await anthropicRes.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return res.status(200).json({ analysis: text });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
