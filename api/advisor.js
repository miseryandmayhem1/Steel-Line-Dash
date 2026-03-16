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
    `You are a helpful investment analyst giving a casual, informative read on a small investor's portfolio. ` +
    `Here are the latest headlines from their portfolio companies:\n\n${summaries}\n\n` +
    `Give a brief portfolio snapshot in 3 short paragraphs:\n` +
    `1. Overall vibe — what's the general momentum across the portfolio?\n` +
    `2. What's interesting — which companies have notable developments worth paying attention to?\n` +
    `3. Anything to keep an eye on — not alarmist, just observations about companies that are quieter or facing headwinds.\n\n` +
    `Keep it conversational and informative. These are small investors tracking their positions, not board members. No directives, no urgency, just good insight.`;

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
