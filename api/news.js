const NEWS_KEY = process.env.NEWS_API_KEY;

const QUERIES = {
  'armada':     'Armada AI edge computing',
  'packsmith':  'Packsmith AI fulfillment',
  'persona':    'Persona AI humanoid robot',
  'valar':      'Valar Atomics nuclear reactor',
  'groq':       'Groq AI inference chip',
  'databricks': 'Databricks AI platform',
  'spacex':     'SpaceX Starship launch',
  'openai':     'OpenAI GPT model',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, name } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const q = encodeURIComponent(QUERIES[id] || name);
  const url = `https://newsdata.io/api/1/news?apikey=${NEWS_KEY}&q=${q}&language=en&size=1`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (data.status !== 'success') {
      console.error('newsdata error:', JSON.stringify(data));
      return res.status(502).json({ error: data.message || 'newsdata error' });
    }

    const article = data.results?.[0];
    if (!article) return res.status(200).json({ empty: true });

    const date = article.pubDate
      ? new Date(article.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    return res.status(200).json({
      headline: article.title?.trim(),
      date,
      source: article.source_name || article.source_id || '',
      url: article.link || '#',
    });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
