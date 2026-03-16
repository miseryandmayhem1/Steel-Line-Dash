const NEWS_API_KEY = process.env.NEWS_API_KEY || '3ddf8fb30df645e4ac0b6c1eb220c4b7';

const QUERIES = {
  'armada':     'Armada AI edge computing',
  'packsmith':  'Packsmith AI fulfillment',
  'persona':    'Persona AI humanoid robot',
  'valar':      'Valar Atomics nuclear',
  'groq':       'Groq AI chip',
  'databricks': 'Databricks',
  'spacex':     'SpaceX',
  'openai':     'OpenAI',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, name } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const q = QUERIES[id] || name;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=1&language=en&apiKey=${NEWS_API_KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok || data.status !== 'ok') {
      console.error('NewsAPI error:', data);
      return res.status(502).json({ error: data.message || 'NewsAPI error' });
    }

    const article = data.articles?.[0];
    if (!article) return res.status(200).json({ empty: true });

    const date = article.publishedAt
      ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    return res.status(200).json({
      headline: article.title?.replace(/ - .*$/, '').trim(),
      date,
      source: article.source?.name || '',
      url: article.url || '#',
    });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
